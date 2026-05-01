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
  image?: string
  email?: string
  phone?: string
  url?: string
  summary?: string
  location?: {
    address?: string
    postalCode?: string
    city?: string
    region?: string
    countryCode?: string
  }
  profiles?: {
    network?: string
    username?: string
    url?: string
  }[]
}

export interface WorkEntry {
  company?: string
  name?: string // Alias for company in some schemas
  position?: string
  location?: string
  description?: string
  url?: string
  startDate?: string
  endDate?: string
  summary?: string
  highlights?: string[]
}

export interface VolunteerEntry {
  organization?: string
  position?: string
  url?: string
  startDate?: string
  endDate?: string
  summary?: string
  highlights?: string[]
}

export interface EducationEntry {
  institution?: string
  url?: string
  area?: string
  studyType?: string
  startDate?: string
  endDate?: string
  score?: string
  courses?: string[]
}

export interface AwardEntry {
  title?: string
  date?: string
  awarder?: string
  summary?: string
}

export interface CertificateEntry {
  name?: string
  date?: string
  url?: string
  issuer?: string
}

export interface PublicationEntry {
  name?: string
  publisher?: string
  releaseDate?: string
  url?: string
  summary?: string
}

export interface SkillEntry {
  name?: string
  level?: string
  keywords?: string[]
}

export interface LanguageEntry {
  language?: string
  fluency?: string
}

export interface InterestEntry {
  name?: string
  keywords?: string[]
}

export interface ProjectEntry {
  name?: string
  description?: string
  highlights?: string[]
  keywords?: string[]
  startDate?: string
  endDate?: string
  url?: string
  roles?: string[]
  entity?: string
  type?: string
}

export interface ResumeMeta {
  lastModified?: string
  title?: string
  canonical?: string
  version?: string
}

export interface Resume {
  meta?: ResumeMeta
  basics?: ResumeBasics
  work?: WorkEntry[]
  volunteer?: VolunteerEntry[]
  education?: EducationEntry[]
  awards?: AwardEntry[]
  certificates?: CertificateEntry[]
  publications?: PublicationEntry[]
  skills?: SkillEntry[]
  languages?: LanguageEntry[]
  interests?: InterestEntry[]
  projects?: ProjectEntry[]
}
