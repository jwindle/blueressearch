import { notFound, redirect } from "next/navigation"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

async function getAdminActor(did: string) {
  return prisma.actor.findUnique({ where: { did } })
}

async function getUsageStats() {
  const rows = await prisma.usageCounter.groupBy({
    by: ["eventName"],
    _sum: { count: true },
    orderBy: { eventName: "asc" },
  })
  return rows.map(r => ({ eventName: r.eventName, total: r._sum.count ?? 0 }))
}

export default async function Page() {
  const session = await getSession()
  if (!session.did) redirect("/sign-in")

  const actor = await getAdminActor(session.did)
  if (!actor || actor.role !== "admin") notFound()

  const stats = await getUsageStats()

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <h1 className="text-2xl font-semibold">Usage</h1>
      <table className="w-full text-sm">
        <thead>
          <tr style={{ color: "var(--muted-foreground)" }}>
            <th className="text-left font-medium pb-2">Event</th>
            <th className="text-right font-medium pb-2">Count</th>
          </tr>
        </thead>
        <tbody>
          {stats.map(({ eventName, total }) => (
            <tr key={eventName} className="border-t" style={{ borderColor: "var(--border)" }}>
              <td className="py-2 font-mono">{eventName}</td>
              <td className="py-2 text-right tabular-nums">{total.toLocaleString()}</td>
            </tr>
          ))}
          {stats.length === 0 && (
            <tr>
              <td colSpan={2} className="py-4 text-center" style={{ color: "var(--muted-foreground)" }}>
                No usage recorded yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
