'use client'

interface NetworkErrorProps {
  query: string;
  error: string;
  message?: string;
}

export function NetworkError({ query, error, message }: NetworkErrorProps) {
  return (
    <div className="bg-red-50 dark:bg-red-900/30 p-4 rounded-md">
      <h3 className="text-red-700 dark:text-red-300 font-medium mb-2">Error al analizar "{query}"</h3>
      <p className="text-red-700 dark:text-red-300">{message || error}</p>
      {error?.includes("500 Internal Server Error") && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">
          Esto puede deberse a limitaciones de la API de Twitter o a que no hay suficientes datos para el análisis.
          Intente con otro tema o con un número menor de tweets.
        </p>
      )}
      {error?.includes("Límite de solicitudes") && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">
          Has alcanzado el límite de solicitudes a la API de Twitter. Este límite se restablece automáticamente
          después de un tiempo. Por favor, espera unos minutos antes de intentar nuevamente.
        </p>
      )}
    </div>
  );
} 