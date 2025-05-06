'use client'

import { useState } from 'react'
import { Network, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { HelpCircle } from 'lucide-react'
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
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center">
          <label className="text-sm font-medium">
            Tema o hashtag para analizar
          </label>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-4 w-4 ml-1.5 text-gray-400 cursor-help" />
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
        />
      </div>
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <label className="text-sm whitespace-nowrap">Max. tweets:</label>
          <Input
            type="number"
            min="10"
            max="500"
            className="w-20"
            value={maxTweets}
            onChange={(e) => onMaxTweetsChange(Number(e.target.value))}
          />
        </div>
        <Button
          onClick={onSubmit}
          disabled={loading || !backendConnected}
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Analizando...
            </>
          ) : !backendConnected ? (
            <>
              <Network className="h-4 w-4 mr-2" />
              Servidor desconectado
            </>
          ) : (
            <>
              <Network className="h-4 w-4 mr-2" />
              Analizar Red
            </>
          )}
        </Button>
      </div>
    </div>
  );
} 