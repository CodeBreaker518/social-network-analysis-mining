'use client'

import { useState, useEffect } from 'react'
import axios from 'axios'
import Image from "next/image"
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { BarChart3, Users, Network, Search, Loader2, Share2, ExternalLink, HelpCircle } from 'lucide-react'

import { Header } from '@/components/layout/Header'
import { BackendWarning } from '@/components/layout/BackendWarning'
import { NetworkSearchForm } from '@/components/search/NetworkSearchForm'
import { UserSearchForm } from '@/components/search/UserSearchForm'
import { UserResult } from '@/components/user/UserResult'
import { SummaryMetrics } from '@/components/metrics/SummaryMetrics'
import { OverviewTab } from '@/components/results/OverviewTab'
import { InfluentialUsersTab } from '@/components/results/InfluentialUsersTab'
import { CommunitiesTab } from '@/components/results/CommunitiesTab'
import { GraphTab } from '@/components/results/GraphTab'
import { NetworkError } from '@/components/results/NetworkError'
import NetworkGraph from '@/components/NetworkGraph'

interface UserInfo {
  username: string;
  name?: string;
  error?: string;
  raw_response?: any;
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
      centrality: number;
    }>;
  };
  most_influential: Array<{
    id: string;
    name: string;
    centrality: number;
  }>;
  communities: Array<{
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
  const [activeResultTab, setActiveResultTab] = useState<'overview' | 'communities' | 'influential' | 'graph'>('overview')
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
    
    if (networkResult.most_influential) {
      networkResult.most_influential.forEach(node => {
        nodeWithCentrality.set(node.id, node.centrality)
      })
    }
    
    // Mapear nodos con comunidades
    const nodes: GraphNode[] = []
    const communitiesMap = new Map()
    
    networkResult.communities?.forEach(community => {
      community.nodes.forEach(node => {
        // Agregar metadatos a cada nodo
        nodes.push({
          id: node.id,
          name: node.name,
          community: community.id,
          centrality: nodeWithCentrality.get(node.id) || 0.01 // Valor por defecto bajo
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* Header componetizado */}
      <Header 
        backendConnected={backendConnected}
        apiHealth={apiHealth}
        checkingApiHealth={checkingApiHealth}
        onCheckApiHealth={checkApiHealth}
      />

      <main className="container mx-auto py-6">
        <div className="space-y-6">
          {/* Advertencia de backend componetizada */}
          <BackendWarning backendConnected={backendConnected} />
          
          {/* Control Panel */}
          <Card>
            <CardHeader>
              <CardTitle>Análisis de Red Social</CardTitle>
              <CardDescription>
                Busque usuarios o analice temas para descubrir conexiones y comunidades.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Network Analysis componetizado */}
                <NetworkSearchForm
                  query={query}
                  maxTweets={maxTweets}
                  loading={loading}
                  backendConnected={backendConnected}
                  onQueryChange={setQuery}
                  onMaxTweetsChange={setMaxTweets}
                  onSubmit={handleNetworkAnalysis}
                />

                {/* User Search componetizado */}
                <div className="space-y-4">
                  <UserSearchForm
                    username={username}
                    onUsernameChange={setUsername}
                    onSubmit={handleUserSearch}
                    backendConnected={backendConnected}
                  />
                  
                  {/* User Result componetizado */}
                  <UserResult userResult={userResult} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Results */}
          {networkResult && !loading && (
            <Card>
              <CardHeader className="border-b">
                <CardTitle>Resultados: "{networkResult.query}"</CardTitle>
              </CardHeader>

              {networkResult.error ? (
                <CardContent className="pt-6">
                  {/* Error componetizado */}
                  <NetworkError 
                    query={networkResult.query}
                    error={networkResult.error}
                    message={networkResult.message}
                  />
                </CardContent>
              ) : (
                <>
                  {/* Metrics Summary componetizado */}
                  <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <SummaryMetrics 
                      metrics={networkResult.metrics}
                      communitiesCount={networkResult.communities?.length || 0}
                    />
                  </div>

                  {/* Navigation Tabs */}
                  <Tabs value={activeResultTab} onValueChange={(value) => setActiveResultTab(value as any)} className="w-full">
                    <div className="border-b">
                      <TabsList className="flex h-10 justify-start px-6 w-full border-b-0 bg-transparent">
                        <TabsTrigger value="overview" className="cursor-pointer data-[state=active]:border-indigo-500 border-b-2 border-transparent">
                          Visión general
                        </TabsTrigger>
                        <TabsTrigger value="influential" className="cursor-pointer data-[state=active]:border-indigo-500 border-b-2 border-transparent">
                          Usuarios influyentes
                        </TabsTrigger>
                        <TabsTrigger value="communities" className="cursor-pointer data-[state=active]:border-indigo-500 border-b-2 border-transparent">
                          Comunidades
                        </TabsTrigger>
                        <TabsTrigger value="graph" className="cursor-pointer data-[state=active]:border-indigo-500 border-b-2 border-transparent">
                          <Share2 className="h-4 w-4 mr-2" />
                          Visualización
                        </TabsTrigger>
                      </TabsList>
                    </div>

                    {/* Overview Tab componetizado */}
                    <TabsContent value="overview" className="p-6">
                      <OverviewTab 
                        query={networkResult.query}
                        metrics={networkResult.metrics}
                        communitiesCount={networkResult.communities?.length || 0}
                        mostInfluential={networkResult.most_influential || []}
                      />
                    </TabsContent>

                    {/* Influential Users Tab componetizado */}
                    <TabsContent value="influential" className="p-6">
                      <InfluentialUsersTab 
                        influentialUsers={networkResult.most_influential || []}
                        communities={networkResult.communities || []}
                        communitySizeRanking={communitySizeRanking}
                        DEFAULT_COMMUNITY_COLORS={DEFAULT_COMMUNITY_COLORS}
                      />
                    </TabsContent>

                    {/* Communities Tab componetizado */}
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

                    {/* Graph Visualization Tab componetizado */}
                    <TabsContent value="graph" className="p-6">
                      <GraphTab 
                        graphData={graphData}
                        communitySizeRanking={communitySizeRanking}
                      />
                    </TabsContent>
                  </Tabs>
                </>
              )}
            </Card>
          )}
        </div>
      </main>
    </div>
  )
}
