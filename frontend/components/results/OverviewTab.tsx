'use client'

import { Card } from '@/components/ui/card'

interface NetworkMetrics {
  num_nodes: number;
  num_edges: number;
  edge_types: Record<string, number>;
  influential_nodes: Array<{
    id: string;
    name: string;
    centrality: number;
  }>;
}

interface OverviewTabProps {
  query: string;
  metrics: NetworkMetrics;
  communitiesCount: number;
  mostInfluential: Array<{
    id: string;
    name: string;
    centrality: number;
  }>;
}

export function OverviewTab({ query, metrics, communitiesCount, mostInfluential }: OverviewTabProps) {
  return (
    <div className="space-y-6">
      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-md mb-4 border border-blue-100 dark:border-blue-800">
        <h4 className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-1">Contenido de esta página</h4>
        <p className="text-sm text-blue-700 dark:text-blue-200">
          Esta página muestra un análisis de conversaciones en Twitter relacionadas con <strong>"{query}"</strong>. 
          El análisis identifica usuarios importantes, grupos de interacción (comunidades) y cómo se conectan entre sí.
        </p>
      </div>
      
      <div>
        <h3 className="text-lg font-medium mb-2">Resumen del análisis</h3>
        <p className="text-gray-600 dark:text-gray-300">
          Se analizaron {metrics?.num_nodes || 0} usuarios con {metrics?.num_edges || 0} conexiones entre ellos.
          Se detectaron {communitiesCount || 0} comunidades distintas.
        </p>
        <div className="mt-3 text-sm text-gray-600 dark:text-gray-400 space-y-2">
          <p><strong>Comunidades:</strong> Grupos de usuarios que interactúan más entre sí que con el resto de la red. Cada comunidad suele representar grupos de interés, opinión o temática dentro de la conversación.</p>
          <p><strong>Conexiones:</strong> Interacciones entre usuarios como retweets, menciones, citas o respuestas.</p>
        </div>
      </div>
      
      <div>
        <h3 className="text-lg font-medium mb-3">Top 5 usuarios más influyentes</h3>
        <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-md mb-3 text-sm">
          <p className="text-gray-600 dark:text-gray-300">
            <strong>Significado de "influencia":</strong> La medida de "relevancia" (centralidad) indica la importancia de un usuario en la red. Un valor más alto significa que el usuario tiene más conexiones relevantes o está ubicado estratégicamente en la red conversacional.
          </p>
        </div>
        <Card>
          <ul className="divide-y">
            {mostInfluential?.slice(0, 5).map((user, index) => (
              <li key={index} className="px-4 py-3 flex items-center justify-between">
                <div className="flex items-center">
                  <span className="flex items-center justify-center h-6 w-6 rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-900 dark:text-indigo-300 text-xs mr-3">
                    {index + 1}
                  </span>
                  <p className="font-medium">@{user.name}</p>
                </div>
                <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" title="Valor de relevancia (mide la influencia del usuario en la red)">
                  {user.centrality.toFixed(4)}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
} 