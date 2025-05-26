'use client'

import { useState, useEffect } from 'react'
import axios from 'axios'
import Image from "next/image"
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { 
  BarChart3, Users, Network, Search, Loader2, Share2, ExternalLink, 
  HelpCircle, Smile, Frown, Hash, Link, Lightbulb, PieChart, TrendingUp 
} from 'lucide-react'
import { PieChart as ReChartsPie, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';

import { Header } from '@/components/layout/Header'
import { BackendWarning } from '@/components/layout/BackendWarning'
import { NetworkSearchForm } from '@/components/search/NetworkSearchForm'
import { UserSearchForm } from '@/components/search/UserSearchForm'
import { UserResult } from '@/components/user/UserResult'
import { SummaryMetrics } from '@/components/metrics/SummaryMetrics'
import { OverviewTab } from '@/components/results/OverviewTab'
import { InfluentialUsersTab } from '@/components/results/InfluentialUsersTab'
import { CommunitiesTab } from '@/components/results/CommunitiesTab'
import { NetworkError } from '@/components/results/NetworkError'
import NetworkGraph from '@/components/NetworkGraph'

// Tema y paleta de colores consistente para toda la aplicación
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
    warning: {
      light: '#F59E0B',
      medium: '#D97706',
      dark: '#B45309',
      bg: 'from-amber-50 to-white dark:from-amber-900/40'
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
  },
  card: {
    base: 'border-0 shadow-lg rounded-2xl overflow-hidden',
    interactive: 'transform transition-all duration-200 hover:scale-[1.02] hover:shadow-xl',
    gradient: (color: string) => `bg-gradient-to-br ${color}`
  }
}

interface UserInfo {
  username: string;
  name?: string;
  error?: string;
  raw_response?: any;
}

interface TweetExample {
  id: string;
  text: string;
  author: string;
  author_name?: string;
  created_at?: string;
  engagement_score?: number;
  sentiment_score?: number;
}

interface NetworkInsights {
  top_hashtags: Array<{ hashtag: string; count: number }>;
  top_keywords: Array<{ word: string; count: number }>;
  top_urls: Array<{ url: string; count: number }>;
}

interface NetworkMetrics {
  query: string;
  metrics: {
    num_nodes: number;
    num_edges: number;
    edge_types: Record<string, number>;
    influential_nodes: Array<{
      id: string;
      name: string;
      full_name?: string;
      centrality: number;
      metrics?: {
        degree: number;
        betweenness: number;
        eigenvector: number;
      };
    }>;
    sentiment?: {
      positivo: number;
      negativo: number;
      neutro: number;
    };
    representative_examples?: {
      positivo?: TweetExample | null;
      negativo?: TweetExample | null;
    };
    insights?: NetworkInsights;
  };
  most_influential: Array<{
    id: string;
    name: string;
    full_name?: string;
    centrality: number;
    metrics?: {
      degree: number;
      betweenness: number;
      eigenvector: number;
    };
  }>;
  communities: Array<{
    id: number;
    name?: string;
    size: number;
    nodes: Array<{
      id: string;
      name: string;
      full_name?: string;
    }>;
    top_nodes?: Array<{
      id: string;
      name: string;
      centrality: number;
    }>;
  }>;
  error?: string;
  message?: string;
  raw_response?: any;
}

interface ApiHealth {
  status: string;
  api_status: string;
  api_error?: string;
  message?: string;
}

interface GraphNode {
  id: string;
  name: string;
  community: number;
  centrality: number;
}

interface GraphLink {
  source: string;
  target: string;
  type: string;
}

