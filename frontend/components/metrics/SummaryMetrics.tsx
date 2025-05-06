'use client'

import { Card, CardContent } from '@/components/ui/card'

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

interface SummaryMetricsProps {
  metrics: NetworkMetrics;
  communitiesCount: number;
}

export function SummaryMetrics({ metrics, communitiesCount }: SummaryMetricsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card className="bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-100 dark:border-indigo-900">
        <CardContent className="p-4">
          <p className="text-sm font-medium text-indigo-500 dark:text-indigo-400">Usuarios</p>
          <p className="text-3xl font-semibold mt-1">{metrics?.num_nodes || 0}</p>
        </CardContent>
      </Card>
      
      <Card className="bg-blue-50/50 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900">
        <CardContent className="p-4">
          <p className="text-sm font-medium text-blue-500 dark:text-blue-400">Conexiones</p>
          <p className="text-3xl font-semibold mt-1">{metrics?.num_edges || 0}</p>
        </CardContent>
      </Card>
      
      <Card className="bg-green-50/50 dark:bg-green-950/20 border-green-100 dark:border-green-900">
        <CardContent className="p-4">
          <p className="text-sm font-medium text-green-500 dark:text-green-400">Comunidades</p>
          <p className="text-3xl font-semibold mt-1">{communitiesCount || 0}</p>
        </CardContent>
      </Card>
      
      <Card className="bg-purple-50/50 dark:bg-purple-950/20 border-purple-100 dark:border-purple-900">
        <CardContent className="p-4">
          <p className="text-sm font-medium text-purple-500 dark:text-purple-400">Tipos de conexión</p>
          <div className="mt-1 text-sm">
            {metrics?.edge_types && Object.entries(metrics.edge_types).map(([type, count]) => (
              <div key={type} className="flex justify-between">
                <span className="capitalize">{type}</span>
                <span className="font-medium">{count}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 