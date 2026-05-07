import { NextResponse } from "next/server"
import { advancedEnabled } from "@/lib/features"
import { checkLength, LIMITS } from "@/lib/limits"
import { sectionsToResume } from "@/lib/text-to-resume"
import { trackUsage } from "@/lib/usage"
import type { Section } from "@/lib/text-to-resume"

export async function POST(request: Request) {
  if (!advancedEnabled()) {
    return NextResponse.json({ error: "Text to Resume is disabled." }, { status: 403 })
  }

  try {
    const body = await request.json()
    const sections: Section[] = Array.isArray(body.sections) ? body.sections : []
    const err = checkLength(JSON.stringify(sections), LIMITS.JSON_DOCUMENT, "sections")
    if (err) return err
    const resume = await sectionsToResume(sections)
    await trackUsage("resumes:llm_call")
    return NextResponse.json({ resume })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 400 },
    )
  }
}
