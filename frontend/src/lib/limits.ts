import { NextResponse } from "next/server"

export const LIMITS = {
  EMBEDDING_QUERY: 1_000,   // conservative; matches sentence-transformers (~256 tokens)
  RAW_TEXT:        50_000,  // raw paste input for segment step
  JSON_DOCUMENT:  200_000,  // serialized JSON (sections, resume, etc.)
  INSTRUCTION:     2_000,   // user instruction text
} as const

export function checkLength(value: string, max: number, field: string): NextResponse | null {
  if (value.length > max) {
    return NextResponse.json(
      { error: `${field} exceeds maximum of ${max.toLocaleString()} characters` },
      { status: 422 },
    )
  }
  return null
}
