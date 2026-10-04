import Link from "next/link"
import { ArrowLeft, SearchX } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 text-foreground">
      <div className="flex w-full max-w-md flex-col items-center gap-6 text-center">
        <div className="flex size-16 items-center justify-center rounded-2xl border border-border bg-card text-primary shadow-sm">
          <SearchX className="size-7" aria-hidden="true" />
        </div>
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-primary">404</p>
          <h1 className="text-3xl font-semibold tracking-tight">Page not found</h1>
          <p className="text-sm leading-6 text-muted-foreground">The page you are looking for may have moved, been removed, or never existed.</p>
        </div>
        <Link href="/dashboard" className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:pointer-events disabled:opacity-50">
          <ArrowLeft data-icon="inline-start" />
          Back to dashboard
        </Link>
      </div>
    </main>
  )
}
