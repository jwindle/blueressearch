import { notFound } from "next/navigation"
import { headers } from "next/headers"
import { backends } from "@/config/backends"
import { DocumentViewPage } from "@/components/documents/DocumentViewPage"
import type { DocumentResponse } from "@/types/api"

export default async function Page({
  params,
}: {
  params: Promise<{ backendId: string; docId: string }>
}) {
  const { backendId, docId } = await params
  const backend = backends.find(b => b.id === backendId)
  if (!backend) notFound()

  const headersList = await headers()
  const host = headersList.get("x-forwarded-host") ?? headersList.get("host")
  const proto = headersList.get("x-forwarded-proto") ?? "http"
  if (!host) notFound()

  const baseUrl = `${proto}://${host}`
  const docRes = await fetch(`${baseUrl}${backend.url}/documents/${docId}`, { cache: "no-store" })
  if (!docRes.ok) notFound()

  const doc: DocumentResponse = await docRes.json()

  return (
    <DocumentViewPage
      backendId={backendId}
      backendName={backend.name}
      doc={doc}
      DocumentCard={backend.DocumentCard}
    />
  )
}
