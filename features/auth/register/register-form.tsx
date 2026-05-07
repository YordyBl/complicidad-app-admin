'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { UserPlus } from 'lucide-react'

import { registerRequestSchema, type RegisterRequest } from '@/shared/api/schemas'
import { registerAction } from './register-action'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FormFieldError } from '@/components/ui/form-field-error'
import Link from 'next/link'

type FormData = RegisterRequest & { confirmPassword: string }

const formSchema = registerRequestSchema.extend({
  confirmPassword: registerRequestSchema.shape.password,
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
})

export function RegisterForm() {
  const [serverError, setServerError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: '', password: '', confirmPassword: '' },
  })

  async function onSubmit(data: FormData) {
    setServerError(null)
    setIsSubmitting(true)

    try {
      const formData = new FormData()
      formData.set('email', data.email)
      formData.set('password', data.password)
      if (data.role) formData.set('role', data.role)

      const result = await registerAction(null, formData)

      if (!result.success) {
        setServerError(result.error || 'Error al crear la cuenta.')
        return
      }

      setIsSuccess(true)
    } catch {
      setServerError('Error de conexión. Verifique su red.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSuccess) {
    return (
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">¡Cuenta creada!</CardTitle>
          <CardDescription>
            Tu cuenta fue registrada exitosamente.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-sm text-muted-foreground">
            Ahora podés iniciar sesión con tu email y contraseña.
          </p>
          <Button asChild className="w-full">
            <Link href="/login">Ir al inicio de sesión</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Crear cuenta</CardTitle>
        <CardDescription>Registrate para acceder al sistema</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
              autoComplete="new-password"
              placeholder="Mínimo 6 caracteres"
              disabled={isSubmitting}
              {...register('password')}
            />
            <FormFieldError message={errors.password?.message} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
            <Input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              placeholder="Repetí la contraseña"
              disabled={isSubmitting}
              {...register('confirmPassword')}
            />
            <FormFieldError message={errors.confirmPassword?.message} />
          </div>

          <Button type="submit" className="w-full gap-2" disabled={isSubmitting}>
            <UserPlus className="w-4 h-4" />
            {isSubmitting ? 'Creando cuenta...' : 'Crear cuenta'}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            ¿Ya tenés cuenta?{' '}
            <Link href="/login" className="text-primary hover:underline font-medium">
              Iniciar sesión
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  )
}
