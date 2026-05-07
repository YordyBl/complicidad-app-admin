import { CheckCircle2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

interface SuccessReceiptProps {
  title?: string
  children?: React.ReactNode
}

export function SuccessReceipt({
  title = 'Operación exitosa',
  children,
}: SuccessReceiptProps) {
  return (
    <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/20 dark:border-green-900">
      <CardContent className="flex flex-col items-center text-center pt-6 pb-6 gap-3">
        <CheckCircle2 className="w-10 h-10 text-green-600 dark:text-green-400" />
        <div>
          <h3 className="font-semibold text-green-800 dark:text-green-200">{title}</h3>
          {children && (
            <div className="text-sm text-green-700 dark:text-green-300 mt-2">
              {children}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
