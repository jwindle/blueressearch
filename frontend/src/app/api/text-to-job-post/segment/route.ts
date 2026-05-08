import { NextResponse } from "next/server"
import { advancedEnabled } from "@/lib/features"
import { checkLength, LIMITS } from "@/lib/limits"
import { segmentJobPost } from "@/lib/text-to-job-post"
import { trackUsage } from "@/lib/usage"

export async function POST(request: Request) {
if (!advancedEnabled()) {
    return NextResponse.json({ error: "Text to Job Post is disabled." }, { status: 403 })
  }

  try {
    const body = await request.json()
    const text = typeof body.text === "string" ? body.text : ""
    const err = checkLength(text, LIMITS.RAW_TEXT, "text")
    if (err) return err
    const sections = await segmentJobPost(text)
    await trackUsage("jobs:llm_call")
    return NextResponse.json({ sections })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 400 },
    )
  }
}
