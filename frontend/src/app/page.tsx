import { redirect } from "next/navigation"
import { backends } from "@/config/backends"

export default function Home() {
  if (backends.length > 0) {
    redirect(`/search/${backends[0].id}`)
  }
  return (
    <div className="p-8 text-center" style={{ color: "var(--muted-foreground)" }}>
      No backends configured.
    </div>
  )
}
