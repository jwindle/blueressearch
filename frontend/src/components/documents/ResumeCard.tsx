import type {
  Resume,
  WorkEntry,
  EducationEntry,
  ProjectEntry,
  AwardEntry,
  CertificateEntry,
  PublicationEntry,
  SkillEntry,
  VolunteerEntry,
} from "@/types/documents"
import { CopyJsonButton } from "./CopyJsonButton"

function WorkSection({ entry }: { entry: WorkEntry }) {
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-2">
        <p className="font-medium text-sm">
          {entry.position} {entry.company || entry.name ? `· ${entry.company || entry.name}` : ""}
        </p>
        {(entry.startDate || entry.endDate) && (
          <p className="text-xs shrink-0" style={{ color: "var(--muted-foreground)" }}>
            {entry.startDate} – {entry.endDate ?? "Present"}
          </p>
        )}
      </div>
      {entry.location && <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>{entry.location}</p>}
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
      <div className="text-sm">
        <span className="font-medium">{entry.institution}</span>
        {entry.studyType && entry.area && ` · ${entry.studyType}, ${entry.area}`}
        {entry.score && <span className="ml-2 text-xs" style={{ color: "var(--muted-foreground)" }}>GPA: {entry.score}</span>}
      </div>
      {(entry.startDate || entry.endDate) && (
        <p className="text-xs shrink-0" style={{ color: "var(--muted-foreground)" }}>
          {entry.startDate} – {entry.endDate ?? "Present"}
        </p>
      )}
    </div>
  )
}

function ProjectSection({ entry }: { entry: ProjectEntry }) {
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-2">
        <p className="font-medium text-sm">{entry.name}</p>
        {(entry.startDate || entry.endDate) && (
          <p className="text-xs shrink-0" style={{ color: "var(--muted-foreground)" }}>
            {entry.startDate} – {entry.endDate ?? "Present"}
          </p>
        )}
      </div>
      {entry.description && <p className="text-sm">{entry.description}</p>}
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

export function ResumeCard({ data }: { data: unknown }) {
  const resume = data as Resume

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold">{resume.basics?.name}</h3>
          {resume.basics?.label && (
            <p className="text-sm font-medium" style={{ color: "var(--muted-foreground)" }}>{resume.basics.label}</p>
          )}
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm">
            {resume.basics?.email && <span>{resume.basics.email}</span>}
            {resume.basics?.phone && <span>{resume.basics.phone}</span>}
            {resume.basics?.url && (
              <a href={resume.basics.url} target="_blank" rel="noreferrer" className="hover:underline" style={{ color: "var(--accent)" }}>
                {resume.basics.url.replace(/^https?:\/\//, "")}
              </a>
            )}
            {resume.basics?.location && (
              <span>
                {[resume.basics.location.city, resume.basics.location.region, resume.basics.location.countryCode].filter(Boolean).join(", ")}
              </span>
            )}
          </div>
        </div>
        <CopyJsonButton data={data} />
      </div>

      {resume.basics?.summary && (
        <div className="space-y-1">
          <h4 className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>Summary</h4>
          <p className="text-sm leading-relaxed">{resume.basics.summary}</p>
        </div>
      )}

      {resume.work && resume.work.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-wider border-b pb-1" style={{ color: "var(--muted-foreground)", borderColor: "var(--border)" }}>
            Experience
          </h4>
          <div className="space-y-4">
            {resume.work.map((e, i) => <WorkSection key={i} entry={e} />)}
          </div>
        </div>
      )}

      {resume.projects && resume.projects.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-wider border-b pb-1" style={{ color: "var(--muted-foreground)", borderColor: "var(--border)" }}>
            Projects
          </h4>
          <div className="space-y-4">
            {resume.projects.map((e, i) => <ProjectSection key={i} entry={e} />)}
          </div>
        </div>
      )}

      {resume.education && resume.education.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider border-b pb-1" style={{ color: "var(--muted-foreground)", borderColor: "var(--border)" }}>
            Education
          </h4>
          <div className="space-y-3">
            {resume.education.map((e, i) => <EducationSection key={i} entry={e} />)}
          </div>
        </div>
      )}

      {resume.skills && resume.skills.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider border-b pb-1" style={{ color: "var(--muted-foreground)", borderColor: "var(--border)" }}>
            Skills
          </h4>
          <div className="grid gap-x-4 gap-y-2 sm:grid-cols-2">
            {resume.skills.map((s, i) => (
              <div key={i} className="text-sm">
                {s.name && <span className="font-semibold mr-2">{s.name}:</span>}
                <span style={{ color: "var(--foreground)" }}>
                  {s.keywords?.join(", ")}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {(resume.awards?.length || resume.certificates?.length || resume.publications?.length || resume.languages?.length) ? (
        <div className="grid gap-6 sm:grid-cols-2">
          {resume.languages && resume.languages.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider border-b pb-1" style={{ color: "var(--muted-foreground)", borderColor: "var(--border)" }}>
                Languages
              </h4>
              <ul className="text-sm space-y-1">
                {resume.languages.map((l, i) => (
                  <li key={i}><span className="font-medium">{l.language}</span> — {l.fluency}</li>
                ))}
              </ul>
            </div>
          )}
          {resume.certificates && resume.certificates.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider border-b pb-1" style={{ color: "var(--muted-foreground)", borderColor: "var(--border)" }}>
                Certifications
              </h4>
              <ul className="text-sm space-y-1">
                {resume.certificates.map((c, i) => (
                  <li key={i}><span className="font-medium">{c.name}</span>, {c.issuer} ({c.date})</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}
