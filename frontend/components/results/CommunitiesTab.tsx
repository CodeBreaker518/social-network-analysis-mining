'use client'

import { ExternalLink, Users } from 'lucide-react'
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

// Tema y paleta de colores consistente
const THEME = {
  colors: {
    primary: {
      light: '#3B82F6',
      medium: '#2563EB',
      dark: '#1D4ED8',
      bg: 'from-blue-50 to-white dark:from-blue-900/40'
    },
    success: {
      light: '#10B981',
      medium: '#059669',
      dark: '#047857',
      bg: 'from-green-50 to-white dark:from-green-900/40'
    }
  },
  card: {
    base: 'border-0 shadow-lg rounded-2xl overflow-hidden transform transition-all duration-200',
    hover: 'hover:scale-[1.02] hover:shadow-xl',
    gradient: (color: string) => `bg-gradient-to-br ${color}`
  }
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
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-6 rounded-2xl border border-blue-100 dark:border-blue-800">
        <h3 className="text-xl font-bold text-blue-800 dark:text-blue-200 mb-2 flex items-center gap-2">
          <Users className="w-6 h-6" />
          Comunidades detectadas
        </h3>
        <p className="text-blue-600 dark:text-blue-300">
          Grupos de usuarios que interactúan más entre sí, ordenados por tamaño. Cada comunidad representa un grupo de interés o temática dentro de la conversación.
        </p>
      </div>

      <div className="grid gap-6">
        {communities
          ?.slice()
          .sort((a, b) => {
            const aSize = a.size || a.nodes?.length || 0;
            const bSize = b.size || b.nodes?.length || 0;
            return bSize - aSize;
          })
          .map((community, index) => {
            const communityColor = communityColors[community.id] || 
              DEFAULT_COMMUNITY_COLORS[community.id % DEFAULT_COMMUNITY_COLORS.length];
            
            return (
              <Card 
                key={community.id}
                className={`${THEME.card.base} ${THEME.card.hover} ${THEME.card.gradient(THEME.colors.primary.bg)}`}
              >
                <CardHeader className="border-b border-blue-100 dark:border-blue-800 pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold"
                        style={{ 
                          backgroundColor: `${communityColor}20`,
                          color: communityColor
                        }}
                      >
                        #{index + 1}
                      </div>
                      <div>
                        <CardTitle className="text-lg">
                          Comunidad {communitySizeRanking[community.id] || index + 1}
                        </CardTitle>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {community.size || community.nodes?.length || 0} miembros
                        </p>
                      </div>
                    </div>
                    <span 
                      className="px-3 py-1.5 rounded-full text-sm font-medium"
                      style={{ 
                        backgroundColor: `${communityColor}15`,
                        color: communityColor
                      }}
                    >
                      Grupo #{communitySizeRanking[community.id] || index + 1}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  {community.top_nodes && community.top_nodes.length > 0 && (
                    <div className="mb-6">
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                        Usuarios más influyentes
                      </h4>
                      <div className="grid gap-2">
                        {community.top_nodes.map((node, idx) => (
                          <div 
                            key={idx} 
                            className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-gray-800 shadow-sm"
                          >
                            <a 
                              href={`https://twitter.com/${node.name}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline"
                            >
                              <span 
                                className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                                style={{ 
                                  backgroundColor: `${communityColor}20`,
                                  color: communityColor
                                }}
                              >
                                {idx + 1}
                              </span>
                              @{node.name}
                            </a>
                            <div className="flex items-center gap-2">
                              <span 
                                className="px-2 py-1 rounded-full text-xs font-medium"
                                style={{ 
                                  backgroundColor: `${communityColor}15`,
                                  color: communityColor
                                }}
                              >
                                {node.centrality.toFixed(4)}
                              </span>
                              <a
                                href={`https://twitter.com/${node.name}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      Miembros de la comunidad
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {community.nodes.slice(0, expandedCommunities[community.id] || 8).map((node, idx) => (
                        <a 
                          key={idx} 
                          href={`https://twitter.com/${node.name}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm transition-colors"
                          style={{ 
                            backgroundColor: `${communityColor}15`,
                            color: communityColor
                          }}
                        >
                          @{node.name}
                          <ExternalLink className="w-3 h-3 ml-1" />
                        </a>
                      ))}
                      {community.nodes.length > (expandedCommunities[community.id] || 8) && (
                        <button 
                          onClick={() => onExpandCommunity(community.id, community.nodes.length)}
                          className="cursor-pointer text-sm font-medium flex items-center px-3 py-1.5 rounded-full transition-colors"
                          style={{ 
                            backgroundColor: `${communityColor}10`,
                            color: communityColor
                          }}
                        >
                          Ver +{Math.min(12, community.nodes.length - (expandedCommunities[community.id] || 8))}
                        </button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
      </div>
    </div>
  );
} 