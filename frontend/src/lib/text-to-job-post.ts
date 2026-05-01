import { generateObject } from "ai"
import { z } from "zod"
import type { JobPost } from "@/types/documents"
import { getAIModel, numberLines, extractLines, cleanNulls } from "./ai-utils"

// ── Model selection ───────────────────────────────────────────────────────────

function getModel() {
  return getAIModel("TEXT_TO_JOB_POST_MODEL")
}

// ── Schemas ───────────────────────────────────────────────────────────────────

export const SECTION_LABELS = [
  "title",
  "location",
  "employment_type",
  "salary",
  "short_description",
  "long_description",
  "employee_traits",
  "job_traits",
  "benefits",
  "company_info",
  "application_instructions",
  "unknown",
] as const

export type SectionLabel = typeof SECTION_LABELS[number]

const SectionRangeSchema = z.object({
  sections: z.array(z.object({
    label: z.enum(SECTION_LABELS),
    heading: z.string().nullable().describe("The original heading if present, otherwise null."),
    startLine: z.number().int().describe("1-based line number where this section starts."),
    endLine: z.number().int().describe("1-based line number where this section ends (inclusive)."),
  })).describe("Ordered sections covering the full document."),
})

const TraitSchema = z.object({
  key: z.string().describe("The source heading or a concise trait group name."),
  values: z.array(z.string()).describe("Concise bullet-style values from this section."),
})

const SalarySchema = z.object({
  min: z.number().int().nullable().describe("Minimum salary/rate, or null."),
  max: z.number().int().nullable().describe("Maximum salary/rate, or null."),
  currency: z.string().nullable().describe("ISO 4217 currency code, or null."),
  comment: z.string().nullable().describe("Context such as 'per year' or 'base salary', or null."),
})

const JobPostSchema = z.object({
  $type: z.literal("org.blueres.jobs.jobPost"),
  postName: z.string().describe("Descriptive searchable name, often title plus company or location."),
  datePosted: z.string().describe("YYYY-MM-DD. Use source date if present, otherwise today."),
  validThrough: z.string().nullable().describe("YYYY-MM-DD closing date, or null."),
  url: z.string().nullable().describe("Canonical posting or application URL, or null."),
  jobTitle: z.string().nullable().describe("Official job title, or null."),
  jobLocation: z.string().nullable().describe("Location such as Remote or Austin TX, or null."),
  shortDescription: z.string().nullable().describe("Brief opening summary of the role, or null."),
  longDescription: z.string().nullable().describe("Role/company narrative excluding requirements and responsibilities, or null."),
  employmentType: z.string().nullable().describe("full-time, part-time, contract, etc., or null."),
  estimatedSalary: SalarySchema.nullable().describe("Salary details, or null when absent."),
  jobBenefits: z.string().nullable().describe("Benefits text, or null."),
  jobTraits: z.array(TraitSchema).nullable().describe("Responsibilities and role traits, or null."),
  employeeTraits: z.array(TraitSchema).nullable().describe("Requirements and candidate traits, or null."),
})

// ── Types ─────────────────────────────────────────────────────────────────────

type RawJobPost = z.infer<typeof JobPostSchema>
export type GeneratedJobPost = JobPost & { url?: string }

export interface Section {
  label: string
  heading: string | null
  text: string
}

export interface TextToJobPostResult {
  sections: Section[]
  jobPost: GeneratedJobPost
}

// ── Step 1: segment ───────────────────────────────────────────────────────────

