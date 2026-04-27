import { ChatOpenAI } from "@langchain/openai"
import { z } from "zod"
import type { JobPost } from "@/types/documents"

const TraitSchema = z.object({
  key: z.string().describe("The source heading or a concise trait group name."),
  values: z.array(z.string()).describe("Concise bullet-style values extracted from one source section."),
})

const SalarySchema = z.object({
  min: z.number().int().nullable().describe("Minimum salary or rate, or null when absent."),
  max: z.number().int().nullable().describe("Maximum salary or rate, or null when absent."),
  currency: z.string().nullable().describe("ISO 4217 currency code, for example USD, or null when absent."),
  comment: z.string().nullable().describe("Context such as per year, per hour, base salary, or equity notes, or null when absent."),
})

const SectionSchema = z.object({
  label: z.enum([
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
  ]),
  heading: z.string().nullable().describe("The original heading if present."),
  text: z.string().describe("The section text, preserving the source meaning."),
})

const SegmentedJobPostSchema = z.object({
  sections: z.array(SectionSchema).describe("Ordered sections from the original job post."),
})

const JobPostSchema = z.object({
  $type: z.literal("org.blueres.jobs.jobPost"),
  postName: z.string().describe("Descriptive searchable name, often title plus company or location."),
  datePosted: z.string().describe("YYYY-MM-DD. Use the source date when present; otherwise use today's date."),
  validThrough: z.string().nullable().describe("YYYY-MM-DD closing date, or null when absent."),
  url: z.string().nullable().describe("Canonical posting or application URL, or null when absent."),
  jobTitle: z.string().nullable().describe("Official job title, or null when absent."),
  jobLocation: z.string().nullable().describe("Location such as Remote, Austin TX, or Remote US only, or null when absent."),
  shortDescription: z.string().nullable().describe("Brief opening summary of the role, or null when absent."),
  longDescription: z.string().nullable().describe("Role/company narrative, excluding requirements and responsibilities, or null when absent."),
  employmentType: z.string().nullable().describe("full-time, part-time, contract, internship, temporary, etc., or null when absent."),
  estimatedSalary: SalarySchema.nullable().describe("Estimated salary, or null when compensation is absent."),
  jobBenefits: z.string().nullable().describe("Benefits text, preserving list structure where useful, or null when absent."),
  jobTraits: z.array(TraitSchema).nullable().describe("Responsibilities and role traits, or null when absent."),
  employeeTraits: z.array(TraitSchema).nullable().describe("Requirements, qualifications, and candidate traits, or null when absent."),
})

type RawGeneratedJobPost = z.infer<typeof JobPostSchema>
export type GeneratedJobPost = JobPost & { url?: string }

export interface TextToJobPostResult {
  sections: z.infer<typeof SegmentedJobPostSchema>["sections"]
  jobPost: GeneratedJobPost
}

function cleanSalary(salary: RawGeneratedJobPost["estimatedSalary"]): JobPost["estimatedSalary"] | undefined {
  if (!salary) return undefined
  const cleaned = {
    min: salary.min ?? undefined,
    max: salary.max ?? undefined,
    currency: salary.currency ?? undefined,
    comment: salary.comment ?? undefined,
  }
  return cleaned.min != null && cleaned.max != null && cleaned.currency
    ? { min: cleaned.min, max: cleaned.max, currency: cleaned.currency, comment: cleaned.comment }
    : undefined
}

function cleanJobPost(raw: RawGeneratedJobPost): GeneratedJobPost {
  const jobPost: GeneratedJobPost = {
    $type: raw.$type,
    postName: raw.postName,
    datePosted: raw.datePosted,
    jobTitle: raw.jobTitle ?? raw.postName,
  }

  if (raw.validThrough) jobPost.validThrough = raw.validThrough
  if (raw.url) jobPost.url = raw.url
  if (raw.jobLocation) jobPost.jobLocation = raw.jobLocation
  if (raw.shortDescription) jobPost.shortDescription = raw.shortDescription
  if (raw.longDescription) jobPost.longDescription = raw.longDescription
  if (raw.employmentType) jobPost.employmentType = raw.employmentType
  if (raw.jobBenefits) jobPost.jobBenefits = raw.jobBenefits
  if (raw.jobTraits && raw.jobTraits.length > 0) jobPost.jobTraits = raw.jobTraits
  if (raw.employeeTraits && raw.employeeTraits.length > 0) jobPost.employeeTraits = raw.employeeTraits

  const estimatedSalary = cleanSalary(raw.estimatedSalary)
  if (estimatedSalary) jobPost.estimatedSalary = estimatedSalary

  return jobPost
}

