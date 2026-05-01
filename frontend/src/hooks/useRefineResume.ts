import { useState, useMemo, useEffect, useRef } from "react"
import { createApiClient } from "@/lib/api"
import { parseDocument, l2Distance, useExtractorSelection } from "@/components/match/shared"
import type { DocumentEmbeddingItem } from "@/types/api"

export type Phase = "setup" | "working"

export type ChunkStatus = "unevaluated" | "matches_well" | "does_not_match_well" | "no_match_found" | "ignored"

export interface JobChunk {
  id: string
  text: string
  embedding: number[]
  status: ChunkStatus
  bestMatchIds?: string[]
  bestMatchDistances?: number[]
}

export interface Candidate {
  id: string
  text: string
  distance: number
  extractor: string
  subkey: string | null
}

function candidatePath(c: Candidate): string {
  let base = c.extractor.toLowerCase().replace(/ /g, "_")
  if (c.extractor === "Summary") base = "basics.summary"
  else if (c.extractor === "Label") base = "basics.label"
  return c.subkey ? `${base}${c.subkey}` : base
}

function setByPath(obj: any, path: string, value: any) {
  const keys = path.replace(/\[(\d+)\]/g, '.$1').split('.').filter(Boolean)
  let current = obj
  for (let i = 0; i < keys.length - 1; i++) {
    if (current[keys[i]] === undefined) {
      current[keys[i]] = isNaN(Number(keys[i+1])) ? {} : []
    }
    current = current[keys[i]]
  }
  current[keys[keys.length - 1]] = value
}

function getByPath(obj: any, path: string) {
  const keys = path.replace(/\[(\d+)\]/g, '.$1').split('.').filter(Boolean)
  let current = obj
  for (let i = 0; i < keys.length; i++) {
    if (current === undefined || current === null) return undefined
    current = current[keys[i]]
  }
  return current
}

