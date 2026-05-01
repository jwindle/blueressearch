import { getIronSession, type IronSession, type SessionOptions } from "iron-session"
import { cookies } from "next/headers"

export interface SessionData {
  did?: string
  handle?: string
}

export async function getSession(): Promise<IronSession<SessionData>> {
  const cookieStore = await cookies()
  const sessionOptions: SessionOptions = {
    password: process.env.SESSION_SECRET!,
    cookieName: "blueressearch_session",
    cookieOptions: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
    },
  }
  return getIronSession<SessionData>(cookieStore, sessionOptions)
}
