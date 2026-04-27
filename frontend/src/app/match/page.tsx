import { MatchPage } from "@/components/match/MatchPage"

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>
}) {
  const sp = await searchParams
  return <MatchPage resumeId={sp.resume ?? null} jobId={sp.job ?? null} />
}