export async function segmentJobPost(text: string): Promise<Section[]> {
  const sourceText = text.trim()
  if (!sourceText) throw new Error("Job post text is required.")

  const model = getModel()
  const { numbered, lines } = numberLines(sourceText)

  const { object: segmented } = await generateObject({
    model,
    schema: SectionRangeSchema,
    system: [
      "You split unstructured job posts into ordered, labeled sections.",
      "Output only line number ranges — do not reproduce the source text.",
      "Sections must be contiguous and together cover the full document.",
      "",
      "SECTION BOUNDARIES:",
      "Every distinct heading starts a new section — including sub-headings nested within a parent section.",
      "A heading is a short standalone line that introduces a list or block of text below it.",
      "Headings do not need to end with a colon — short phrases standing alone on a line are headings.",
      "Do not merge two headed blocks into one section just because they share the same label.",
      "When in doubt, split — do not merge.",
      "",
      "NESTED HEADINGS:",
      "When a generic parent heading (e.g. 'Key Responsibilities', 'Requirements') is followed by specific sub-headings (e.g. 'Strategic partnerships & business development', 'Academic integration & research support'), each sub-heading starts its own section.",
      "If the parent heading line has no direct content of its own — all content is under sub-headings — include the parent heading line in the range of the first sub-section.",
      "Sub-headings under a job_traits parent (like 'Key Responsibilities') are also labeled job_traits.",
      "Sub-headings under an employee_traits parent (like 'Requirements') are also labeled employee_traits.",
      "Example: 'Key Responsibilities' (parent, no direct content) → 'Strategic partnerships...' (sub) → 'Academic integration...' (sub) → produce separate job_traits sections, with 'Key Responsibilities' absorbed into the first sub-section's line range.",
      "",
      "SPLITTING EXAMPLES:",
      "Example: 'Strongly Preferred Qualifications:' and 'Preferred Qualifications:' are two headings → two separate employee_traits sections.",
      "Example: 'Requirements' and 'Nice to haves' are two headings → two separate employee_traits sections.",
      "Example: 'Responsibilities' and 'What you will do' are two headings → two separate job_traits sections.",
      "",
      "LABELS:",
      "Headings like Requirements, Qualifications, Nice to haves, Preferred Qualifications, Strongly Preferred, What we are looking for → employee_traits.",
      "Headings like Responsibilities, What you will do, In this role, Your impact, Day to day → job_traits.",
      "Headings like Job Description, About the Role, Overview, Position Summary followed by large narrative paragraphs (not bullet lists) → long_description.",
      "The opening paragraph before any heading is usually short_description.",
      "Longer narrative after the opening is usually long_description.",
      "Use unknown when a section cannot be confidently classified.",
    ].join("\n"),
    prompt: numbered,
  })

  return segmented.sections.map(s => ({
    label: s.label,
    heading: s.heading,
    text: extractLines(lines, s.startLine, s.endLine),
  }))
}

// ── Step 2: structure ─────────────────────────────────────────────────────────

export async function sectionsToJobPost(sections: Section[]): Promise<GeneratedJobPost> {
  if (!sections.length) throw new Error("At least one section is required.")

  const today = new Date().toISOString().slice(0, 10)
  const model = getModel()

  const { object: rawJobPost } = await generateObject({
    model,
    schema: JobPostSchema,
    system: [
      "Convert classified job-post sections into a BlueRes job post JSON object.",
      "Return only facts supported by the source sections.",
      `Today's date is ${today}. Use it for datePosted only when the source has no date.`,
      "jobTitle comes from the title section or the strongest title-like phrase near the top.",
      "postName should be descriptive and searchable, combining title with company or location when available.",
      "shortDescription is based on the short_description section.",
      "longDescription covers role/company narrative, excluding requirements and responsibilities.",
      "employeeTraits comes only from employee_traits sections — one object per section.",
      "jobTraits comes only from job_traits sections — one object per section.",
      "Use each section's most specific heading as that trait object's key (the sub-heading, not the parent heading).",
      "Do not collapse distinct headings into one object.",
      "Trait values should be concise bullet-style strings.",
      "Do not mix responsibilities into employeeTraits or requirements into jobTraits.",
      "Use estimatedSalary only when compensation is explicitly stated.",
    ].join("\n"),
    prompt: JSON.stringify(sections, null, 2),
  })

  const jobPost: GeneratedJobPost = cleanNulls(rawJobPost) as unknown as GeneratedJobPost
  
  // Ensure jobTitle fallback
  if (!jobPost.jobTitle) {
    jobPost.jobTitle = rawJobPost.postName
  }

  // Final validation of salary
  if (jobPost.estimatedSalary) {
    if (jobPost.estimatedSalary.min == null || jobPost.estimatedSalary.max == null || !jobPost.estimatedSalary.currency) {
      delete jobPost.estimatedSalary
    }
  }

  return jobPost
}

// ── Combined convenience wrapper ──────────────────────────────────────────────

export async function textToJobPost(text: string): Promise<TextToJobPostResult> {
  const sections = await segmentJobPost(text)
  const jobPost = await sectionsToJobPost(sections)
  return { sections, jobPost }
}
