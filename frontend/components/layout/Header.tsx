'use client'

import { useState } from 'react'
import { Network, Share2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import XformerlyTwitter from '../ui/twitter-logo';

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
    <header className="bg-white dark:bg-gray-950 shadow-md sticky top-0 z-50 border-b border-gray-100 dark:border-gray-800">
      <div className="container mx-auto py-4 px-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <XformerlyTwitter className="h-8 w-8 text-black bg-black p-1 rounded-sm" />
          <span className="text-2xl font-extrabold tracking-tight text-indigo-700 dark:text-indigo-300">Twitter Análisis</span>
        </div>
        <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
          <div className="flex items-center gap-2">
            <span className={`w-3 h-3 rounded-full ${backendConnected ? 'bg-green-500' : 'bg-red-500'}`}></span>
            <span className="text-sm font-medium">
              {backendConnected ? 'Backend conectado' : 'Backend desconectado'}
            </span>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={onCheckApiHealth}
            disabled={checkingApiHealth}
            className="flex items-center gap-2 border-indigo-200 dark:border-indigo-800"
          >
            {checkingApiHealth ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Share2 className="h-4 w-4" />
            )}
            <span>Verificar API</span>
          </Button>
          {apiHealth && (
            <span className={`px-2 py-1 rounded-full text-xs font-semibold ml-2 ${
              apiHealth.api_status === 'ok' ? 'bg-green-100 text-green-700' :
              apiHealth.api_status === 'rate_limited' ? 'bg-yellow-100 text-yellow-700' :
              'bg-red-100 text-red-700'
            }`}>
              {apiHealth.api_status === 'ok' ? 'API OK' :
               apiHealth.api_status === 'rate_limited' ? 'Límite de API' :
               apiHealth.api_status === 'not_configured' ? 'API no configurada' :
               'API error'}
            </span>
          )}
        </div>
      </div>
    </header>
  )
} 