import { NextResponse } from "next/server"
import { advancedEnabled } from "@/lib/features"
import { sectionsToJobPost } from "@/lib/text-to-job-post"
import { trackUsage } from "@/lib/usage"
import type { Section } from "@/lib/text-to-job-post"

export async function POST(request: Request) {
  if (!advancedEnabled()) {
    return NextResponse.json({ error: "Text to Job Post is disabled." }, { status: 403 })
  }

  try {
    const body = await request.json()
    const sections: Section[] = Array.isArray(body.sections) ? body.sections : []
    const jobPost = await sectionsToJobPost(sections)
    await trackUsage("text_to_job_post")
    return NextResponse.json({ jobPost })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 400 },
    )
  }
}