export function useRefineResume() {
  const [phase, setPhase] = useState<Phase>("setup")
  const [leftJson, setLeftJson] = useState("")
  const [rightJson, setRightJson] = useState("")

  const [jobChunks, setJobChunks] = useState<JobChunk[]>([])
  const [resumeEmbeddings, setResumeEmbeddings] = useState<DocumentEmbeddingItem[]>([])
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null)
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [topKCount, setTopKCount] = useState(5)
  const [topKStart, setTopKStart] = useState(0)

  const [chatHistory, setChatHistory] = useState<{ role: "system" | "user" | "agent"; content: string }[]>([])
  const [commandHistoryList, setCommandHistoryList] = useState<string[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [commandInput, setCommandInput] = useState("")
  const [jsonHistory, setJsonHistory] = useState<string[]>([])
  const [redoHistory, setRedoHistory] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const chatEndRef = useRef<HTMLDivElement>(null)
  const reEmbedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const left = useMemo(() => parseDocument(leftJson), [leftJson])
  const right = useMemo(() => parseDocument(rightJson), [rightJson])
  const leftExtractors = useExtractorSelection(left.backend)
  const rightExtractors = useExtractorSelection(right.backend)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [chatHistory])

  // Auto re-embed when resume JSON changes and is valid
  useEffect(() => {
    if (!right.data || !right.backend || rightExtractors.selectedNames.length === 0) return
    if (reEmbedTimer.current) clearTimeout(reEmbedTimer.current)
    reEmbedTimer.current = setTimeout(async () => {
      const result = await refreshResumeEmbeddings()
      if (result.length > 0) addSystemMessage(`Auto re-embedded: ${result.length} chunks.`)
    }, 1200)
    return () => {
      if (reEmbedTimer.current) clearTimeout(reEmbedTimer.current)
    }
  // refreshResumeEmbeddings reads from closure — intentionally omitted from deps
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rightJson, right.backend?.id, rightExtractors.selectedNames.join(",")])

  function applyJsonUpdate(newData: any) {
    setJsonHistory(prev => [...prev, rightJson])
    setRedoHistory([])
    setRightJson(JSON.stringify(newData, null, 2))
  }

  function addSystemMessage(content: string, role: "system" | "user" | "agent" = "system") {
    setChatHistory(prev => [...prev, { role, content }])
  }

  async function refreshResumeEmbeddings(): Promise<DocumentEmbeddingItem[]> {
    if (!right.backend) return []
    try {
      setLoading(true)
      const latestData = JSON.parse(rightJson)
      const embs = await createApiClient(right.backend.url).embedDocument(latestData)
      const selected = new Set(rightExtractors.selectedNames)
      const filtered = embs.filter(e => selected.has(e.extractor_name))
      setResumeEmbeddings(filtered)
      if (focusedIndex !== null) {
        updateCandidates(focusedIndex, filtered, topKCount, topKStart)
      }
      return filtered
    } catch (e) {
      console.error("Failed to refresh resume embeddings", e)
      addSystemMessage(`Failed to re-embed: ${e}`)
      return []
    } finally {
      setLoading(false)
    }
  }

  function attachCandidates(matched: Candidate[]) {
    if (focusedIndex === null || matched.length === 0) return
    setJobChunks(prev => prev.map((c, i) =>
      i === focusedIndex ? {
        ...c,
        status: "matches_well",
        bestMatchIds: matched.map(m => m.id),
        bestMatchDistances: matched.map(m => m.distance),
      } : c
    ))
    nextRequirement()
  }

  function ignoreRequirement() {
    if (focusedIndex === null) return
    setJobChunks(prev => prev.map((c, i) =>
      i === focusedIndex ? { ...c, status: "ignored" } : c
    ))
    nextRequirement()
  }

  function editAtPath(path: string, value: any) {
    try {
      const data = JSON.parse(rightJson)
      setByPath(data, path, value)
      applyJsonUpdate(data)
    } catch (e) {
      addSystemMessage(`Edit failed: ${e}`)
    }
  }

  function pushToPath(path: string, value: any) {
    try {
      const data = JSON.parse(rightJson)
      const target = getByPath(data, path)
      if (!Array.isArray(target)) {
        addSystemMessage(`Path ${path} is not an array.`)
        return false
      }
      target.push(value)
      applyJsonUpdate(data)
      return true
    } catch (e) {
      addSystemMessage(`Push failed: ${e}`)
      return false
    }
  }

  function getValueAtPath(path: string): any {
    try {
      return getByPath(JSON.parse(rightJson), path)
    } catch {
      return undefined
    }
  }

  async function handleStart() {
    if (!left.data || left.backend?.id !== "jobs" || leftExtractors.selectedNames.length === 0) return
    setLoading(true)
    setError(null)
    try {
      const leftEmbs = await createApiClient(left.backend.url).embedDocument(left.data)
      const leftSelected = new Set(leftExtractors.selectedNames)
      const filteredLeft = leftEmbs.filter(item => leftSelected.has(item.extractor_name))
      
      if (filteredLeft.length === 0) {
        throw new Error("No requirements extracted. Check your Job Post extractors.")
      }

      setJobChunks(filteredLeft.map((item, i) => ({
        id: `job-${i}`,
        text: item.text,
        embedding: item.embedding,
        status: "unevaluated"
      })))
      
      setPhase("working")
      addSystemMessage("System initialized. Please paste your Resume JSON in the right panel, then use /focus <n> or click a requirement to begin.")
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }

  function updateCandidates(index: number, currentResumeEmbs: DocumentEmbeddingItem[], k: number, start: number): Candidate[] {
    if (index < 0 || index >= jobChunks.length) return []
    const chunk = jobChunks[index]
    const jobEmbedding = chunk.embedding

    const scored: Candidate[] = currentResumeEmbs.map((emb, i) => ({
      id: `res-${i}`,
      text: emb.text,
      distance: l2Distance(emb.embedding, jobEmbedding),
      extractor: emb.extractor_name,
      subkey: emb.subkey
    })).sort((a, b) => a.distance - b.distance)

    const page = scored.slice(start, start + k)
    setCandidates(page)
    return page
  }

  function formatCandidateList(list: Candidate[]): string {
    if (list.length === 0) return "No candidates found. Make sure resume JSON is pasted and /re-embed has been run."
    return list.map((c, i) =>
      `[${i + 1}] dist:${c.distance.toFixed(4)} path:${c.extractor.toLowerCase()}${c.subkey ? c.subkey : ""}\n    "${c.text}"`
    ).join("\n")
  }

  function focusOnChunk(index: number): string {
    if (index < 0 || index >= jobChunks.length) return `Invalid requirement number.`
    setFocusedIndex(index)
    updateCandidates(index, resumeEmbeddings, topKCount, topKStart)
    const chunk = jobChunks[index]
    const suffix = resumeEmbeddings.length === 0 ? " (no resume embedded yet — paste resume JSON and run /re-embed)" : ""
    return `Requirement #${index + 1}: "${chunk.text}"${suffix}`
  }

  function nextRequirement(): string {
    const chunks = jobChunks
    const nextIdx = chunks.findIndex((c, i) => i > (focusedIndex ?? -1) && c.status === "unevaluated")
    if (nextIdx !== -1) {
      return focusOnChunk(nextIdx)
    }
    const firstUnevaluated = chunks.findIndex(c => c.status === "unevaluated")
    if (firstUnevaluated !== -1) {
      return focusOnChunk(firstUnevaluated)
    }
    return "All requirements have been evaluated!"
  }

  async function executeCommand(cmdString: string, silentUser = false) {
    const raw = cmdString.trim()
    if (!raw) return
    
    const parts = raw.split(" ")
    const cmd = parts[0].toLowerCase()

    if (!silentUser) {
      setCommandHistoryList(prev => [...prev, raw])
      setHistoryIndex(-1)
      addSystemMessage(raw, "user")
    }
    const args = parts.slice(1).join(" ")

    let resultMessage = ""
    const log = (msg: string) => {
      resultMessage += msg + "\n"
      addSystemMessage(msg)
    }

    switch (cmd) {
      case "/search": {
        if (!args) {
          log("Usage: /search <semantic hint text>")
          break
        }
        setLoading(true)
        try {
          const hintEmbs = await createApiClient(left.backend!.url).embedDocument({ text: args } as any)
          const hintEmbedding = hintEmbs[0].embedding
          
          const scored: Candidate[] = resumeEmbeddings.map((emb, i) => ({
            id: `res-${i}`,
            text: emb.text,
            distance: l2Distance(emb.embedding, hintEmbedding),
            extractor: emb.extractor_name,
            subkey: emb.subkey
          })).sort((a, b) => a.distance - b.distance)
          
          const page = scored.slice(0, topKCount)
          setCandidates(page)
          log(`Search results for "${args}":\n${formatCandidateList(page)}`)
        } catch(e) {
          log(`Search failed: ${e}`)
        } finally {
          setLoading(false)
        }
        break
      }
      case "/next":
        log(nextRequirement())
        break
      case "/focus": {
        const idx = parseInt(args) - 1
        log(focusOnChunk(idx))
        break
      }
      case "/top": {
        const topArgs = args.trim() ? args.split(" ") : []
        const k = topArgs.length > 0 ? parseInt(topArgs[0]) : resumeEmbeddings.length
        const start = topArgs.length > 1 ? parseInt(topArgs[1]) : 0
        if (isNaN(k) || k <= 0 || isNaN(start) || start < 0) {
          log("Usage: /top [number] [start]")
        } else if (resumeEmbeddings.length === 0) {
          log("No resume embeddings found. Paste resume JSON in the right panel and run /re-embed first.")
        } else if (focusedIndex === null) {
          log("No requirement focused. Click a requirement or use /focus <n> first.")
        } else {
          setTopKCount(k)
          setTopKStart(start)
          const list = updateCandidates(focusedIndex, resumeEmbeddings, k, start)
          const label = topArgs.length === 0 ? "All" : `Top ${k}`
          log(`${label} candidates (starting at ${start}):\n${formatCandidateList(list)}`)
        }
        break
      }
      case "/jsonpath": {
        const n = parseInt(args)
        if (isNaN(n) || n <= 0 || n > candidates.length) {
          log(`Invalid candidate number. Use /jsonpath 1–${candidates.length}`)
        } else {
          log(`Candidate #${n} → ${candidatePath(candidates[n - 1])}`)
        }
        break
      }
      case "/show": {
        if (!args) {
          log("Usage: /show <jsonpath>")
          break
        }
        try {
          const data = JSON.parse(rightJson)
          const val = getByPath(data, args)
          log(`${args}:\n${JSON.stringify(val, null, 2)}`)
        } catch(e) {
          log(`Error showing path: ${e}`)
        }
        break
      }
      case "/push": {
        const spaceIdx = args.indexOf(" ")
        if (spaceIdx === -1) {
          log("Usage: /push <jsonpath> <new text/json>")
          break
        }
        const path = args.slice(0, spaceIdx)
        const rawText = args.slice(spaceIdx + 1)
        let parsedVal = rawText
        try {
          if (rawText.startsWith("{") || rawText.startsWith("[")) {
            parsedVal = JSON.parse(rawText)
          }
        } catch(e) {}
        
        try {
          const data = JSON.parse(rightJson)
          const target = getByPath(data, path)
          if (Array.isArray(target)) {
            target.push(parsedVal)
            applyJsonUpdate(data)
            log(`Pushed to array at ${path}.`)
          } else {
            log(`Error: Path ${path} is not an array.`)
          }
        } catch(err) {
          log(`Failed to push: ${err}`)
        }
        break
      }
      case "/edit": {
        const spaceIdx = args.indexOf(" ")
        if (spaceIdx === -1) {
          log("Usage: /edit <jsonpath|candidate#> <new text/json>")
          break
        }
        const pathArg = args.slice(0, spaceIdx)
        const rawText = args.slice(spaceIdx + 1)

        // If first arg is an integer, resolve to candidate path
        const maybeN = parseInt(pathArg)
        let path: string
        let pathNote = ""
        if (!isNaN(maybeN) && String(maybeN) === pathArg) {
          if (maybeN < 1 || maybeN > candidates.length) {
            log(`Invalid candidate number. Use 1–${candidates.length}.`)
            break
          }
          path = candidatePath(candidates[maybeN - 1])
          pathNote = ` (candidate #${maybeN} → ${path})`
        } else {
          path = pathArg
        }

        let parsedVal: any = rawText
        try {
          if (rawText.startsWith("{") || rawText.startsWith("[")) {
            parsedVal = JSON.parse(rawText)
          }
        } catch(e) {}

        try {
          const data = JSON.parse(rightJson)
          if (getByPath(data, path) === undefined) {
            log(`Path "${path}" does not exist. Use /insert to create new fields.`)
            break
          }
          setByPath(data, path, parsedVal)
          applyJsonUpdate(data)
          log(`Updated${pathNote}.`)
        } catch(err) {
          log(`Failed to edit: ${err}`)
        }
        break
      }
      case "/insert": {
        const spaceIdx = args.indexOf(" ")
        if (spaceIdx === -1) {
          log("Usage: /insert <jsonpath> <new text/json>")
          break
        }
        const path = args.slice(0, spaceIdx)
        const rawText = args.slice(spaceIdx + 1)
        let parsedVal = rawText
        try {
          if (rawText.startsWith("{") || rawText.startsWith("[")) {
            parsedVal = JSON.parse(rawText)
          }
        } catch(e) {}

        try {
          const data = JSON.parse(rightJson)
          const target = getByPath(data, path)
          if (target !== undefined) {
             log(`Error: Field already exists at ${path}. Use /edit instead.`)
          } else {
             setByPath(data, path, parsedVal)
             applyJsonUpdate(data)
             log(`Inserted new field at ${path}. (Remember to /re-embed when ready)`)
          }
        } catch(err) {
          log(`Failed to insert: ${err}`)
        }
        break
      }
      case "/undo": {
        if (jsonHistory.length > 0) {
          const previous = jsonHistory[jsonHistory.length - 1];
          setJsonHistory(prev => prev.slice(0, -1));
          setRedoHistory(prev => [...prev, rightJson]);
          setRightJson(previous);
          log("Reverted to previous JSON state.");
        } else {
          log("No history to undo.");
        }
        break;
      }
      case "/redo": {
        if (redoHistory.length > 0) {
          const nextState = redoHistory[redoHistory.length - 1];
          setRedoHistory(prev => prev.slice(0, -1));
          setJsonHistory(prev => [...prev, rightJson]);
          setRightJson(nextState);
          log("Redid JSON state.");
        } else {
          log("No history to redo.");
        }
        break;
      }
      case "/re-embed": {
        setLoading(true)
        const result = await refreshResumeEmbeddings()
        setLoading(false)
        log(`Re-embedded: ${result.length} chunks.`)
        break
      }
      case "/ignore":
        if (focusedIndex !== null) {
          setJobChunks(prev => prev.map((c, i) => i === focusedIndex ? { ...c, status: "ignored" } : c))
          log(`Requirement #${focusedIndex + 1} ignored. ${nextRequirement()}`)
        } else {
          log("No requirement focused.")
        }
        break
      case "/attach": {
        const nums = args.split(/[\s,]+/).map(s => parseInt(s)).filter(n => !isNaN(n) && n >= 1 && n <= candidates.length)
        if (focusedIndex !== null && nums.length > 0) {
          const matched = nums.map(n => candidates[n - 1])
          setJobChunks(prev => prev.map((c, i) => i === focusedIndex ? {
            ...c,
            status: "matches_well",
            bestMatchIds: matched.map(m => m.id),
            bestMatchDistances: matched.map(m => m.distance),
          } : c))
          log(`Requirement #${focusedIndex + 1} attached to candidate(s) ${nums.join(", ")}. ${nextRequirement()}`)
        } else {
          log(`Invalid candidate number(s). Use 1–${candidates.length}, separated by spaces or commas.`)
        }
        break
      }
      case "/stats": {
        const attached = jobChunks.filter(c => c.bestMatchDistances?.length)
        if (attached.length === 0) {
          log("No requirements attached yet.")
        } else {
          const avgDists = attached.map(c =>
            c.bestMatchDistances!.reduce((s, d) => s + d, 0) / c.bestMatchDistances!.length
          )
          const globalMean = avgDists.reduce((s, d) => s + d, 0) / avgDists.length
          log(`Stats: ${attached.length}/${jobChunks.length} requirements attached — global mean distance: ${globalMean.toFixed(4)}`)
        }
        break
      }
      case "/setup":
        setPhase("setup")
        log("Returning to setup phase.")
        break
      case "/help":
        log(`**Commands:**
- /top <n> [start]: List top n matches, starting at [start] (default 0).
- /jsonpath <n>: Get the estimated JSON path for candidate n.
- /show <jsonpath>: Show the value at a JSON path.
- /edit <jsonpath> <text/json>: Edit value at a location.
- /push <jsonpath> <text/json>: Push a value to a list.
- /insert <jsonpath> <text/json>: Insert new value if path does not exist.
- /undo: Revert the last JSON command (/edit, /push, /insert).
- /redo: Reapply the last undone JSON command.
- /attach <n> [n2 n3...]: Associate the requirement with one or more candidates (space or comma separated).
- /ignore: Mark current requirement as ignored.
- /re-embed: Manually force re-embedding of the Resume JSON.
- /next: Move to the next unevaluated requirement.
- /focus <n>: Focus on job requirement n.
- /search <hint>: Search the resume for a semantic hint.
- /stats: Show global mean distance across all attached requirements.
- /setup: Return to setup page.`)
        break
      default:
        log("Unknown command. Type /help.")
    }
    
    return resultMessage.trim()
  }

  async function handleCommand(e: React.FormEvent) {
    e.preventDefault()
    const raw = commandInput.trim()
    setCommandInput("")
    await executeCommand(raw)
  }

  return {
    phase,
    leftJson, setLeftJson,
    rightJson, setRightJson,
    jobChunks,
    focusedIndex,
    candidates,
    resumeEmbeddings,
    topKCount,
    chatHistory,
    commandHistoryList,
    historyIndex, setHistoryIndex,
    commandInput, setCommandInput,
    loading,
    error,
    chatEndRef,
    left, right,
    leftExtractors, rightExtractors,
    handleStart,
    focusOnChunk,
    nextRequirement,
    handleCommand,
    executeCommand,
    addSystemMessage,
    refreshResumeEmbeddings,
    attachCandidates,
    ignoreRequirement,
    editAtPath,
    pushToPath,
    getValueAtPath,
  }
}
