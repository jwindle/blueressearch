import "server-only"

import { cookies } from "next/headers"
import { prisma } from "@/lib/prisma"

const ACTOR_COOKIE = "br_actor_id"
const ACTOR_COOKIE_MAX_AGE = 60 * 60 * 24 * 365

export type UsageEvent =
  | "simple_search"
  | "top_k_search"
  | "embed_document"
  | "text_to_job_post"
  | "text_to_resume"
  | "add_document"

export async function getOrCreateActor() {
  const cookieStore = await cookies()
  const actorId = cookieStore.get(ACTOR_COOKIE)?.value

  if (actorId) {
    const actor = await prisma.actor
      .update({
        where: { id: actorId },
        data: { lastSeenAt: new Date() },
      })
      .catch(() => null)

    if (actor?.active) return actor
  }

  const actor = await prisma.actor.create({
    data: {
      kind: "anonymous",
      role: "anonymous",
    },
  })

  cookieStore.set(ACTOR_COOKIE, actor.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: ACTOR_COOKIE_MAX_AGE,
    path: "/",
  })

  return actor
}

export async function incrementUsage(actorId: string, eventName: UsageEvent) {
  await prisma.usageCounter.upsert({
    where: {
      actorId_eventName: {
        actorId,
        eventName,
      },
    },
    create: {
      actorId,
      eventName,
      count: 1,
    },
    update: {
      count: { increment: 1 },
    },
  })
}

export async function trackUsage(eventName: UsageEvent) {
  const actor = await getOrCreateActor()
  await incrementUsage(actor.id, eventName)
  return actor
}
