'use client'

import { ExternalLink, Crown, Users } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'

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

// Tema y paleta de colores consistente
const THEME = {
  colors: {
    primary: {
      light: '#3B82F6',
      medium: '#2563EB',
      dark: '#1D4ED8',
      bg: 'from-blue-50 to-white dark:from-blue-900/40'
    },
    warning: {
      light: '#F59E0B',
      medium: '#D97706',
      dark: '#B45309',
      bg: 'from-amber-50 to-white dark:from-amber-900/40'
    }
  },
  card: {
    base: 'border-0 shadow-lg rounded-2xl overflow-hidden transform transition-all duration-200',
    hover: 'hover:scale-[1.02] hover:shadow-xl',
    gradient: (color: string) => `bg-gradient-to-br ${color}`
  }
}

export function InfluentialUsersTab({ 
  influentialUsers, 
  communities, 
  communitySizeRanking,
  DEFAULT_COMMUNITY_COLORS
}: InfluentialUsersTabProps) {
  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 p-6 rounded-2xl border border-amber-100 dark:border-amber-800">
        <h3 className="text-xl font-bold text-amber-800 dark:text-amber-200 mb-2 flex items-center gap-2">
          <Crown className="w-6 h-6" />
          Usuarios más influyentes
        </h3>
        <p className="text-amber-600 dark:text-amber-300">
          Los usuarios con mayor impacto y centralidad en la red, ordenados por su nivel de influencia en la conversación.
        </p>
      </div>

      <Card className={`${THEME.card.base} ${THEME.card.hover} ${THEME.card.gradient(THEME.colors.primary.bg)}`}>
        <CardHeader className="border-b border-blue-100 dark:border-blue-800">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg text-blue-800 dark:text-blue-200">
                Ranking de influencia
              </CardTitle>
              <CardDescription className="text-blue-600 dark:text-blue-300">
                Top usuarios por centralidad en la red
              </CardDescription>
            </div>
            <span className="px-3 py-1.5 rounded-full text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
              {influentialUsers?.length || 0} usuarios
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-blue-100 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/20">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-blue-800 dark:text-blue-200 uppercase tracking-wider">
                    Ranking
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-blue-800 dark:text-blue-200 uppercase tracking-wider">
                    Usuario
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-blue-800 dark:text-blue-200 uppercase tracking-wider">
                    Centralidad
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-blue-800 dark:text-blue-200 uppercase tracking-wider">
                    Comunidad
                  </th>
                </tr>
              </thead>
              <tbody>
                {influentialUsers?.map((user, index) => {
                  const userCommunity = communities?.find(community => 
                    community.nodes.some(node => node.id === user.id || node.name === user.name) ||
                    (community.top_nodes && community.top_nodes.some(node => node.id === user.id || node.name === user.name))
                  );

                  const communityColor = userCommunity 
                    ? DEFAULT_COMMUNITY_COLORS[userCommunity.id % DEFAULT_COMMUNITY_COLORS.length]
                    : '#94a3b8';

                  return (
                    <tr 
                      key={index} 
                      className={`border-b border-blue-50 dark:border-blue-900/40 hover:bg-blue-50/30 dark:hover:bg-blue-900/20 transition-colors`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span 
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                              ${index === 0 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300' :
                                index === 1 ? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' :
                                index === 2 ? 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300' :
                                'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'}`
                            }
                          >
                            {index + 1}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <a 
                          href={`https://twitter.com/${user.name}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          @{user.name}
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </td>
                      <td className="px-4 py-3">
                        <span 
                          className="px-2 py-1 rounded-full text-xs font-medium"
                          style={{ 
                            backgroundColor: `${communityColor}20`,
                            color: communityColor
                          }}
                        >
                          {user.centrality.toFixed(4)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {userCommunity ? (
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: communityColor }}
                            />
                            <span className="text-sm text-gray-600 dark:text-gray-300">
                              #{communitySizeRanking[userCommunity.id] || userCommunity.id + 1}
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">No identificada</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 