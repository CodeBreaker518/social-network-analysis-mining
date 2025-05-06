'use client'

import { ExternalLink } from 'lucide-react'
import { Card } from '@/components/ui/card'

interface InfluentialUser {
  id: string;
  name: string;
  centrality: number;
}

interface Community {
  id: number;
  size: number;
  nodes: Array<{
    id: string;
    name: string;
  }>;
  top_nodes?: Array<{
    id: string;
    name: string;
    centrality: number;
  }>;
}

interface InfluentialUsersTabProps {
  influentialUsers: InfluentialUser[];
  communities: Community[];
  communitySizeRanking: Record<number, number>;
  DEFAULT_COMMUNITY_COLORS: string[];
}

export function InfluentialUsersTab({ 
  influentialUsers, 
  communities, 
  communitySizeRanking,
  DEFAULT_COMMUNITY_COLORS
}: InfluentialUsersTabProps) {
  return (
    <div className="space-y-4">
      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-md mb-4 border border-blue-100 dark:border-blue-800">
        <h4 className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-1">Sobre los usuarios influyentes</h4>
        <p className="text-sm text-blue-700 dark:text-blue-200">
          Los usuarios influyentes son aquellos que tienen mayor impacto en la conversación. Pueden ser cuentas con muchos seguidores, pero también usuarios que conectan diferentes comunidades o que generan contenido que se comparte frecuentemente.
        </p>
        <p className="text-sm text-blue-700 dark:text-blue-200 mt-2">
          <strong>La centralidad</strong> es una medida matemática que indica la importancia estructural de un usuario en la red. Se basa en factores como la cantidad de conexiones y su posición estratégica en la red conversacional.
        </p>
      </div>
      
      <h3 className="text-lg font-medium mb-3">Ranking de usuarios por influencia</h3>
      <Card>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4 font-medium text-xs uppercase tracking-wider">Ranking</th>
                <th className="text-left py-3 px-4 font-medium text-xs uppercase tracking-wider">Usuario</th>
                <th className="text-left py-3 px-4 font-medium text-xs uppercase tracking-wider">
                  <div className="flex items-center">
                    <span>Centralidad</span>
                    <span className="ml-1 text-xs text-gray-400 font-normal">(mayor = más influyente)</span>
                  </div>
                </th>
                <th className="text-left py-3 px-4 font-medium text-xs uppercase tracking-wider">Comunidad</th>
                <th className="text-left py-3 px-4 font-medium text-xs uppercase tracking-wider">
                  <div className="flex items-center">
                    <span>Conexiones</span>
                    <span className="ml-1 text-xs text-gray-400 font-normal">(estimadas)</span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {influentialUsers?.map((user, index) => (
                <tr key={index} className={`border-b ${index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-700/50'}`}>
                  <td className="px-4 py-3 text-sm">{index + 1}</td>
                  <td className="px-4 py-3 text-sm">
                    <a 
                      href={`https://twitter.com/${user.name}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center hover:text-blue-600 dark:hover:text-blue-400"
                    >
                      @{user.name}
                      <ExternalLink className="h-3 w-3 ml-1 opacity-60" />
                    </a>
                  </td>
                  <td className="px-4 py-3 text-sm">{user.centrality.toFixed(4)}</td>
                  <td className="px-4 py-3">
                    {(() => {
                      // Buscar a qué comunidad pertenece este usuario - buscar por ID o por nombre
                      let userCommunity = communities?.find(community => 
                        // Buscar en los nodos regulares
                        community.nodes.some(node => 
                          node.id === user.id || node.name === user.name
                        ) ||
                        // También buscar en los nodos top/influyentes de cada comunidad
                        (community.top_nodes && community.top_nodes.some(node => 
                          node.id === user.id || node.name === user.name
                        ))
                      );
                      
                      if (userCommunity) {
                        return (
                          <div className="flex items-center">
                            <div 
                              className="h-3 w-3 rounded-full mr-2" 
                              style={{ 
                                backgroundColor: DEFAULT_COMMUNITY_COLORS[userCommunity.id % DEFAULT_COMMUNITY_COLORS.length]
                              }}
                            ></div>
                            <span className="text-sm">
                              #{communitySizeRanking[userCommunity.id] || userCommunity.id + 1}
                            </span>
                          </div>
                        );
                      }
                      return <span className="text-gray-400 text-xs">No identificada</span>;
                    })()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="space-y-1">
                      {/* Las conexiones son una estimación basada en la centralidad */}
                      <div className="flex items-center text-xs">
                        <span className="inline-block w-20">Recibidas:</span>
                        <div className="w-full max-w-[100px] h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-blue-500 rounded-full" 
                            style={{width: `${Math.min(100, user.centrality * 200)}%`}}
                          ></div>
                        </div>
                        <span className="ml-2 text-xs">{Math.round(user.centrality * 20)}</span>
                      </div>
                      <div className="flex items-center text-xs">
                        <span className="inline-block w-20">Interacciones:</span>
                        <div className="flex space-x-1">
                          <span className="px-1.5 py-0.5 rounded-sm bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">RT</span>
                          <span className="px-1.5 py-0.5 rounded-sm bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">@</span>
                          <span className="px-1.5 py-0.5 rounded-sm bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300">↩️</span>
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      
      <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-md text-sm mt-4">
        <h4 className="font-medium mb-2">¿Cómo se determina la influencia de un usuario?</h4>
        <p className="text-gray-600 dark:text-gray-300 mb-3">
          Los usuarios se consideran influyentes por varios factores:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h5 className="font-medium text-sm mb-1">Centralidad</h5>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Mide cuán conectado está un usuario con el resto de la red. Valores más altos indican usuarios que son "puentes" importantes entre diferentes partes de la conversación.
            </p>
          </div>
          <div>
            <h5 className="font-medium text-sm mb-1">Comunidad</h5>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Indica a qué grupo de usuarios interconectados pertenece. Usuarios de la misma comunidad suelen compartir intereses o perspectivas.
            </p>
          </div>
          <div>
            <h5 className="font-medium text-sm mb-1">Conexiones recibidas</h5>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Estimación de cuántos usuarios han interactuado con este usuario mediante retweets, menciones, citas o respuestas.
            </p>
          </div>
          <div>
            <h5 className="font-medium text-sm mb-1">Tipos de interacción</h5>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              <span className="inline-block px-1.5 mr-1 rounded-sm bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">RT</span>: Retweets
              <span className="inline-block px-1.5 mx-1 rounded-sm bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">@</span>: Menciones
              <span className="inline-block px-1.5 mx-1 rounded-sm bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">↩️</span>: Respuestas
            </p>
          </div>
        </div>
        <div className="mt-3 text-xs text-gray-500 dark:text-gray-400 italic">
          Nota: El análisis está basado en los tweets disponibles por la API de Twitter. Algunas métricas son estimaciones derivadas del análisis de centralidad.
          {influentialUsers?.some(user => {
            // Verificar si hay algún usuario sin comunidad identificada
            const hasCommunity = communities?.some(community => 
              community.nodes.some(node => node.id === user.id || node.name === user.name) ||
              (community.top_nodes && community.top_nodes.some(node => node.id === user.id || node.name === user.name))
            );
            return !hasCommunity;
          }) && (
            <p className="mt-2">
              Algunos usuarios influyentes podrían no tener una comunidad asignada por limitaciones de la API. Esto ocurre cuando analizamos solo una muestra de tweets y algunos usuarios influyentes no aparecen en los datos de comunidades.
            </p>
          )}
        </div>
      </div>
    </div>
  );
} 