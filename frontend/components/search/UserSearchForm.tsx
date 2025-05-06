'use client'

import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface UserSearchFormProps {
  username: string;
  onUsernameChange: (username: string) => void;
  onSubmit: () => void;
  backendConnected: boolean;
}

export function UserSearchForm({
  username,
  onUsernameChange,
  onSubmit,
  backendConnected
}: UserSearchFormProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">
          Buscar usuario específico
        </label>
        <div className="flex space-x-2">
          <Input
            type="text"
            placeholder="Nombre de usuario"
            value={username}
            onChange={(e) => onUsernameChange(e.target.value)}
          />
          <Button variant="outline" onClick={onSubmit} disabled={!backendConnected}>
            {!backendConnected ? (
              <>
                <Search className="h-4 w-4 mr-2" />
                Servidor desconectado
              </>
            ) : (
              <>
                <Search className="h-4 w-4 mr-2" />
                Buscar
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
} 