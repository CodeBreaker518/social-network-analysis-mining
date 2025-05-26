'use client'

import { AlertTriangle, RefreshCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface NetworkErrorProps {
  query: string;
  error: string;
  message?: string;
}

export function NetworkError({ query, error, message }: NetworkErrorProps) {
  const getErrorMessage = () => {
    if (error.includes("429") || error.includes("Too Many Requests")) {
      return {
        title: "Límite de solicitudes excedido",
        description: message || "Has alcanzado el límite de solicitudes a la API de Twitter. Por favor, espera unos minutos antes de intentar nuevamente.",
        action: "Reintentar más tarde"
      }
    }
    
    if (error.includes("503") || error.includes("temporalmente no disponible")) {
      return {
        title: "Servicio temporalmente no disponible",
        description: message || "El servicio de Twitter no está disponible en este momento. Por favor, intenta más tarde.",
        action: "Reintentar más tarde"
      }
    }
    
    return {
      title: "Error al analizar la red",
      description: message || error,
      action: "Intentar nuevamente"
    }
  }

  const errorInfo = getErrorMessage()

  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center mb-4">
        <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
      </div>
      <h3 className="text-xl font-bold text-red-600 dark:text-red-400 mb-2">
        {errorInfo.title}
      </h3>
      <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md">
        {errorInfo.description}
      </p>
      <Button 
        variant="outline"
        onClick={() => window.location.reload()}
        className="flex items-center gap-2"
      >
        <RefreshCcw className="w-4 h-4" />
        {errorInfo.action}
      </Button>
    </div>
  )
} 