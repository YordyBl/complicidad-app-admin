'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { LogIn } from 'lucide-react'

import { loginRequestSchema, type LoginRequest } from '@/shared/api/schemas'
import { loginAction } from './login-action'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FormFieldError } from '@/components/ui/form-field-error'
import Link from 'next/link'

type FormData = LoginRequest

export function LoginForm() {
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(loginRequestSchema),
    defaultValues: { email: '', password: '' },
  })

  async function onSubmit(data: FormData) {
    setServerError(null)
    setIsSubmitting(true)

    try {
      const formData = new FormData()
      formData.set('email', data.email)
      formData.set('password', data.password)

      const result = await loginAction(null, formData)

      if (!result.success) {
        setServerError(result.error || 'Error al iniciar sesión.')
        return
      }

      router.push('/dashboard')
      router.refresh()
    } catch {
      setServerError('Error de conexión. Verifique su red.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Complicidad</CardTitle>
        <CardDescription>Ingresá a tu cuenta para continuar</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Server error banner */}
          {serverError && (
            <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm" role="alert">
              {serverError}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="tu@email.com"
              disabled={isSubmitting}
              {...register('email')}
            />
            <FormFieldError message={errors.email?.message} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              disabled={isSubmitting}
              {...register('password')}
            />
            <FormFieldError message={errors.password?.message} />
          </div>

          <Button type="submit" className="w-full gap-2" disabled={isSubmitting}>
            <LogIn className="w-4 h-4" />
            {isSubmitting ? 'Ingresando...' : 'Ingresar'}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            ¿No tenés cuenta?{' '}
            <Link href="/register" className="text-primary hover:underline font-medium">
              Registrate
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  )
}
