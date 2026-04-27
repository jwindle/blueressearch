// ── Job post ─────────────────────────────────────────────────────────────────

export interface Trait {
  key: string
  values: string[]
}

export interface EstimatedSalary {
  min: number
  max: number
  currency: string
  comment?: string
}

export interface JobPost {
  $type: string
  jobTitle: string
  postName?: string
  shortDescription?: string
  longDescription?: string
  jobLocation?: string
  employmentType?: string
  datePosted?: string
  validThrough?: string
  jobTraits?: Trait[]
  employeeTraits?: Trait[]
  estimatedSalary?: EstimatedSalary
  jobBenefits?: string
}

// ── Resume ───────────────────────────────────────────────────────────────────

export interface ResumeBasics {
  name?: string
  label?: string
  email?: string
  phone?: string
  summary?: string
  location?: {
    city?: string
    region?: string
    countryCode?: string
  }
}

export interface WorkEntry {
  company?: string
  position?: string
  startDate?: string
  endDate?: string
  summary?: string
  highlights?: string[]
}

export interface EducationEntry {
  institution?: string
  area?: string
  studyType?: string
  startDate?: string
  endDate?: string
}

export interface ResumeMeta {
  lastModified?: string
  title?: string
}

export interface Resume {
  meta?: ResumeMeta
  basics?: ResumeBasics
  work?: WorkEntry[]
  education?: EducationEntry[]
  skills?: { name?: string; keywords?: string[] }[]
}
