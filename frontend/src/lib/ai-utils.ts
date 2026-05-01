import { openai } from "@ai-sdk/openai"
import { anthropic } from "@ai-sdk/anthropic"

export function getAIModel(envVar: string, fallbackEnvVar?: string) {
  const spec = process.env[envVar] ?? (fallbackEnvVar ? process.env[fallbackEnvVar] : undefined) ?? "openai:gpt-4o-mini"
  const colon = spec.indexOf(":")
  const provider = colon === -1 ? spec : spec.slice(0, colon)
  const modelId = colon === -1 ? spec : spec.slice(colon + 1)
  if (provider === "anthropic") return anthropic(modelId)
  return openai(modelId)
}

export function numberLines(text: string): { numbered: string; lines: string[] } {
  const lines = text.split("\n")
  const width = String(lines.length).length
  const numbered = lines
    .map((l, i) => `${String(i + 1).padStart(width, " ")}: ${l}`)
    .join("\n")
  return { numbered, lines }
}

export function extractLines(lines: string[], startLine: number, endLine: number): string {
  return lines.slice(startLine - 1, endLine).join("\n").trim()
}

/**
 * Recursively removes null values from an object, replacing them with undefined.
 * This is useful for matching types that use optional fields instead of nullable ones.
 */
export function cleanNulls<T>(obj: T): T {
  if (Array.isArray(obj)) {
    return obj.map(v => cleanNulls(v)) as unknown as T
  }
  if (obj !== null && typeof obj === "object") {
    const next = {} as any
    for (const key in obj) {
      if (obj[key] !== null) {
        next[key] = cleanNulls(obj[key])
      }
    }
    return next as T
  }
  return obj
}
