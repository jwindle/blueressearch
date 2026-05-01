import { NextResponse } from "next/server"
import { advancedEnabled } from "@/lib/features"
import { segmentResume } from "@/lib/text-to-resume"

export async function POST(request: Request) {
  if (!advancedEnabled()) {
    return NextResponse.json({ error: "Text to Resume is disabled." }, { status: 403 })
  }

  try {
    const body = await request.json()
    const text = typeof body.text === "string" ? body.text : ""
    const sections = await segmentResume(text)
    return NextResponse.json({ sections })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 400 },
    )
  }
}
