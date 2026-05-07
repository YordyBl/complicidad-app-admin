import type { Metadata } from 'next'
import { RegisterForm } from '@/features/auth/register/register-form'

export const metadata: Metadata = {
  title: 'Crear cuenta — Complicidad',
}

export default function RegisterPage() {
  return <RegisterForm />
}
