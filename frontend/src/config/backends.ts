import type { ComponentType } from "react"
import { JobPostCard } from "@/components/documents/JobPostCard"
import { ResumeCard } from "@/components/documents/ResumeCard"

export interface SearchMode {
  id: string
  name: string
}

export interface BackendConfig {
  id: string
  name: string
  url: string
  atCollection?: string
  searchModes: SearchMode[]
  defaultMode: string
  DocumentCard: ComponentType<{ data: unknown }>
}

const SEARCH_MODES: SearchMode[] = [
  { id: "standard", name: "Top 1" },
  { id: "top-k", name: "Top K" },
]

export const backends: BackendConfig[] = [
  {
    id: "jobs",
    name: "Jobs",
    url: "/api/docsearch/jobs",
    atCollection: "org.blueres.jobs.jobPost",
    searchModes: SEARCH_MODES,
    defaultMode: "standard",
    DocumentCard: JobPostCard,
  },
  {
    id: "resumes",
    name: "Résumés",
    url: "/api/docsearch/resumes",
    atCollection: "org.blueres.resume.resume",
    searchModes: SEARCH_MODES,
    defaultMode: "standard",
    DocumentCard: ResumeCard,
  },
]
