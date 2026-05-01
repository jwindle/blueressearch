import { NextResponse } from "next/server"
import { advancedEnabled } from "@/lib/features"
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
    const resume = await sectionsToResume(sections)
    await trackUsage("text_to_resume")
    return NextResponse.json({ resume })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 400 },
    )
  }
}
