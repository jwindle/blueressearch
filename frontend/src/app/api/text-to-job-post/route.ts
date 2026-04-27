import { NextResponse } from "next/server"
import { advancedEnabled } from "@/lib/features"
import { textToJobPost } from "@/lib/text-to-job-post"
import { trackUsage } from "@/lib/usage"

export async function POST(request: Request) {
  if (!advancedEnabled()) {
    return NextResponse.json({ error: "Text to Job Post is disabled." }, { status: 403 })
  }

  try {
    const body = await request.json()
    const text = typeof body.text === "string" ? body.text : ""
    const result = await textToJobPost(text)
    await trackUsage("text_to_job_post")
    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 400 },
    )
  }
}
