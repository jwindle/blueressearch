export function advancedEnabled(): boolean {
  return process.env.ENABLE_ADVANCED === "true"
}
