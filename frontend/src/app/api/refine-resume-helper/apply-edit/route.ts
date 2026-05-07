import { NextResponse } from "next/server"
import { advancedEnabled } from "@/lib/features"
import { checkLength, LIMITS } from "@/lib/limits"
import { applyResumeEdit } from "@/lib/refine-resume-helper"

export async function POST(request: Request) {
  if (!advancedEnabled()) {
    return NextResponse.json({ error: "Advanced features are disabled." }, { status: 403 })
  }

  try {
    const { resume, instruction } = await request.json()
    const resumeErr = checkLength(JSON.stringify(resume), LIMITS.JSON_DOCUMENT, "resume")
    if (resumeErr) return resumeErr
    const instrErr = checkLength(typeof instruction === "string" ? instruction : "", LIMITS.INSTRUCTION, "instruction")
    if (instrErr) return instrErr
    const updatedResume = await applyResumeEdit(resume, instruction)
    return NextResponse.json({ resume: updatedResume })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 400 },
    )
  }
}
