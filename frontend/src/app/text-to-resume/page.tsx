import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth"
import { TextToResumeClient } from "./client"

export default async function Page() {
  const session = await getSession()
  if (!session.did) redirect("/sign-in")
  return <TextToResumeClient />
}
