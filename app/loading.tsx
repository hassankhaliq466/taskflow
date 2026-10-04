import { Loader2 } from "lucide-react"

export default function Loading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 text-foreground">
      <div className="flex w-full max-w-sm flex-col items-center gap-4 text-center">
        {/* Centered White Buffer/Spinner */}
        <Loader2 className="size-18 animate-spin text-white" aria-hidden="true" />
      </div>
    </main>
  )
}
