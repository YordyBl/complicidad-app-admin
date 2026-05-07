import type { Metadata } from 'next'
import { LoginForm } from '@/features/auth/login/login-form'

export const metadata: Metadata = {
  title: 'Ingresar — Complicidad',
}

export default function LoginPage() {
  return <LoginForm />
}
