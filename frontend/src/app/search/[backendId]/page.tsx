import { redirect } from "next/navigation"
import { backends } from "@/config/backends"

export default async function SearchIndexPage({
  params,
}: {
  params: Promise<{ backendId: string }>
}) {
  const { backendId } = await params
  const backend = backends.find(b => b.id === backendId)
  redirect(`/search/${backendId}/${backend?.defaultMode ?? "standard"}`)
}
