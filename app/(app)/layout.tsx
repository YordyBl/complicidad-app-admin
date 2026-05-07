/**
 * Protected app layout — requires valid frontend session.
 *
 * IMPORTANT: This is UX protection only. The backend currently
 * has NO auth/RBAC middleware enforced. Do not treat this as security.
 * See: shared/auth/session.ts — KNOWN BACKEND GAP documentation.
 */

import { requireSession } from '@/shared/auth/session'
import { AppSidebar } from '@/components/navigation/app-sidebar'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Redirects to /login if no session
  await requireSession()

  return <AppSidebar>{children}</AppSidebar>
}
