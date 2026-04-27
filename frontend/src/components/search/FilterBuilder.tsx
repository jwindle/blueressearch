"use client"

import type { SearchableField, FilterCondition } from "@/types/api"

interface Props {
  fields: SearchableField[]
  filters: FilterCondition[]
  onChange: (filters: FilterCondition[]) => void
}

export function FilterBuilder({ fields, filters, onChange }: Props) {
  function add() {
    if (fields.length === 0) return
    onChange([...filters, { field: fields[0].name, operator: fields[0].suggested_operators[0], value: "" }])
  }

  function remove(i: number) {
    onChange(filters.filter((_, idx) => idx !== i))
  }

  function update(i: number, patch: Partial<FilterCondition>) {
    onChange(filters.map((f, idx) => idx === i ? { ...f, ...patch } : f))
  }

  function operatorsFor(fieldName: string) {
    return fields.find(f => f.name === fieldName)?.suggested_operators ?? []
  }

  return (
    <div className="space-y-2">
      {filters.map((f, i) => (
        <div key={i} className="flex gap-2 items-center">
          <select
            value={f.field}
            onChange={e => update(i, { field: e.target.value, operator: operatorsFor(e.target.value)[0], value: "" })}
            className="text-sm rounded border px-2 py-1.5 flex-1"
            style={{ background: "var(--muted)", borderColor: "var(--border)", color: "var(--foreground)" }}
          >
            {fields.map(field => (
              <option key={field.name} value={field.name}>{field.name}</option>
            ))}
          </select>

          {f.operator === "ilike" ? (
            <span className="text-sm px-1" style={{ color: "var(--muted-foreground)" }}>matches</span>
          ) : (
            <select
              value={f.operator}
              onChange={e => update(i, { operator: e.target.value })}
              className="text-sm rounded border px-2 py-1.5"
              style={{ background: "var(--muted)", borderColor: "var(--border)", color: "var(--foreground)" }}
            >
              {operatorsFor(f.field).map(op => (
                <option key={op} value={op}>{op}</option>
              ))}
            </select>
          )}

          <input
            value={String(f.value)}
            onChange={e => update(i, { value: e.target.value })}
            placeholder={f.operator === "ilike" ? "e.g. %python%" : "value"}
            className="text-sm rounded border px-2 py-1.5 flex-1"
            style={{ background: "var(--muted)", borderColor: "var(--border)", color: "var(--foreground)" }}
          />

          <button
            onClick={() => remove(i)}
            className="text-sm px-2 py-1.5 rounded hover:opacity-70"
            style={{ color: "var(--muted-foreground)" }}
          >
            ✕
          </button>
        </div>
      ))}

      {fields.length > 0 && (
        <button
          onClick={add}
          className="text-sm px-3 py-1.5 rounded border hover:opacity-80"
          style={{ borderColor: "var(--border)", color: "var(--muted-foreground)" }}
        >
          + Add filter
        </button>
      )}
    </div>
  )
}
