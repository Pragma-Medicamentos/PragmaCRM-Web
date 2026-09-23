import { Spinner } from '@/components/ui/spinner'

export function LoadingNotice({ children }: { children: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Spinner />
      {children}
    </div>
  )
}
