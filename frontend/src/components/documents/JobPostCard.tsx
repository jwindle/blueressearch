import type { JobPost, Trait } from "@/types/documents"
import { CopyJsonButton } from "./CopyJsonButton"

function TraitSection({ trait }: { trait: Trait }) {
  return (
    <div>
      <h4 className="text-sm font-semibold mb-1" style={{ color: "var(--muted-foreground)" }}>
        {trait.key}
      </h4>
      <ul className="list-disc list-inside space-y-1">
        {trait.values.map((v, i) => (
          <li key={i} className="text-sm">{v}</li>
        ))}
      </ul>
    </div>
  )
}

export function JobPostCard({ data }: { data: unknown }) {
  const job = data as JobPost

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold">{job.jobTitle}</h3>
          {job.jobLocation && (
            <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>{job.jobLocation}</p>
          )}
        </div>
        <div className="text-right shrink-0 space-y-1">
          <CopyJsonButton data={data} />
          <div>
            {job.estimatedSalary && (
              <p className="text-sm font-medium">
                {job.estimatedSalary.currency} {job.estimatedSalary.min.toLocaleString()}–{job.estimatedSalary.max.toLocaleString()}
              </p>
            )}
            {job.employmentType && (
              <span
                className="inline-block text-xs px-2 py-0.5 rounded-full mt-1"
                style={{ background: "var(--muted)", color: "var(--muted-foreground)" }}
              >
                {job.employmentType}
              </span>
            )}
          </div>
        </div>
      </div>

      {job.shortDescription && (
        <p className="text-sm">{job.shortDescription}</p>
      )}

      {job.employeeTraits && job.employeeTraits.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold uppercase tracking-wide" style={{ color: "var(--muted-foreground)" }}>
            Candidate Requirements
          </h4>
          {job.employeeTraits.map((t, i) => <TraitSection key={i} trait={t} />)}
        </div>
      )}

      {job.jobTraits && job.jobTraits.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold uppercase tracking-wide" style={{ color: "var(--muted-foreground)" }}>
            Responsibilities
          </h4>
          {job.jobTraits.map((t, i) => <TraitSection key={i} trait={t} />)}
        </div>
      )}

      {(job.datePosted || job.validThrough) && (
        <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
          Posted {job.datePosted}{job.validThrough ? ` · Open until ${job.validThrough}` : ""}
        </p>
      )}
    </div>
  )
}