export default function Home() {
  const [username, setUsername] = useState('')
  const [userResult, setUserResult] = useState<UserInfo | null>(null)
  const [query, setQuery] = useState('')
  const [maxTweets, setMaxTweets] = useState(50)
  const [loading, setLoading] = useState(false)
  const [networkResult, setNetworkResult] = useState<NetworkMetrics | null>(null)
  const [activeTab, setActiveTab] = useState<'dashboard' | 'search'>('dashboard')
  const [activeResultTab, setActiveResultTab] = useState<'communities' | 'influential' | 'graph'>('communities')
  const [backendConnected, setBackendConnected] = useState(true)
  const [apiHealth, setApiHealth] = useState<ApiHealth | null>(null)
  const [checkingApiHealth, setCheckingApiHealth] = useState(false)
  
  // Estado para controlar cuántos usuarios mostrar por comunidad
  const [expandedCommunities, setExpandedCommunities] = useState<Record<number, number>>({})

  // Colores para las comunidades
  const DEFAULT_COMMUNITY_COLORS = [
    '#3B82F6', // Blue
    '#10B981', // Green
    '#F59E0B', // Amber
    '#8B5CF6', // Violet
    '#EC4899', // Pink
    '#F97316', // Orange
    '#14B8A6', // Teal
    '#6366F1', // Indigo
    '#ef4444', // Red
    '#84cc16', // Lime
  ]

  // Mapa de colores personalizados (vacío por defecto)
  const communityColors: Record<number, string> = {}

  // Colores para la gráfica de pastel de sentimiento
  const SENTIMENT_COLORS = ["#22c55e", "#ef4444", "#a3a3a3"];

  // Verificar la conexión con el backend al cargar el componente
  useEffect(() => {
    const checkBackendConnection = async () => {
      try {
        // Usar el endpoint simple de health en lugar de verificar user-info con HEAD
        await axios.get('http://localhost:8000/health')
        setBackendConnected(true)
      } catch (err: any) {
        if (err.code === 'ERR_NETWORK') {
          console.error('No se puede conectar al backend. Asegúrese de que esté en ejecución.')
          setBackendConnected(false)
        } else {
          console.error('Error al verificar estado del backend:', err.message)
          setBackendConnected(false)
        }
      }
    }
    
    checkBackendConnection()
  }, [])

  // Función para verificar el estado de la API de Twitter
  const checkApiHealth = async () => {
    setCheckingApiHealth(true)
    try {
      const res = await axios.get<ApiHealth>('http://localhost:8000/health')
      setBackendConnected(true)
      setApiHealth(res.data)
    } catch (err) {
      setBackendConnected(false)
      setApiHealth({ status: 'error', api_status: 'error' })
    } finally {
      setCheckingApiHealth(false)
    }
  }

  const handleUserSearch = async () => {
    if (!username.trim()) return
    
    // Evitar búsqueda si no hay conexión con el backend
    if (!backendConnected) {
      setUserResult({ 
        username, 
        error: "No se puede conectar al servidor backend. Asegúrese de que el servidor esté en ejecución en http://localhost:8000."
      });
      return;
    }
    
    console.log("Iniciando búsqueda para usuario:", username);
    
    try {
      console.log("Enviando petición al endpoint:", `http://localhost:8000/user-info?username=${username}`);
      const res = await axios.get<UserInfo>(`http://localhost:8000/user-info?username=${username}`);
      
      console.log("Respuesta recibida:", res);
      console.log("Datos de la respuesta:", res.data);
      
      // Si la respuesta contiene un campo de error, lo manejamos adecuadamente
      if (res.data.error) {
        console.log("Error detectado en la respuesta:", res.data.error);
        setUserResult({ username, name: res.data.name, error: res.data.error });
      } else {
        console.log("Búsqueda exitosa:", res.data);
        setUserResult(res.data);
      }
    } catch (err: any) {
      console.error("Error en la petición:", err);
      console.error("Mensaje de error:", err.message);
      if (err.response) {
        console.error("Datos de respuesta de error:", err.response.data);
        console.error("Estado HTTP:", err.response.status);
        console.error("Headers:", err.response.headers);
        
        // Manejar específicamente el error 429 (Too Many Requests)
        if (err.response.status === 429) {
          setUserResult({ 
            username, 
            error: "Límite de solicitudes a la API de Twitter excedido. Por favor, espera unos minutos antes de intentar nuevamente."
          });
          return;
        }
      }
      setUserResult({ username, error: err.message || 'Error desconocido' });
    }
  }

  const handleNetworkAnalysis = async () => {
    if (!query.trim()) return
    
    // Evitar búsqueda si no hay conexión con el backend
    if (!backendConnected) {
      setNetworkResult({ 
        query, 
        metrics: { num_nodes: 0, num_edges: 0, edge_types: {}, influential_nodes: [] },
        most_influential: [],
        communities: [],
        error: "No se puede conectar al servidor backend. Asegúrese de que el servidor esté en ejecución en http://localhost:8000."
      });
      return;
    }
    
    setLoading(true)
    try {
      const res = await axios.get<NetworkMetrics>(`http://localhost:8000/network_metrics/?query=${encodeURIComponent(query)}&max_tweets=${maxTweets}`)
      if (res.data.error) {
        setNetworkResult({
          query,
          metrics: { num_nodes: 0, num_edges: 0, edge_types: {}, influential_nodes: [] },
          most_influential: [],
          communities: [],
          error: res.data.error,
          message: res.data.message
        })
      } else {
        setNetworkResult(res.data)
      }
    } catch (err: any) {
      // Manejar específicamente el error 429 (Too Many Requests)
      if (err.response && err.response.status === 429) {
        setNetworkResult({ 
          query, 
          metrics: { num_nodes: 0, num_edges: 0, edge_types: {}, influential_nodes: [] },
          most_influential: [],
          communities: [],
          error: "Límite de solicitudes a la API de Twitter excedido",
          message: "Por favor, espera unos minutos antes de intentar nuevamente. La API de Twitter limita el número de solicitudes que se pueden hacer en un período de tiempo."
        });
      } else {
        setNetworkResult({ 
          query, 
          metrics: { num_nodes: 0, num_edges: 0, edge_types: {}, influential_nodes: [] },
          most_influential: [],
          communities: [],
          error: err.message || 'Error desconocido'
        });
      }
    } finally {
      setLoading(false)
    }
  }

  // Función para preparar datos para el grafo
  const prepareGraphData = () => {
    if (!networkResult) return { nodes: [], links: [] }
    
    // Mezclar datos de influyentes con las comunidades para tener centralidad en todos los nodos posibles
    const nodeWithCentrality = new Map()
    
    // Primero, recopilar centralidad de los nodos influyentes
    if (networkResult.most_influential) {
      networkResult.most_influential.forEach(node => {
        nodeWithCentrality.set(node.id, node.centrality)
      })
    }

    // Luego, agregar centralidad de los nodos top de cada comunidad
    networkResult.communities?.forEach(community => {
      if (community.top_nodes) {
        community.top_nodes.forEach(node => {
          if (!nodeWithCentrality.has(node.id)) {
            nodeWithCentrality.set(node.id, node.centrality)
          }
        })
      }
    })
    
    // Mapear nodos con comunidades
    const nodes: GraphNode[] = []
    const communitiesMap = new Map()
    
    networkResult.communities?.forEach(community => {
      community.nodes.forEach(node => {
        // Buscar si el nodo tiene centralidad en los nodos influyentes o top_nodes
        const nodeCentrality = nodeWithCentrality.get(node.id)
        
        // Si no tiene centralidad, calcular un valor basado en su posición en la comunidad
        const defaultCentrality = community.size ? (1 / community.size) : 0.01
        
        // Agregar metadatos a cada nodo
        nodes.push({
          id: node.id,
          name: node.name,
          community: community.id,
          centrality: nodeCentrality !== undefined ? nodeCentrality : defaultCentrality
        })
        
        communitiesMap.set(node.id, community.id)
      })
    })
    
    // Preparar enlaces
    const nodeIds = new Set(nodes.map(n => n.id))
    const links: GraphLink[] = []
    
    // Crear enlaces basados en información de la API
    // Esto es un mock ya que el backend no devuelve enlaces específicos
    if (networkResult.metrics?.edge_types) {
      const edgeTypes = Object.keys(networkResult.metrics.edge_types)
      const usedPairs = new Set()
      
      // Asegurar que los nodos influyentes estén conectados
      if (networkResult.most_influential && networkResult.most_influential.length > 1) {
        for (let i = 0; i < networkResult.most_influential.length - 1; i++) {
          const source = networkResult.most_influential[i].id
          const target = networkResult.most_influential[i + 1].id
          
          if (nodeIds.has(source) && nodeIds.has(target)) {
            const pairKey = `${source}-${target}`
            if (!usedPairs.has(pairKey)) {
              links.push({
                source,
                target,
                type: edgeTypes[i % edgeTypes.length]
              })
              usedPairs.add(pairKey)
            }
          }
        }
      }
      
      // Conectar nodos dentro de comunidades
      networkResult.communities?.forEach(community => {
        const communityNodes = community.nodes.filter(n => nodeIds.has(n.id))
        
        // Conectar nodos dentro de la misma comunidad
        for (let i = 0; i < communityNodes.length; i++) {
          const source = communityNodes[i].id
          
          // Conectar con hasta 3 nodos aleatorios de la comunidad
          const connectionCount = Math.min(3, communityNodes.length - 1)
          const connectedIndices = new Set<number>()
          
          while (connectedIndices.size < connectionCount) {
            const randomIdx = Math.floor(Math.random() * communityNodes.length)
            if (randomIdx !== i) {
              connectedIndices.add(randomIdx)
            }
          }
          
          connectedIndices.forEach(idx => {
            const target = communityNodes[idx].id
            const edgeType = edgeTypes[Math.floor(Math.random() * edgeTypes.length)]
            const pairKey = `${source}-${target}`
            
            if (!usedPairs.has(pairKey)) {
              links.push({ source, target, type: edgeType })
              usedPairs.add(pairKey)
            }
          })
        }
      })
      
      // Conectar algunas comunidades entre sí (conexiones inter-comunidad)
      if (networkResult.communities && networkResult.communities.length > 1) {
        for (let i = 0; i < networkResult.communities.length - 1; i++) {
          const sourceCommunity = networkResult.communities[i]
          const targetCommunity = networkResult.communities[i + 1]
          
          if (sourceCommunity.nodes.length > 0 && targetCommunity.nodes.length > 0) {
            const source = sourceCommunity.nodes[0].id
            const target = targetCommunity.nodes[0].id
            
            const edgeType = edgeTypes[Math.floor(Math.random() * edgeTypes.length)]
            links.push({ source, target, type: edgeType })
          }
        }
      }
    }
    
    return { nodes, links }
  }

  // Obtener datos formateados para el grafo
  const graphData = prepareGraphData()
  
  // Crear mapeo de comunidades por tamaño (de mayor a menor)
  const communitySizeRanking: Record<number, number> = {}
  
  if (networkResult?.communities) {
    // Ordenar comunidades por tamaño
    const sortedCommunities = [...networkResult.communities]
      .sort((a, b) => {
        const aSize = a.size || a.nodes?.length || 0;
        const bSize = b.size || b.nodes?.length || 0;
        return bSize - aSize; // Mayor a menor
      });
    
    // Crear mapeo: ID original -> posición por tamaño (índice+1)
    sortedCommunities.forEach((community, index) => {
      communitySizeRanking[community.id] = index + 1;
    });
  }

  // Función para expandir la visualización de una comunidad
  const expandCommunity = (communityId: number, currentCount: number) => {
    setExpandedCommunities(prev => ({
      ...prev,
      [communityId]: (prev[communityId] || 8) + 12 // Mostrar 12 usuarios más cada vez
    }));
  }

  // Mejorar la visualización del sentimiento con la nueva paleta de colores
  const renderSentimentPie = (sentiment: any) => {
    if (!sentiment) return null;
    
    const data = [
      { 
        name: 'Positivo', 
        value: sentiment.positivo, 
        color: THEME.colors.success.medium 
      },
      { 
        name: 'Negativo', 
        value: sentiment.negativo, 
        color: '#ef4444' // Rojo para negativo
      },
      { 
        name: 'Neutro', 
        value: sentiment.neutro, 
        color: '#94a3b8' // Gris para neutro
      }
    ];

    return (
      <div className="h-[260px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ReChartsPie>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={80}
              label={({ name, value }) => `${name} ${(value * 100).toFixed(0)}%`}
              labelLine={false}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <RechartsTooltip
              contentStyle={{ backgroundColor: '#ffffff', }}
              formatter={(value: number) => `${(value * 100).toFixed(1)}%`} 
            />
            <Legend 
              verticalAlign="bottom" 
              height={36}
              formatter={(value: string) => (
                <span className="text-sm font-medium">{value}</span>
              )}
            />
          </ReChartsPie>
        </ResponsiveContainer>
      </div>
    );
  };

  // Panel de insights y sentimiento mejorado
  const renderInsightsAndSentiment = () => {
    if (!networkResult || networkResult.error) return null;
    
    // Verificar que metrics existe
    const m = networkResult.metrics;
    if (!m) return null;

    // Si no hay datos de sentimiento, no renderizar nada
    if (!m.sentiment || 
        typeof m.sentiment.positivo !== 'number' ||
        typeof m.sentiment.negativo !== 'number' ||
        typeof m.sentiment.neutro !== 'number') {
        return null;
    }

    // Verificar que la suma de los sentimientos no es 0 para evitar gráficos vacíos
    const totalSentiment = m.sentiment.positivo + m.sentiment.negativo + m.sentiment.neutro;
    if (totalSentiment === 0) return null;

    // Renderizar ejemplos representativos si existen
    const renderRepresentativeExamples = () => {
      if (!m.representative_examples) return null;
      const { positivo, negativo } = m.representative_examples;
      if (!positivo && !negativo) return null;
      const tweetUrl = (id: string) => `https://twitter.com/i/web/status/${id}`;
      const userUrl = (author: string) => `https://twitter.com/${author}`;
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          {positivo && (
            <Card className="border-green-200 dark:border-green-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-200">
                  <Smile className="w-5 h-5" /> Ejemplo positivo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-2 text-green-900 dark:text-green-100">"{positivo.text}"</p>
                <div className="flex items-center gap-2 text-sm">
                  <a href={userUrl(positivo.author)} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-medium">@{positivo.author}</a>
                  {positivo.created_at && <span className="text-gray-400">· {new Date(positivo.created_at).toLocaleString()}</span>}
                </div>
                <a href={tweetUrl(positivo.id)} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline text-xs mt-1 inline-block">Ver tweet</a>
              </CardContent>
            </Card>
          )}
          {negativo && (
            <Card className="border-red-200 dark:border-red-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-200">
                  <Frown className="w-5 h-5" /> Ejemplo negativo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-2 text-red-900 dark:text-red-100">"{negativo.text}"</p>
                <div className="flex items-center gap-2 text-sm">
                  <a href={userUrl(negativo.author)} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-medium">@{negativo.author}</a>
                  {negativo.created_at && <span className="text-gray-400">· {new Date(negativo.created_at).toLocaleString()}</span>}
                </div>
                <a href={tweetUrl(negativo.id)} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline text-xs mt-1 inline-block">Ver tweet</a>
              </CardContent>
            </Card>
          )}
        </div>
      );
    };

    // Renderizar insights principales si existen
    const renderInsights = () => {
      if (!m.insights) return null;
      const { top_hashtags, top_keywords, top_urls } = m.insights;
      if (!top_hashtags.length && !top_keywords.length && !top_urls.length) return null;
      return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-200">
                <Hash className="w-5 h-5" /> Hashtags principales
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1">
                {top_hashtags.length === 0 && <li className="text-gray-400">No hay hashtags destacados.</li>}
                {top_hashtags.map((h, i) => (
                  <li key={i}>
                    <a href={`https://twitter.com/hashtag/${encodeURIComponent(h.hashtag.replace('#', ''))}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">#{h.hashtag}</a>
                    <span className="ml-2 text-xs text-gray-500">({h.count})</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-violet-700 dark:text-violet-200">
                <Lightbulb className="w-5 h-5" /> Palabras clave
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1">
                {top_keywords.length === 0 && <li className="text-gray-400">No hay palabras clave destacadas.</li>}
                {top_keywords.map((w, i) => (
                  <li key={i}>
                    <span className="text-violet-700 dark:text-violet-200 font-medium">{w.word}</span>
                    <span className="ml-2 text-xs text-gray-500">({w.count})</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-emerald-700 dark:text-emerald-200">
                <Link className="w-5 h-5" /> URLs más compartidas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1">
                {top_urls.length === 0 && <li className="text-gray-400">No hay URLs destacadas.</li>}
                {top_urls.map((u, i) => (
                  <li key={i}>
                    <a href={u.url} target="_blank" rel="noopener noreferrer" className="text-emerald-700 hover:underline dark:text-emerald-300">{u.url}</a>
                    <span className="ml-2 text-xs text-gray-500">({u.count})</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      );
    };

    return (
      <div className="grid grid-cols-1 gap-6 mb-8">
        <Card className={`${THEME.card.base} ${THEME.card.gradient(THEME.colors.success.bg)}`}>
          <CardHeader className="border-b border-green-100 dark:border-green-800">
            <CardTitle className="flex items-center gap-2 text-green-800 dark:text-green-200">
              <PieChart className="w-5 h-5" />
              Análisis de sentimiento
            </CardTitle>
            <CardDescription className="text-green-600 dark:text-green-300">
              Distribución del tono en la conversación
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            {renderSentimentPie(m.sentiment)}
            {renderRepresentativeExamples()}
            {renderInsights()}
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      <Header 
        backendConnected={backendConnected}
        apiHealth={apiHealth}
        checkingApiHealth={checkingApiHealth}
        onCheckApiHealth={checkApiHealth}
      />
      
      {/* Banner de Tendencias */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-900 dark:to-indigo-900">
        <div className="container mx-auto py-4 px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-white font-bold text-lg">¿Buscas temas en tendencia?</h2>
                <p className="text-blue-100">Descubre qué está pasando ahora mismo en Twitter/X</p>
              </div>
            </div>
            <a
              href="https://twitter.com/explore/tabs/trending"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white text-blue-600 hover:bg-blue-50 px-6 py-2.5 rounded-xl font-semibold flex items-center gap-2 transition-colors duration-200"
            >
              Ver Tendencias
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>

      <main className="container mx-auto py-6">
        <div className="space-y-6">
          <BackendWarning backendConnected={backendConnected} />
          <Tabs defaultValue="search" className="w-full">
            <TabsList className="flex h-10 justify-start px-6 w-full border-b-0 bg-transparent mb-6">
              <TabsTrigger value="search" className="cursor-pointer data-[state=active]:border-indigo-500 border-b-2 border-transparent">
                Búsqueda y Análisis
              </TabsTrigger>
            </TabsList>

            <TabsContent value="search">
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Análisis de Red Social</CardTitle>
                    <CardDescription>
                      Busca usuarios o analiza temas para descubrir conexiones, comunidades y tendencias.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <NetworkSearchForm
                        query={query}
                        maxTweets={maxTweets}
                        loading={loading}
                        backendConnected={backendConnected}
                        onQueryChange={setQuery}
                        onMaxTweetsChange={setMaxTweets}
                        onSubmit={handleNetworkAnalysis}
                      />
                      <div className="space-y-4">
                        <UserSearchForm
                          username={username}
                          onUsernameChange={setUsername}
                          onSubmit={handleUserSearch}
                          backendConnected={backendConnected}
                        />
                        <UserResult userResult={userResult} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                {/* Panel de resumen visual */}
                {networkResult && !loading && !networkResult.error && (
                  <div className="space-y-8">
                    <SummaryMetrics 
                      metrics={networkResult.metrics} 
                      communitiesCount={networkResult.communities?.length || 0} 
                    />
                    {renderInsightsAndSentiment()}
                  </div>
                )}
                {/* Panel de comunidades, usuarios influyentes y grafo */}
                {networkResult && !loading && (
                  <Tabs value={activeResultTab} onValueChange={(value) => setActiveResultTab(value as any)} className="w-full">
                    <div className="border-b">
                      <TabsList className="flex h-10 justify-start px-6 w-full border-b-0 bg-transparent">
                        <TabsTrigger value="communities" className="cursor-pointer data-[state=active]:border-indigo-500 border-b-2 border-transparent">
                          Comunidades
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <HelpCircle className="inline h-4 w-4 ml-1 text-gray-400 cursor-pointer" />
                              </TooltipTrigger>
                              <TooltipContent>Grupos de usuarios que interactúan más entre sí.</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TabsTrigger>
                        <TabsTrigger value="influential" className="cursor-pointer data-[state=active]:border-indigo-500 border-b-2 border-transparent">
                          Usuarios influyentes
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <HelpCircle className="inline h-4 w-4 ml-1 text-gray-400 cursor-pointer" />
                              </TooltipTrigger>
                              <TooltipContent>Usuarios con mayor centralidad en la red.</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TabsTrigger>
                        <TabsTrigger value="graph" className="cursor-pointer data-[state=active]:border-indigo-500 border-b-2 border-transparent">
                          <Share2 className="h-4 w-4 mr-2" />
                          Visualización
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <HelpCircle className="inline h-4 w-4 ml-1 text-gray-400 cursor-pointer" />
                              </TooltipTrigger>
                              <TooltipContent>Grafo interactivo de la red social.</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TabsTrigger>
                      </TabsList>
                    </div>
                    <TabsContent value="communities" className="p-6">
                      <CommunitiesTab 
                        communities={networkResult.communities || []}
                        communitySizeRanking={communitySizeRanking}
                        expandedCommunities={expandedCommunities}
                        communityColors={communityColors}
                        DEFAULT_COMMUNITY_COLORS={DEFAULT_COMMUNITY_COLORS}
                        onExpandCommunity={expandCommunity}
                      />
                    </TabsContent>
                    <TabsContent value="influential" className="p-6">
                      <InfluentialUsersTab 
                        influentialUsers={networkResult.most_influential || []}
                        communities={networkResult.communities || []}
                        communitySizeRanking={communitySizeRanking}
                        DEFAULT_COMMUNITY_COLORS={DEFAULT_COMMUNITY_COLORS}
                      />
                    </TabsContent>
                    <TabsContent value="graph" className="p-6">
                      <div className="space-y-6">
                        {/* Banner informativo - Sin hover */}
                        <div className="bg-gradient-to-r from-indigo-50 to-violet-50 dark:from-indigo-900/20 dark:to-violet-900/20 p-6 rounded-2xl border border-indigo-100 dark:border-indigo-800">
                          <h3 className="text-xl font-bold text-indigo-800 dark:text-indigo-200 mb-2 flex items-center gap-2">
                            <Network className="w-6 h-6" />
                            Visualización de la red
                          </h3>
                          <p className="text-indigo-600 dark:text-indigo-300">
                            Grafo interactivo que muestra las conexiones entre usuarios. Los colores representan comunidades y el tamaño de los nodos indica su influencia.
                          </p>
                        </div>

                        {/* Métricas - Sin hover */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          <Card className={`${THEME.card.base} ${THEME.card.gradient(THEME.colors.info.bg)}`}>
                            <CardContent className="p-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                                  <Network className="w-5 h-5 text-indigo-600" />
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-indigo-600 dark:text-indigo-300">Nodos</p>
                                  <p className="text-2xl font-bold text-indigo-700 dark:text-indigo-200">
                                    {graphData.nodes.length}
                                  </p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>

                          <Card className={`${THEME.card.base} ${THEME.card.gradient(THEME.colors.info.bg)}`}>
                            <CardContent className="p-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                                  <Share2 className="w-5 h-5 text-indigo-600" />
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-indigo-600 dark:text-indigo-300">Enlaces</p>
                                  <p className="text-2xl font-bold text-indigo-700 dark:text-indigo-200">
                                    {graphData.links.length}
                                  </p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>

                          <Card className={`${THEME.card.base} ${THEME.card.gradient(THEME.colors.info.bg)}`}>
                            <CardContent className="p-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                                  <Network className="w-5 h-5 text-indigo-600" />
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-indigo-600 dark:text-indigo-300">Densidad</p>
                                  <p className="text-2xl font-bold text-indigo-700 dark:text-indigo-200">
                                    {(graphData.links.length / (graphData.nodes.length * (graphData.nodes.length - 1) / 2)).toFixed(4)}
                                  </p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </div>

                        {/* Contenedor del grafo - Solo esta parte es interactiva */}
                        <Card className={`${THEME.card.base} ${THEME.card.gradient(THEME.colors.primary.bg)}`}>
                          <CardHeader className="border-b border-blue-100 dark:border-blue-800">
                            <div className="flex items-center justify-between">
                              <div>
                                <CardTitle className="text-lg text-blue-800 dark:text-blue-200 flex items-center gap-2">
                                  <Share2 className="w-5 h-5" />
                                  Grafo de conexiones
                                </CardTitle>
                                <CardDescription className="text-blue-600 dark:text-blue-300">
                                  {graphData.nodes.length} usuarios y {graphData.links.length} conexiones
                                </CardDescription>
                              </div>
                              
                            </div>
                          </CardHeader>
                          <CardContent className="p-0 relative">
                            <div className="w-full h-[calc(100vh-300px)] min-h-[700px] bg-gradient-to-br from-gray-50 to-blue-50/20 dark:from-gray-900 dark:to-blue-900/20">
                              <NetworkGraph 
                                nodes={graphData.nodes} 
                                links={graphData.links} 
                                communitySizeRanking={communitySizeRanking}
                              />
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </TabsContent>
                  </Tabs>
                )}
                {/* Error de red */}
                {networkResult && networkResult.error && (
                  <Card>
                    <CardHeader className="border-b">
                      <CardTitle>Resultados: "{networkResult.query}"</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <NetworkError 
                        query={networkResult.query}
                        error={networkResult.error}
                        message={networkResult.message}
                      />
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  )
}
