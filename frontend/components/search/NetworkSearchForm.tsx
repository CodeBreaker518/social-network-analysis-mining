'use client'

import { useState } from 'react'
import { Network, Loader2, Search, HelpCircle } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface NetworkSearchFormProps {
  query: string;
  maxTweets: number;
  loading: boolean;
  backendConnected: boolean;
  onQueryChange: (query: string) => void;
  onMaxTweetsChange: (maxTweets: number) => void;
  onSubmit: () => void;
}

export function NetworkSearchForm({
  query,
  maxTweets,
  loading,
  backendConnected,
  onQueryChange,
  onMaxTweetsChange,
  onSubmit
}: NetworkSearchFormProps) {
  return (
    <div className="bg-gradient-to-br from-blue-50 to-white dark:from-blue-900/30 dark:to-gray-950 border-0 shadow-xl rounded-2xl p-8 flex flex-col gap-6 items-center w-full">
      <div className="flex flex-col items-center gap-2 w-full">
        <div className="flex items-center gap-2 mb-2">
          <Search className="h-7 w-7 text-blue-500" />
          <span className="text-lg font-bold text-blue-700 dark:text-blue-200">Buscar tema o hashtag</span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-5 w-5 ml-1.5 text-gray-400 cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="font-medium">Formato de búsqueda:</p>
                <ul className="mt-1 text-xs space-y-1">
                  <li><strong>#hashtag</strong> - Busca tweets con ese hashtag específico</li>
                  <li><strong>@usuario</strong> - Busca menciones a ese usuario específico</li>
                  <li><strong>palabra</strong> - Busca ese término en el contenido de los tweets</li>
                </ul>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <Input
          type="text"
          placeholder="Ej: #política, tecnología, @usuario..."
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          className="w-full max-w-lg shadow-md text-base px-4 py-2 rounded-lg border border-blue-200 focus:border-blue-400"
        />
      </div>
      <div className="flex flex-col sm:flex-row items-center gap-4 w-full justify-center">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Máx. tweets:</label>
          <Input
            type="number"
            min="10"
            max="500"
            className="w-24 shadow-sm border border-blue-200 focus:border-blue-400"
            value={maxTweets}
            onChange={(e) => onMaxTweetsChange(Number(e.target.value))}
          />
        </div>
        <Button
          onClick={onSubmit}
          disabled={loading || !backendConnected}
          className="flex items-center gap-2 px-6 py-2 text-base font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-md transition"
        >
          {loading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Analizando...
            </>
          ) : !backendConnected ? (
            <>
              <Network className="h-5 w-5" />
              Servidor desconectado
            </>
          ) : (
            <>
              <Network className="h-5 w-5" />
              Analizar Red
            </>
          )}
        </Button>
      </div>
    </div>
  );
} 