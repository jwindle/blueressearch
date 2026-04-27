import { redirect } from "next/navigation"
import { backends } from "@/config/backends"
import { SearchModePage } from "@/components/search/SearchModePage"
import type { FilterCondition } from "@/types/api"

function parseFilters(s: string): FilterCondition[] {
  try { return JSON.parse(s) ?? [] } catch { return [] }
}

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ backendId: string; mode: string }>
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const { backendId, mode } = await params
  const sp = await searchParams

  const backend = backends.find(b => b.id === backendId)
  if (!backend) redirect("/")
  if (!backend.searchModes.find(m => m.id === mode)) {
    redirect(`/search/${backendId}/${backend.defaultMode}`)
  }

  const pinnedId = backendId === "resumes" ? (sp.job ?? null) : (sp.resume ?? null)

  return (
    <SearchModePage
      backendId={backendId}
      mode={mode}
      initialQ={sp.q ?? ""}
      initialExtractors={sp.extractors ? sp.extractors.split(",").filter(Boolean) : null}
      initialDistinct={sp.distinct === "1"}
      initialK={sp.k ? (parseInt(sp.k) || 3) : 3}
      initialFilters={sp.filters ? parseFilters(sp.filters) : []}
      initialDocUrl={sp.doc_url ?? ""}
      pinnedId={pinnedId}
    />
  )
}
