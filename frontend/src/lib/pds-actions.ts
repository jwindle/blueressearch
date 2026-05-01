"use server"

import { getAgent } from "./atproto"
import { getSession } from "./auth"

const RESUME_NSID = "org.blueres.resume.resume"
const JOB_POST_NSID = "org.blueres.jobs.jobPost"

export async function publishResume(
  record: Record<string, unknown>,
): Promise<{ rkey: string } | { error: string }> {
  const session = await getSession()
  if (!session.did) return { error: "Not signed in" }

  const agent = await getAgent()
  if (!agent) return { error: "Could not restore Bluesky session" }

  try {
    const meta = (record.meta as Record<string, unknown>) ?? {}
    const normalized = {
      ...record,
      meta: {
        ...meta,
        active: meta.active ?? false,
        lastModified: new Date().toISOString(),
      },
    }

    const result = await agent.com.atproto.repo.createRecord({
      repo: session.did,
      collection: RESUME_NSID,
      record: { $type: RESUME_NSID, ...normalized },
    })

    const rkey = result.data.uri.split("/").pop()!
    return { rkey }
  } catch (e) {
    console.error("[publishResume] failed:", e)
    return { error: String(e) }
  }
}

export async function publishJobPost(
  record: Record<string, unknown>,
): Promise<{ rkey: string } | { error: string }> {
  const session = await getSession()
  if (!session.did) return { error: "Not signed in" }

  if (!record.postName) {
    return { error: 'Missing required field "postName". Add it to your job post JSON and try again.' }
  }

  const agent = await getAgent()
  if (!agent) return { error: "Could not restore Bluesky session" }

  try {
    const today = new Date().toISOString().split("T")[0]
    const normalized = {
      ...record,
      datePosted: record.datePosted ?? today,
      active: record.active ?? false,
    }

    const result = await agent.com.atproto.repo.createRecord({
      repo: session.did,
      collection: JOB_POST_NSID,
      record: { $type: JOB_POST_NSID, ...normalized },
    })

    const rkey = result.data.uri.split("/").pop()!
    return { rkey }
  } catch (e) {
    console.error("[publishJobPost] failed:", e)
    return { error: String(e) }
  }
}
