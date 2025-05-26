'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Users, Share2, Network, BarChart3 } from 'lucide-react'

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
    },
    info: {
      light: '#6366F1',
      medium: '#4F46E5',
      dark: '#4338CA',
      bg: 'from-indigo-50 to-white dark:from-indigo-900/40'
    },
    accent: {
      light: '#8B5CF6',
      medium: '#7C3AED',
      dark: '#6D28D9',
      bg: 'from-violet-50 to-white dark:from-violet-900/40'
    }
  }
}

export function SummaryMetrics({ metrics, communitiesCount }: SummaryMetricsProps) {
  const metricsData = [
    {
      title: 'Usuarios únicos',
      value: metrics?.num_nodes || 0,
      icon: Users,
      color: 'primary',
      description: 'Total de usuarios en la red'
    },
    {
      title: 'Conexiones',
      value: metrics?.num_edges || 0,
      icon: Share2,
      color: 'info',
      description: 'Interacciones entre usuarios'
    },
    {
      title: 'Comunidades',
      value: communitiesCount || 0,
      icon: Network,
      color: 'success',
      description: 'Grupos detectados'
    },
    {
      title: 'Tipos de conexión',
      value: Object.keys(metrics?.edge_types || {}).length,
      icon: BarChart3,
      color: 'accent',
      description: 'Formas de interacción'
    }
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {metricsData.map((metric, index) => {
        const colorTheme = THEME.colors[metric.color as keyof typeof THEME.colors]
        return (
          <Card 
            key={index} 
            className={`bg-gradient-to-br ${colorTheme.bg} border-0 shadow-lg rounded-2xl transform transition-all duration-200 hover:scale-[1.02] hover:shadow-xl`}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center`} style={{ backgroundColor: `${colorTheme.light}20` }}>
                  <metric.icon className="w-6 h-6" style={{ color: colorTheme.medium }} />
                </div>
                <span 
                  className="text-xs font-light px-2 py-1 rounded-full"
                  style={{ 
                    backgroundColor: `${colorTheme.light}15`,
                    color: colorTheme.dark
                  }}
                >
                  {metric.description}
                </span>
              </div>
              <h3 className="text-3xl font-bold mb-1" style={{ color: colorTheme.dark }}>
                {metric.value.toLocaleString()}
              </h3>
              <p className="text-sm font-medium" style={{ color: colorTheme.medium }}>
                {metric.title}
              </p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  );
} 