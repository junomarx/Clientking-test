import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"
import { CheckCircle, XCircle, AlertCircle, Info } from "lucide-react"

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, variant, ...props }) {
        // Bestimme das passende Icon basierend auf der Variante
        let Icon = null;
        
        if (variant === "success") {
          Icon = <CheckCircle className="h-5 w-5 text-green-500" />;
        } else if (variant === "destructive") {
          Icon = <XCircle className="h-5 w-5 text-red-500" />;
        } else if (variant === "warning") {
          Icon = <AlertCircle className="h-5 w-5 text-yellow-500" />;
        } else if (variant === "info") {
          Icon = <Info className="h-5 w-5 text-blue-500" />;
        }
        
        return (
          <Toast key={id} variant={variant} {...props}>
            <div className="flex gap-3">
              {Icon && <div className="mt-1">{Icon}</div>}
              <div className="grid gap-1">
                {title && <ToastTitle>{title}</ToastTitle>}
                {description && (
                  <ToastDescription>{description}</ToastDescription>
                )}
              </div>
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
