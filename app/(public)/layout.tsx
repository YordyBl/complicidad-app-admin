/**
 * Public layout — wraps login and register pages.
 * Redirects authenticated users to dashboard.
 */

import { redirectIfAuthenticated } from '@/shared/auth/session'

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await redirectIfAuthenticated()

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30">
      <div className="w-full max-w-md px-4">{children}</div>
    </div>
  )
}
