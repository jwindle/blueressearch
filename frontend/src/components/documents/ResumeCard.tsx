import type { Resume, WorkEntry, EducationEntry } from "@/types/documents"
import { CopyJsonButton } from "./CopyJsonButton"

function WorkSection({ entry }: { entry: WorkEntry }) {
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-2">
        <p className="font-medium text-sm">{entry.position} · {entry.company}</p>
        {(entry.startDate || entry.endDate) && (
          <p className="text-xs shrink-0" style={{ color: "var(--muted-foreground)" }}>
            {entry.startDate} – {entry.endDate ?? "Present"}
          </p>
        )}
      </div>
      {entry.summary && <p className="text-sm">{entry.summary}</p>}
      {entry.highlights && entry.highlights.length > 0 && (
        <ul className="list-disc list-inside space-y-0.5">
          {entry.highlights.map((h, i) => (
            <li key={i} className="text-sm">{h}</li>
          ))}
        </ul>
      )}
    </div>
  )
}

function EducationSection({ entry }: { entry: EducationEntry }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <p className="text-sm">
        <span className="font-medium">{entry.institution}</span>
        {entry.studyType && entry.area && ` · ${entry.studyType}, ${entry.area}`}
      </p>
      {(entry.startDate || entry.endDate) && (
        <p className="text-xs shrink-0" style={{ color: "var(--muted-foreground)" }}>
          {entry.startDate} – {entry.endDate ?? "Present"}
        </p>
      )}
    </div>
  )
}

export function ResumeCard({ data }: { data: unknown }) {
  const resume = data as Resume

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold">{resume.basics?.name}</h3>
          {resume.basics?.label && (
            <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>{resume.basics.label}</p>
          )}
          {resume.basics?.email && (
            <p className="text-sm">{resume.basics.email}</p>
          )}
        </div>
        <CopyJsonButton data={data} />
      </div>

      {resume.basics?.summary && (
        <p className="text-sm">{resume.basics.summary}</p>
      )}

      {resume.work && resume.work.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold uppercase tracking-wide" style={{ color: "var(--muted-foreground)" }}>
            Experience
          </h4>
          {resume.work.map((e, i) => <WorkSection key={i} entry={e} />)}
        </div>
      )}

      {resume.education && resume.education.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold uppercase tracking-wide" style={{ color: "var(--muted-foreground)" }}>
            Education
          </h4>
          {resume.education.map((e, i) => <EducationSection key={i} entry={e} />)}
        </div>
      )}

      {resume.skills && resume.skills.length > 0 && (
        <div className="space-y-1">
          <h4 className="text-sm font-semibold uppercase tracking-wide" style={{ color: "var(--muted-foreground)" }}>
            Skills
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {resume.skills.flatMap(s => s.keywords ?? [s.name ?? ""]).filter(Boolean).map((k, i) => (
              <span
                key={i}
                className="text-xs px-2 py-0.5 rounded-full"
                style={{ background: "var(--muted)", color: "var(--muted-foreground)" }}
              >
                {k}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
