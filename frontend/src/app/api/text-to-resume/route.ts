import { NextResponse } from "next/server"
import { advancedEnabled } from "@/lib/features"
import { textToResume } from "@/lib/text-to-resume"
import { trackUsage } from "@/lib/usage"

export async function POST(request: Request) {
  if (!advancedEnabled()) {
    return NextResponse.json({ error: "Text to Resume is disabled." }, { status: 403 })
  }

  try {
    const body = await request.json()
    const text = typeof body.text === "string" ? body.text : ""
    const result = await textToResume(text)
    await trackUsage("text_to_resume")
    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 400 },
    )
  }
}
