import { generateObject, generateText } from "ai"
import { z } from "zod"
import { getAIModel, cleanNulls } from "./ai-utils"
import type { Resume } from "@/types/documents"

function getModel() {
  return getAIModel("AGENT_HELPER_MODEL", "TEXT_TO_RESUME_MODEL")
}

export interface MatchAnalysis {
  status: "matches_well" | "does_not_match_well" | "ignore"
  reasoning: string
  suggestion?: string
}

export interface SectionAnalysis {
  leftText: string
  rightText: string
  analysis: MatchAnalysis
}

/**
 * Analyzes a single pair of job trait vs resume entry.
 */
export async function analyzeMatchPair(
  jobRequirement: string,
  resumeEvidence: string
): Promise<MatchAnalysis> {
  const model = getModel()
  
  const { object } = await generateObject({
    model,
    schema: z.object({
      status: z.enum(["matches_well", "does_not_match_well", "ignore"]),
      reasoning: z.string().describe("Why this match is good or bad."),
      suggestion: z.string().describe("If it doesn't match well, how to improve the resume text. Return an empty string if no suggestion is needed."),
    }),
    system: `You are an expert career coach and technical recruiter. 
Compare a specific job requirement against a specific piece of evidence from a candidate's resume.
Determine if the evidence strongly supports the requirement.
If it doesn't, suggest a surgical improvement to the resume text that would make it more relevant, but ONLY if it seems plausible based on the context.`,
    prompt: `Job Requirement: "${jobRequirement}"\nResume Evidence: "${resumeEvidence}"`,
  })

  return object
}

/**
 * Updates a resume JSON based on user feedback and agent suggestions.
 */
export async function applyResumeEdit(
  resume: Resume,
  instruction: string,
): Promise<Resume> {
  const model = getModel()

  const { object } = await generateObject({
    model,
    schema: z.any(), // We will cast to Resume
    system: `You are a JSON editor. You receive a resume in JSON format and an instruction to update it.
Apply the change surgically to the relevant section (work, projects, skills, etc.).
Maintain the existing structure and do not invent facts outside the instruction.
Return the complete updated resume JSON.`,
    prompt: `Current Resume:\n${JSON.stringify(resume, null, 2)}\n\nInstruction: ${instruction}`,
  })

  return cleanNulls(object as Resume)
}

/**
 * Evaluates multiple candidate matches for a single job requirement.
 */
export async function evaluateTopKMatches(
  jobRequirement: string,
  candidates: { text: string; distance: number; id: string }[]
): Promise<{
  bestMatchId: string | null
  status: "matches_well" | "does_not_match_well" | "no_match_found"
  reasoning: string
  suggestion: string
}> {
  const model = getModel()

  const { object } = await generateObject({
    model,
    schema: z.object({
      bestMatchId: z.string().nullable().describe("The ID of the candidate that best matches, or null if none are good."),
      status: z.enum(["matches_well", "does_not_match_well", "no_match_found"]),
      reasoning: z.string().describe("Why you chose this match or why none match."),
      suggestion: z.string().describe("How to improve the resume or a specific edit suggestion."),
    }),
    system: `You are an expert recruiter. You are looking at ONE job requirement and the TOP candidate matches from a resume.
1. Determine if any of the candidates "match well" (strong evidence).
2. If one matches partially, mark as "does_not_match_well" and suggest an improvement.
3. If none match at all, mark as "no_match_found".
4. Always provide a specific 'suggestion' for the user.`,
    prompt: `Job Requirement: "${jobRequirement}"\n\nCandidate Evidence:\n${candidates.map((c, i) => `${i + 1}. [ID: ${c.id}] (dist: ${c.distance.toFixed(4)}): "${c.text}"`).join("\n")}`,
  })

  return object
}
