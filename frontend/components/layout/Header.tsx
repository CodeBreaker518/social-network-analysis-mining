'use client'

import { useState } from 'react'
import { Network, Share2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ApiHealth {
  status: string;
  api_status: string;
  api_error?: string;
  message?: string;
}

interface HeaderProps {
  backendConnected: boolean;
  apiHealth: ApiHealth | null;
  checkingApiHealth: boolean;
  onCheckApiHealth: () => void;
}

export function Header({ 
  backendConnected,
  apiHealth,
  checkingApiHealth,
  onCheckApiHealth
}: HeaderProps) {
  return (
    <header className="border-b">
      <div className="container mx-auto py-4 px-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <Network className="h-6 w-6 text-indigo-600" />
            <h1 className="text-xl font-bold">Analisis de Red Social - X/Twitter</h1>
          </div>
          
          <div className="flex flex-col space-y-2">
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${backendConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-sm">
                {backendConnected ? 'Servidor conectado' : 'Servidor desconectado'}
              </span>
              <Button 
                variant="outline" 
                size="sm"
                onClick={onCheckApiHealth}
                disabled={checkingApiHealth}
              >
                {checkingApiHealth ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Share2 className="h-4 w-4 mr-1" />
                )}
                Verificar API
              </Button>
            </div>
            {apiHealth && (
              <div className="flex items-center space-x-2 text-sm">
                <div className={`w-3 h-3 rounded-full ${
                  apiHealth.api_status === 'ok' ? 'bg-green-500' : 
                  apiHealth.api_status === 'rate_limited' ? 'bg-yellow-500' : 'bg-red-500'
                }`}></div>
                <span>
                  {apiHealth.api_status === 'ok' ? 'API de Twitter: OK' : 
                   apiHealth.api_status === 'rate_limited' ? 'API de Twitter: Límite de tasa excedido' : 
                   apiHealth.api_status === 'not_configured' ? 'API de Twitter: No configurada' : 
                   'API de Twitter: Error de conexión'}
                   {apiHealth.api_status === 'rate_limited' && (
                    <span className="ml-1 text-yellow-600 dark:text-yellow-400 font-medium">(Espera unos minutos)</span>
                   )}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
} 