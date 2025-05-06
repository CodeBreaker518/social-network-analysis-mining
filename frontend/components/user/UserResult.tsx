'use client'

import { Users, ExternalLink } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

interface UserInfo {
  username: string;
  name?: string;
  error?: string;
  raw_response?: any;
}

interface UserResultProps {
  userResult: UserInfo | null;
}

export function UserResult({ userResult }: UserResultProps) {
  if (!userResult) {
    return null;
  }
  
  return (
    <Card className={userResult.error ? 'border-red-300 dark:border-red-800' : 'border-green-300 dark:border-green-800'}>
      <CardContent className="pt-4">
        {userResult.error ? (
          <div className="text-sm text-red-600 dark:text-red-400">
            <p className="font-medium">Error al buscar @{userResult.username}:</p>
            <p className="break-words">{userResult.error}</p>
            {userResult.error.includes("500 Internal Server Error") && (
              <p className="mt-1 text-xs">Posible problema: El servidor no puede conectarse a la API de Twitter o el usuario no existe.</p>
            )}
            {userResult.error.includes("Límite de solicitudes") && (
              <p className="mt-1 text-xs">El límite de tasa de la API de Twitter ha sido excedido. Esto suele solucionarse en unos minutos.</p>
            )}
          </div>
        ) : (
          <div className="flex flex-col">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                <div>
                  <p className="font-medium">@{userResult.username}</p>
                  {userResult.name && <p className="text-sm text-gray-500">{userResult.name}</p>}
                </div>
              </div>
              <a 
                href={`https://twitter.com/${userResult.username}`} 
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-md text-blue-600 bg-blue-50 hover:bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30 dark:hover:bg-blue-900/50"
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                Ver perfil
              </a>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 