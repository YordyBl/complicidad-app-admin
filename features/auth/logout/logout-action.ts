'use server'

import { clearSession } from '@/shared/auth/session'
import { redirect } from 'next/navigation'

/**
 * Server Action: clear the session cookie and redirect to login.
 */
export async function logoutAction(): Promise<never> {
  await clearSession()
  redirect('/login')
}
