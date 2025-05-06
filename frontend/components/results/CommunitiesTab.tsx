'use client'

import { ExternalLink } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

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

interface CommunitiesTabProps {
  communities: Community[];
  communitySizeRanking: Record<number, number>;
  expandedCommunities: Record<number, number>;
  communityColors: Record<number, string>;
  DEFAULT_COMMUNITY_COLORS: string[];
  onExpandCommunity: (communityId: number, currentCount: number) => void;
}

export function CommunitiesTab({
  communities,
  communitySizeRanking,
  expandedCommunities,
  communityColors,
  DEFAULT_COMMUNITY_COLORS,
  onExpandCommunity
}: CommunitiesTabProps) {
  return (
    <div className="space-y-6">
      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-md mb-4 border border-blue-100 dark:border-blue-800">
        <h4 className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-1">Sobre las comunidades</h4>
        <p className="text-sm text-blue-700 dark:text-blue-200">
          Las comunidades son grupos de usuarios que interactúan más entre sí que con el resto de la red. Cada comunidad suele compartir intereses, opiniones o características comunes.
        </p>
        <p className="text-sm text-blue-700 dark:text-blue-200 mt-2">
          En el contexto de Twitter, una comunidad puede representar seguidores de una figura pública, personas que discuten un tema específico, o usuarios que comparten una ideología u opinión.
        </p>
        <p className="text-sm text-blue-700 dark:text-blue-200 mt-2">
          <strong>Nota:</strong> Las comunidades están ordenadas por tamaño total (número de usuarios). Los colores de cada comunidad coinciden con los mostrados en la visualización del grafo. Puedes hacer clic en cualquier nombre de usuario para visitar su perfil en Twitter.
        </p>
      </div>
      
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Comunidades detectadas</h3>
        <div className="text-sm text-gray-500">
          Ordenadas por tamaño total (mayor a menor)
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {communities
          ?.slice() // Crear una copia para no modificar el original
          .sort((a, b) => {
            // Usamos preferentemente size (tamaño total) y si no está disponible, la longitud de nodes
            const aSize = a.size || a.nodes?.length || 0;
            const bSize = b.size || b.nodes?.length || 0;
            return bSize - aSize; // Ordenar de mayor a menor
          })
          .map((community, index) => (
          <Card key={community.id}>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <div 
                    className="h-4 w-4 rounded-full mr-2" 
                    style={{ 
                      backgroundColor: communityColors[community.id] || 
                        DEFAULT_COMMUNITY_COLORS[community.id % DEFAULT_COMMUNITY_COLORS.length]
                    }}
                    title={`Color usado en el grafo para esta comunidad`}
                  ></div>
                  <CardTitle className="text-base">Comunidad #{index + 1}</CardTitle>
                </div>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                  {community.size || community.nodes?.length || 0} usuarios
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {community.top_nodes && community.top_nodes.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                    Usuarios influyentes en esta comunidad:
                  </h4>
                  <ul className="space-y-1.5">
                    {community.top_nodes.map((node, idx) => (
                      <li key={idx} className="flex items-center justify-between">
                        <a 
                          href={`https://twitter.com/${node.name}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm flex items-center hover:text-blue-600 dark:hover:text-blue-400"
                          title="Ver perfil de Twitter"
                        >
                          <span>@{node.name}</span>
                          <ExternalLink className="h-3 w-3 ml-1 opacity-60" />
                        </a>
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" title="Valor de relevancia (influencia en la red)">
                          {node.centrality.toFixed(4)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              <div>
                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                  Otros miembros destacados:
                  {community.size && community.nodes && community.size > community.nodes.length && (
                    <span className="text-xs ml-2 text-gray-400">
                      (mostrando {community.nodes.length} de {community.size} totales)
                    </span>
                  )}
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {/* Mostrar el número de usuarios según el estado expandido o 8 por defecto */}
                  {community.nodes.slice(0, expandedCommunities[community.id] || 8).map((node, idx) => (
                    <a 
                      key={idx} 
                      href={`https://twitter.com/${node.name}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200 hover:bg-blue-100 hover:text-blue-800 dark:hover:bg-blue-900/30 dark:hover:text-blue-200 transition-colors"
                      title="Ver perfil de Twitter"
                    >
                      <span>@{node.name}</span>
                      <ExternalLink className="h-2.5 w-2.5 ml-1 opacity-60" />
                    </a>
                  ))}
                  
                  {/* Botón "Ver más" si hay más usuarios para mostrar */}
                  {community.nodes.length > (expandedCommunities[community.id] || 8) && (
                    <button 
                      onClick={() => onExpandCommunity(community.id, community.nodes.length)}
                      className="cursor-pointer text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center px-2 py-1 bg-blue-50 dark:bg-blue-900/20 rounded-full font-medium"
                    >
                      Ver más +{Math.min(12, community.nodes.length - (expandedCommunities[community.id] || 8))}
                    </button>
                  )}
                  
                  {/* Mensaje si se están mostrando todos los usuarios disponibles pero hay más según size */}
                  {community.nodes.length <= (expandedCommunities[community.id] || 8) && 
                   community.size && community.nodes.length < community.size && (
                    <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center italic">
                      +{community.size - community.nodes.length} usuarios adicionales no están disponibles para mostrar
                    </span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
} 