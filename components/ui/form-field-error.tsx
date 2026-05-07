interface FormFieldErrorProps {
  message?: string
}

export function FormFieldError({ message }: FormFieldErrorProps) {
  if (!message) return null
  return (
    <p className="text-sm text-destructive mt-1" role="alert">
      {message}
    </p>
  )
}
