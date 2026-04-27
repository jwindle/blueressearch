export interface ServerBackendConfig {
  url: string
}

const serverBackends: Record<string, ServerBackendConfig | undefined> = {
  jobs: process.env.JOBS_API_URL ? { url: process.env.JOBS_API_URL } : undefined,
  resumes: process.env.RESUMES_API_URL ? { url: process.env.RESUMES_API_URL } : undefined,
}

export function getServerBackend(backendId: string): ServerBackendConfig | null {
  return serverBackends[backendId] ?? null
}
