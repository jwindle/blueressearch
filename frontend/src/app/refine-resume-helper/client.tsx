"use client"

import CodeMirror from "@uiw/react-codemirror"
import { ResumeCard } from "@/components/documents/ResumeCard"
import { JobPostCard } from "@/components/documents/JobPostCard"
import { jsonEditorExtensions, ExtractorPicker } from "@/components/match/shared"
import type { Resume, JobPost } from "@/types/documents"
import { useRefineResume } from "@/hooks/useRefineResume"

export function RefineResumeHelperClient() {
  const state = useRefineResume()

  if (state.phase === "setup") {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Refine Resume Helper</h1>
          <button
            onClick={state.handleStart}
            disabled={state.loading || !state.left.data || state.left.backend?.id !== "jobs" || state.leftExtractors.selectedNames.length === 0}
            className="px-6 py-2 rounded font-medium disabled:opacity-50 transition-colors"
            style={{ background: "var(--accent)", color: "#fff" }}
          >
            {state.loading ? "Analyzing Job..." : "Start Analysis →"}
          </button>
        </div>

        <div className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">1. Paste Job Post JSON</h2>
              {state.left.backend?.id === "jobs" && <span className="text-xs text-green-500 font-bold">Job Post Detected ✓</span>}
            </div>
            <CodeMirror value={state.leftJson} onChange={state.setLeftJson} height="24rem" theme="none" extensions={jsonEditorExtensions} />
            <ExtractorPicker {...state.leftExtractors} onChange={state.leftExtractors.setSelectedNames} />
          </div>

          {state.left.data && state.left.backend?.id === "jobs" && (
            <div className="rounded-xl border p-6 bg-muted/20 border-dashed" style={{ borderColor: "var(--border)" }}>
              <JobPostCard data={state.left.data as unknown as JobPost} />
            </div>
          )}
        </div>
        {state.error && <div className="p-4 rounded bg-red-100 text-red-800 text-sm border-l-4 border-red-500">{state.error}</div>}
      </div>
    )
  }

  const chunkAvgDists = state.jobChunks.map(c =>
    c.bestMatchDistances?.length
      ? c.bestMatchDistances.reduce((s, d) => s + d, 0) / c.bestMatchDistances.length
      : null
  )

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden">
      {/* Sidebar: Requirements */}
      <div className="w-72 border-r flex flex-col bg-muted/20" style={{ borderColor: "var(--border)" }}>
        <div className="p-4 border-b font-bold text-xs uppercase tracking-widest text-muted-foreground flex items-center justify-between">
          <span>Requirements</span>
          <button onClick={state.nextRequirement} className="hover:underline text-accent">Next →</button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {state.jobChunks.map((chunk, i) => {
            const avg = chunkAvgDists[i]
            return (
              <button
                key={chunk.id}
                onClick={() => state.focusOnChunk(i)}
                className={`w-full text-left p-4 border-b text-xs transition-colors hover:bg-muted/50 flex gap-3 items-start ${state.focusedIndex === i ? "bg-muted shadow-inner" : ""}`}
                style={{ borderColor: "var(--border)" }}
              >
                <div className={`w-2 h-2 rounded-full mt-1 shrink-0 ${
                  chunk.status === "matches_well" ? "bg-green-500" :
                  chunk.status === "does_not_match_well" ? "bg-yellow-500" :
                  chunk.status === "no_match_found" ? "bg-red-500" :
                  chunk.status === "ignored" ? "bg-slate-400" : "bg-slate-200"
                }`} />
                <div className="flex-1 min-w-0">
                  <div className="line-clamp-2">{chunk.text}</div>
                  {avg !== null && (
                    <div className="mt-1 font-mono tabular-nums" style={{ color: "var(--muted-foreground)", fontSize: "10px" }}>
                      dist {avg.toFixed(3)}
                    </div>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Center: Console */}
      <div className="flex-1 flex flex-col min-w-0 border-r bg-muted/5" style={{ borderColor: "var(--border)" }}>
           {state.focusedIndex !== null && (() => {
             const chunk = state.jobChunks[state.focusedIndex]
             return (
               <div className="shrink-0 px-4 py-2.5 border-b flex items-start gap-3" style={{ borderColor: "var(--border)" }}>
                 <div className="shrink-0 text-[10px] font-bold uppercase tracking-widest mt-0.5" style={{ color: "var(--muted-foreground)" }}>
                   #{state.focusedIndex + 1}
                 </div>
                 <div className="flex-1 text-sm leading-snug" style={{ color: "var(--foreground)" }}>
                   {chunk.text}
                 </div>
                 <span className="shrink-0 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border mt-0.5" style={{
                   borderColor: chunk.status === "matches_well" ? "#10b981" : chunk.status === "ignored" ? "#94a3b8" : "var(--border)",
                   color:       chunk.status === "matches_well" ? "#10b981" : chunk.status === "ignored" ? "#94a3b8" : "var(--muted-foreground)",
                 }}>
                   {chunk.status.replace(/_/g, " ")}
                 </span>
               </div>
             )
           })()}
           <div className="flex-1 overflow-y-auto p-4 space-y-3 font-mono text-[11px]">
              {state.chatHistory.map((msg, i) => (
                <div key={i} className={`flex gap-3 ${msg.role === "user" ? "text-accent" : "text-muted-foreground"}`}>
                  <span className="font-bold shrink-0 opacity-50">[{msg.role.toUpperCase()}]</span>
                  <div className="whitespace-pre-wrap break-words">{msg.content}</div>
                </div>
              ))}
              <div ref={state.chatEndRef} />
           </div>
           <form onSubmit={state.handleCommand} className="p-3 bg-background border-t flex gap-2" style={{ borderColor: "var(--border)" }}>
              <textarea
                value={state.commandInput}
                onChange={e => state.setCommandInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    state.handleCommand(e as any);
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    if (state.commandHistoryList.length > 0) {
                      const nextIdx = state.historyIndex === -1 ? state.commandHistoryList.length - 1 : Math.max(0, state.historyIndex - 1);
                      state.setHistoryIndex(nextIdx);
                      state.setCommandInput(state.commandHistoryList[nextIdx]);
                    }
                  } else if (e.key === "ArrowDown") {
                    e.preventDefault();
                    if (state.historyIndex !== -1) {
                      const nextIdx = state.historyIndex + 1;
                      if (nextIdx >= state.commandHistoryList.length) {
                        state.setHistoryIndex(-1);
                        state.setCommandInput("");
                      } else {
                        state.setHistoryIndex(nextIdx);
                        state.setCommandInput(state.commandHistoryList[nextIdx]);
                      }
                    }
                  }
                }}
                placeholder="Type /help for commands... (Shift+Enter for newline)"
                className="flex-1 bg-transparent outline-none font-mono text-xs px-2 resize-y min-h-[40px] max-h-32 pt-1.5"
                autoFocus
              />
              <button type="submit" className="text-xs font-bold uppercase tracking-widest px-4 py-1 rounded bg-accent text-white hover:opacity-90 h-8 self-end">Run</button>
           </form>
      </div>

      {/* Right: Resume Editor */}
      <div className="w-[450px] flex flex-col bg-background">
        <div className="p-4 border-b font-bold text-xs uppercase tracking-widest text-muted-foreground flex items-center justify-between">
          <span>Resume JSON</span>
          <div className="flex items-center gap-2">
            {state.loading && <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />}
            {state.right.backend?.id === "resumes" && <span className="text-green-500 font-bold">✓</span>}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <CodeMirror
            value={state.rightJson}
            onChange={state.setRightJson}
            minHeight="20rem"
            theme="none"
            extensions={jsonEditorExtensions}
            basicSetup={{ lineNumbers: true }}
          />
          <ExtractorPicker {...state.rightExtractors} onChange={state.rightExtractors.setSelectedNames} />

          {state.right.data && state.right.backend?.id === "resumes" && (
            <div className="rounded-xl border p-4 bg-muted/20" style={{ borderColor: "var(--border)" }}>
              <ResumeCard data={state.right.data as Resume} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
