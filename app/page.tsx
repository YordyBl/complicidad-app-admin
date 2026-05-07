import { redirect } from 'next/navigation'
import { getSession } from '@/shared/auth/session'

export default async function Page() {
  const session = await getSession()

  if (session) {
    redirect('/dashboard')
  }
  redirect('/login')
}
