import { generateObject } from "ai"
import { z } from "zod"
import type { Resume } from "@/types/documents"
import { getAIModel, numberLines, extractLines, cleanNulls } from "./ai-utils"

// ── Model selection ───────────────────────────────────────────────────────────

function getModel() {
  return getAIModel("TEXT_TO_RESUME_MODEL", "TEXT_TO_JOB_POST_MODEL")
}

// ── Schemas ───────────────────────────────────────────────────────────────────

export const SECTION_LABELS = [
  "basics",
  "work",
  "education",
  "skills",
  "projects",
  "awards",
  "certificates",
  "volunteer",
  "publications",
  "languages",
  "interests",
  "references",
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

const ResumeSchema = z.object({
  basics: z.object({
    name: z.string().nullable(),
    label: z.string().nullable().describe("e.g. Software Engineer"),
    email: z.string().nullable(),
    phone: z.string().nullable(),
    url: z.string().nullable(),
    summary: z.string().nullable().describe("Brief professional summary"),
    location: z.object({
      address: z.string().nullable(),
      city: z.string().nullable(),
      region: z.string().nullable(),
      postalCode: z.string().nullable(),
      countryCode: z.string().nullable(),
    }).nullable(),
  }).nullable(),
  work: z.array(z.object({
    company: z.string().nullable(),
    position: z.string().nullable(),
    location: z.string().nullable(),
    startDate: z.string().nullable().describe("ISO8601 or YYYY-MM"),
    endDate: z.string().nullable().describe("ISO8601 or YYYY-MM or null if present"),
    summary: z.string().nullable(),
    highlights: z.array(z.string()).nullable(),
  })).nullable(),
  volunteer: z.array(z.object({
    organization: z.string().nullable(),
    position: z.string().nullable(),
    startDate: z.string().nullable(),
    endDate: z.string().nullable(),
    summary: z.string().nullable(),
    highlights: z.array(z.string()).nullable(),
  })).nullable(),
  education: z.array(z.object({
    institution: z.string().nullable(),
    area: z.string().nullable().describe("e.g. Computer Science"),
    studyType: z.string().nullable().describe("e.g. Bachelor"),
    startDate: z.string().nullable(),
    endDate: z.string().nullable(),
    score: z.string().nullable(),
  })).nullable(),
  awards: z.array(z.object({
    title: z.string().nullable(),
    date: z.string().nullable(),
    awarder: z.string().nullable(),
    summary: z.string().nullable(),
  })).nullable(),
  certificates: z.array(z.object({
    name: z.string().nullable(),
    date: z.string().nullable(),
    issuer: z.string().nullable(),
    url: z.string().nullable(),
  })).nullable(),
  publications: z.array(z.object({
    name: z.string().nullable(),
    publisher: z.string().nullable(),
    releaseDate: z.string().nullable(),
    summary: z.string().nullable(),
  })).nullable(),
  skills: z.array(z.object({
    name: z.string().nullable().describe("Category of skill"),
    level: z.string().nullable(),
    keywords: z.array(z.string()).nullable().describe("Specific skills"),
  })).nullable(),
  languages: z.array(z.object({
    language: z.string().nullable(),
    fluency: z.string().nullable(),
  })).nullable(),
  interests: z.array(z.object({
    name: z.string().nullable(),
    keywords: z.array(z.string()).nullable(),
  })).nullable(),
  projects: z.array(z.object({
    name: z.string().nullable(),
    description: z.string().nullable(),
    highlights: z.array(z.string()).nullable(),
    startDate: z.string().nullable(),
    endDate: z.string().nullable(),
    url: z.string().nullable(),
  })).nullable(),
})

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Section {
  label: string
  heading: string | null
  text: string
}

export interface TextToResumeResult {
  sections: Section[]
  resume: Resume
}

// ── Step 1: segment ───────────────────────────────────────────────────────────

export async function segmentResume(text: string): Promise<Section[]> {
  const sourceText = text.trim()
  if (!sourceText) throw new Error("Resume text is required.")

  const model = getModel()
  const { numbered, lines } = numberLines(sourceText)

  const { object: segmented } = await generateObject({
    model,
    schema: SectionRangeSchema,
    system: [
      "You split unstructured resumes into ordered, labeled sections.",
      "Output only line number ranges — do not reproduce the source text.",
      "Sections must be contiguous and together cover the full document.",
      "",
      "SECTION BOUNDARIES:",
      "Every distinct heading starts a new section — including sub-headings nested within a parent section.",
      "A heading is a short standalone line that introduces a block of text below it.",
      "When a generic section (like 'Work Experience' or 'Education') has multiple sub-headings (like company names or school names), split each into its own section.",
      "If the parent heading line has no direct content of its own — all content is under sub-headings — include the parent heading line in the range of the first sub-section.",
      "When in doubt, split — do not merge.",
      "",
      "LABELS:",
      "basics: Name, contact info, and summary at the top.",
      "work: Professional experience, jobs held. Each job should be its own section if it has a heading.",
      "education: Degrees, schools. Each school/degree should be its own section if it has a heading.",
      "skills: Technical or soft skills, technologies.",
      "projects: Personal or professional projects.",
      "awards: Honors, awards, recognitions.",
      "certificates: Professional certifications.",
      "volunteer: Volunteer work or non-profit involvement.",
      "publications: Articles, books, papers.",
      "languages: Spoken or written languages.",
      "interests: Hobbies or personal interests.",
      "references: Professional references.",
      "unknown: Use when a section cannot be confidently classified.",
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

export async function sectionsToResume(sections: Section[]): Promise<Resume> {
  if (!sections.length) throw new Error("At least one section is required.")

  const today = new Date().toISOString().slice(0, 10)
  const model = getModel()

  const { object: rawResume } = await generateObject({
    model,
    schema: ResumeSchema,
    system: [
      "Convert classified resume sections into a BlueRes resume JSON object.",
      "Return only facts supported by the source sections.",
      `Today's date is ${today}.`,
      "For dates, prefer YYYY-MM format if available, or just YYYY.",
      "Each section has a 'label' and may have a 'heading' and 'text'.",
      "Use the 'heading' to identify the specific entity (e.g. company name, school name, project name) when it is provided.",
      "work: Each distinct job should be an entry. Include highlights as an array of strings.",
      "education: Each degree or school should be an entry.",
      "skills: Group related skills if possible.",
      "Do not invent information. If a field is not present in the text, leave it null.",
    ].join("\n"),
    prompt: JSON.stringify(sections, null, 2),
  })

  const resume: Resume = cleanNulls(rawResume) as unknown as Resume
  
  resume.meta = {
    lastModified: new Date().toISOString(),
    title: rawResume.basics?.name ? `${rawResume.basics.name} Resume` : "Resume",
  }

  return resume
}

// ── Combined convenience wrapper ──────────────────────────────────────────────

export async function textToResume(text: string): Promise<TextToResumeResult> {
  const sections = await segmentResume(text)
  const resume = await sectionsToResume(sections)
  return { sections, resume }
}