function createModel() {
  return new ChatOpenAI({
    model: process.env.TEXT_TO_JOB_POST_MODEL ?? "gpt-4o-mini",
    temperature: 0,
  })
}

export async function textToJobPost(text: string): Promise<TextToJobPostResult> {
  const sourceText = text.trim()
  if (!sourceText) throw new Error("Job post text is required.")

  const today = new Date().toISOString().slice(0, 10)
  const model = createModel()

  const segmenter = model.withStructuredOutput(SegmentedJobPostSchema, {
    name: "SegmentedJobPost",
    strict: true,
  })

  const segmented = await segmenter.invoke([
    {
      role: "system",
      content: [
        "You split unstructured job posts into ordered, labeled sections.",
        "Preserve original order and source meaning.",
        "When the source has multiple headings in the same category, keep them as separate sections.",
        "For example, Requirements and Nice to haves are both employee_traits, but they must remain two separate sections.",
        "For example, Responsibilities and What you'll do are both job_traits, but they must remain two separate sections unless they are clearly the same section.",
        "Do not invent content.",
        "Use unknown when a section cannot be confidently classified.",
        "Headings like Requirements, Qualifications, Nice to haves, What we're looking for, You have, and Who you are are employee_traits.",
        "Headings like Responsibilities, What you'll do, In this role, Your impact, and Day to day are job_traits.",
        "Employee trait sections usually appear in a contiguous block. Job trait sections usually appear in a contiguous block. Do not alternate between them unless the source clearly does.",
        "The opening paragraph is usually short_description.",
        "Longer narrative text after the opening summary is usually long_description.",
      ].join("\n"),
    },
    {
      role: "user",
      content: sourceText,
    },
  ])

  const generator = model.withStructuredOutput(JobPostSchema, {
    name: "BlueResJobPost",
    strict: true,
  })

  const rawJobPost = await generator.invoke([
    {
      role: "system",
      content: [
        "Convert classified job-post sections into a BlueRes job post JSON object.",
        "Return only facts supported by the source sections, except datePosted may use today's date when the source has no posted date.",
        `Today's date is ${today}.`,
        "Set $type to org.blueres.jobs.jobPost.",
        "jobTitle should come from the title section or strongest title-like phrase near the top.",
        "postName should be descriptive and searchable, usually combining title with company, location, or date when available.",
        "shortDescription should be concise and based on the opening summary.",
        "longDescription should include broader role/company narrative, excluding requirements and responsibilities.",
        "employeeTraits must come only from employee_traits sections.",
        "jobTraits must come only from job_traits sections.",
        "Create one employeeTraits object for each employee_traits section.",
        "Create one jobTraits object for each job_traits section.",
        "Use each source heading as that trait object's key when possible.",
        "Do not collapse distinct headings like Requirements, Qualifications, Nice to haves, or Preferred qualifications into one object.",
        "Do not collapse distinct headings like Responsibilities, What you'll do, or Day to day into one object.",
        "Trait values should be concise bullet-style strings.",
        "Do not mix responsibilities into employeeTraits.",
        "Do not mix candidate requirements into jobTraits.",
        "Omit optional fields that are not present.",
        "Use estimatedSalary only when compensation is stated.",
      ].join("\n"),
    },
    {
      role: "user",
      content: JSON.stringify(segmented, null, 2),
    },
  ])

  return {
    sections: segmented.sections,
    jobPost: cleanJobPost(rawJobPost),
  }
}
