'use client'

import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { Card, CardContent } from './ui/card'

// Define tipos para los nodes y links como Any para evitar problemas de tipado con ForceGraph2D
interface GraphNode {
  id: string
  name: string
  community?: number
  centrality?: number
  [key: string]: any
}

interface GraphLink {
  source: string | GraphNode
  target: string | GraphNode
  type: string
  [key: string]: any
}

interface NetworkGraphProps {
  nodes: GraphNode[]
  links: GraphLink[]
  communityColors?: Record<number, string>
  communitySizeRanking?: Record<number, number> // Mapeo de ID original a posición por tamaño
  onNodeClick?: (node: GraphNode) => void
}

// Importamos ForceGraph2D dinámicamente para evitar problemas de SSR
const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), {
  ssr: false,
  loading: () => <div className="w-full h-[400px] flex items-center justify-center">Cargando visualizador de grafo...</div>
})

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

// Add Tailwind color constants for connection types
const CONNECTION_COLORS = {
  retweet: '#3B82F6', // blue-500
  mention: '#10B981', // green-500
  reply: '#F59E0B',   // yellow-500
  quote: '#8B5CF6',   // purple-500
  default: '#9CA3AF'  // gray-400
}

// Add a constant for the highlight color
const HIGHLIGHT_COLOR = '#FF7700'; // Orange highlight color

// Add a constant for the default node color
const DEFAULT_NODE_COLOR = '#aaaaaa'; // Default color for nodes with no community

export default function NetworkGraph({ 
  nodes, 
  links, 
  communityColors = {}, 
  communitySizeRanking = {},
  onNodeClick 
}: NetworkGraphProps) {
  const graphRef = useRef<any>(null)
  const [dimensions, setDimensions] = useState({ width: 0, height: 500 })
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null)
  const [highlightNodes, setHighlightNodes] = useState<Set<any>>(new Set())
  const [highlightLinks, setHighlightLinks] = useState<Set<any>>(new Set())
  const [graphReady, setGraphReady] = useState(false)

  // Actualizar dimensiones basadas en el contenedor
  useEffect(() => {
    const updateDimensions = () => {
      const graphElement = document.getElementById('graph-container')
      if (graphElement) {
        setDimensions({
          width: graphElement.clientWidth,
          height: 500
        })
      }
    }

    window.addEventListener('resize', updateDimensions)
    updateDimensions()
    
    return () => window.removeEventListener('resize', updateDimensions)
  }, [])

  // Preparar los datos del grafo de manera estable con useMemo
  const graphData = useMemo(() => {
    // Procesar nodos y enlaces
    const processedNodes = nodes.map(node => ({
      ...node,
      centrality: node.centrality || 0.01
    }));
    
    const processedLinks = links.map(link => ({
      ...link
    }));
    
    // Asegurar que todos los nodos tienen al menos una conexión
    // para evitar nodos flotantes
    const nodeIds = new Set(processedNodes.map(n => n.id));
    const connectedNodes = new Set();
    
    processedLinks.forEach(link => {
      const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
      const targetId = typeof link.target === 'object' ? link.target.id : link.target;
      
      connectedNodes.add(sourceId);
      connectedNodes.add(targetId);
    });
    
    // Asegurar que todos los nodos están conectados
    const isolatedNodes = processedNodes.filter(node => !connectedNodes.has(node.id));
    
    if (isolatedNodes.length > 0 && processedNodes.length > 1) {
      // Conectar nodos aislados al primer nodo no aislado
      const connectedNode = processedNodes.find(node => connectedNodes.has(node.id));
      
      if (connectedNode) {
        isolatedNodes.forEach(isolatedNode => {
          processedLinks.push({
            source: isolatedNode.id,
            target: connectedNode.id,
            type: 'auto'
          });
        });
      }
    }
    
    return { 
      nodes: processedNodes,
      links: processedLinks 
    };
  }, [nodes, links]);

  // Configurar el grafo cuando esté montado
  useEffect(() => {
    if (graphRef.current) {
      // Permitir interactividad con el gráfico
      const fg = graphRef.current;
      
      // Inicializar la física una vez y luego estabilizarla
      setTimeout(() => {
        setGraphReady(true);
      }, 3000);
    }
  }, []);

  // Forzar una actualización gráfica sin reiniciar la física
  const refreshGraph = useCallback(() => {
    if (graphRef.current) {
      const fg = graphRef.current;
      
      // Actualizar la presentación visual sin reiniciar la física
      if (fg.refresh) {
        fg.refresh();
      }
    }
  }, []);

  // Gestionar hover de nodos de manera optimizada
  const handleNodeHover = useCallback((node: any) => {
    // Actualizar el nodo actualmente seleccionado para mostrar info
    setHoveredNode(node ? {...node} : null);
    
    // No proceder si no hay cambios significativos
    if (!node && !highlightNodes.size) return;
    
    // Limpiar selecciones previas
    highlightNodes.clear();
    highlightLinks.clear();
    
    if (node) {
      // Agregar el nodo actual
      highlightNodes.add(node);
      
      // Encontrar conexiones relevantes
      graphData.links.forEach(link => {
        const sourceNode = typeof link.source === 'object' ? link.source : null;
        const targetNode = typeof link.target === 'object' ? link.target : null;
        
        if (!sourceNode || !targetNode) return;
        
        if (sourceNode.id === node.id || targetNode.id === node.id) {
          highlightLinks.add(link);
          if (sourceNode.id === node.id) {
            highlightNodes.add(targetNode);
          } else {
            highlightNodes.add(sourceNode);
          }
        }
      });
    }
    
    // Actualizar la visualización sin reiniciar la física
    refreshGraph();
  }, [graphData.links, highlightLinks, highlightNodes, refreshGraph]);

  // Función de click para nodos
  const handleNodeClick = useCallback((node: any) => {
    if (onNodeClick && node) {
      onNodeClick(node);
    }
  }, [onNodeClick]);

  // Obtener color de nodo
  const getNodeColor = useCallback((node: any) => {
    if (highlightNodes.has(node)) {
      return HIGHLIGHT_COLOR;  // Naranja brillante en lugar de blanco
    }
    
    if (node.community === undefined) {
      return DEFAULT_NODE_COLOR;
    }
    
    return communityColors[node.community] || 
           DEFAULT_COMMUNITY_COLORS[node.community % DEFAULT_COMMUNITY_COLORS.length];
  }, [communityColors, highlightNodes]);

  // Obtener color de enlace
  const getLinkColor = useCallback((link: any) => {
    if (highlightLinks.has(link)) {
      return HIGHLIGHT_COLOR;  // Naranja brillante en lugar de blanco
    }
    
    switch (link.type) {
      case 'retweet': return CONNECTION_COLORS.retweet + 'B3'; // Blue with 70% opacity
      case 'mention': return CONNECTION_COLORS.mention + 'B3'; // Green with 70% opacity
      case 'reply': return CONNECTION_COLORS.reply + 'B3';     // Yellow with 70% opacity
      case 'quote': return CONNECTION_COLORS.quote + 'B3';     // Purple with 70% opacity
      default: return CONNECTION_COLORS.default + 'B3';        // Gray with 70% opacity
    }
  }, [highlightLinks]);

  // Obtener tamaño de nodo basado en centralidad
  const getNodeSize = useCallback((node: any) => {
    const baseSize = 4;
    
    if (node.centrality) {
      return baseSize + Math.min(node.centrality * 15, 12);
    }
    
    return baseSize;
  }, []);

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div id="graph-container" className="relative">
          {dimensions.width > 0 && (
            <ForceGraph2D
              ref={graphRef}
              graphData={graphData}
              width={dimensions.width}
              height={dimensions.height}
              nodeId="id"
              nodeRelSize={5}
              nodeLabel={(node: any) => `@${node.name}`}
              nodeColor={(node: any) => getNodeColor(node)}
              nodeVal={(node: any) => getNodeSize(node)}
              
              linkDirectionalArrowLength={3}
              linkDirectionalArrowRelPos={1}
              linkCurvature={0.1}
              linkWidth={(link: any) => highlightLinks.has(link) ? 2 : 0.8}
              linkColor={(link: any) => getLinkColor(link)}
              
              // Eventos de interacción
              onNodeHover={(node: any) => handleNodeHover(node)}
              onNodeClick={(node: any) => handleNodeClick(node)}
              
              // Física del grafo
              d3AlphaDecay={0.15}
              d3VelocityDecay={0.6}
              warmupTicks={50}
              cooldownTicks={50}
              cooldownTime={2000}
              
              // Configuración de interacción importante
              enableNodeDrag={true}
              enableZoomInteraction={true}
              enablePanInteraction={true}
              minZoom={0.5}
              maxZoom={5}
              onEngineStop={() => {
                if (!graphReady) setGraphReady(true);
              }}
              
              // Partículas en enlaces destacados
              linkDirectionalParticles={link => highlightLinks.has(link) ? 4 : 0}
              linkDirectionalParticleWidth={2}
              linkDirectionalParticleSpeed={0.005}
              linkDirectionalParticleColor={() => HIGHLIGHT_COLOR}
              
              // Canvas para nodos
              nodeCanvasObject={(node: any, ctx, globalScale) => {
                const size = getNodeSize(node);
                const fontSize = 12/globalScale;
                const isHighlighted = highlightNodes.has(node);
                
                // Dibujar círculo del nodo
                ctx.beginPath();
                ctx.arc(node.x, node.y, size, 0, 2 * Math.PI);
                ctx.fillStyle = getNodeColor(node);
                ctx.fill();
                
                // Dibujar etiqueta para nodos destacados o cuando hay zoom suficiente
                if (isHighlighted || globalScale > 1.5) {
                  const label = node.name;
                  
                  ctx.font = `${isHighlighted ? 'bold ' : ''}${fontSize}px Arial`;
                  ctx.textAlign = 'center';
                  ctx.textBaseline = 'middle';
                  
                  // Dibujar contorno para mejor legibilidad
                  ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
                  ctx.lineWidth = 2 / globalScale;
                  ctx.strokeText(label, node.x, node.y + 10);
                  
                  // Dibujar texto
                  ctx.fillStyle = isHighlighted ? 'white' : 'rgba(255, 255, 255, 0.9)';
                  ctx.fillText(label, node.x, node.y + 10);
                }
              }}
              
              // Especificar que se usa un renderizador personalizado
              nodeCanvasObjectMode={() => 'replace'}
            />
          )}
          
          {/* Panel de información de nodo */}
          {hoveredNode && (
            <div className="absolute bottom-4 left-4 bg-white dark:bg-gray-800 p-3 rounded-md shadow-md text-sm">
              <div className="font-bold mb-1">@{hoveredNode.name}</div>
              {hoveredNode.community !== undefined && (
                <div className="flex items-center">
                  <div className="flex items-center">
                    <span className="mr-2">Comunidad:</span>
                    <div 
                      className="h-3 w-3 mr-1 rounded-full" 
                      style={{ 
                        backgroundColor: communityColors[hoveredNode.community] || 
                          DEFAULT_COMMUNITY_COLORS[hoveredNode.community % DEFAULT_COMMUNITY_COLORS.length]
                      }}
                    ></div>
                    <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 dark:bg-gray-700">
                      #{communitySizeRanking[hoveredNode.community] || hoveredNode.community + 1}
                    </span>
                  </div>
                </div>
              )}
              {hoveredNode.centrality !== undefined && (
                <div className="mt-1">
                  <div className="flex items-center">
                    <span className="mr-2">Relevancia:</span>
                    <span className="font-medium">{hoveredNode.centrality.toFixed(4)}</span>
                  </div>
                  <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    La centralidad mide la influencia de este usuario en la red. Valores más altos indican mayor relevancia.
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Leyenda */}
          <div className="absolute top-4 right-4 bg-white dark:bg-gray-800 p-3 rounded-md shadow-md text-xs">
            <div className="mb-2 font-medium text-sm">Leyenda</div>
            <div className="grid grid-cols-1 gap-1.5">
              <div className="flex flex-col space-y-1.5 mb-2">
                <div className="text-xs font-medium text-gray-600 dark:text-gray-300">Tipos de conexión:</div>
                <div className="flex items-center">
                  <span className="h-3 w-3 mr-2 rounded-full" style={{ backgroundColor: CONNECTION_COLORS.retweet }}></span>
                  <span>Retweet - Cuando un usuario comparte el tweet de otro</span>
                </div>
                <div className="flex items-center">
                  <span className="h-3 w-3 mr-2 rounded-full" style={{ backgroundColor: CONNECTION_COLORS.mention }}></span>
                  <span>Mención - Cuando un usuario menciona a otro (@usuario)</span>
                </div>
                <div className="flex items-center">
                  <span className="h-3 w-3 mr-2 rounded-full" style={{ backgroundColor: CONNECTION_COLORS.reply }}></span>
                  <span>Respuesta - Cuando un usuario responde al tweet de otro</span>
                </div>
                <div className="flex items-center">
                  <span className="h-3 w-3 mr-2 rounded-full" style={{ backgroundColor: CONNECTION_COLORS.quote }}></span>
                  <span>Cita - Cuando un usuario cita el tweet de otro</span>
                </div>
              </div>

              <div className="border-t border-gray-200 dark:border-gray-700 pt-1 mb-1"></div>

              <div className="flex flex-col space-y-1.5">
                <div className="text-xs font-medium text-gray-600 dark:text-gray-300">Nodos (usuarios):</div>
                <div className="flex items-center">
                  <div className="flex items-center mr-2">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: DEFAULT_NODE_COLOR }}></span>
                    <span className="mx-1">→</span>
                    <span className="h-5 w-5 rounded-full" style={{ backgroundColor: DEFAULT_NODE_COLOR }}></span>
                  </div>
                  <span>Tamaño = Relevancia/influencia del usuario</span>
                </div>
                <div className="flex items-center">
                  <div className="flex space-x-1 mr-2">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: DEFAULT_COMMUNITY_COLORS[0] }}></span>
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: DEFAULT_COMMUNITY_COLORS[1] }}></span>
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: DEFAULT_COMMUNITY_COLORS[2] }}></span>
                  </div>
                  <span>Color = Grupo/comunidad a la que pertenece</span>
                </div>
                <div className="flex items-center">
                  <div className="flex items-center mr-2">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: HIGHLIGHT_COLOR }}></span>
                  </div>
                  <span>Naranja = Nodo destacado (al pasar el cursor)</span>
                </div>
              </div>

              <div className="border-t border-gray-200 dark:border-gray-700 pt-1 mt-1"></div>
              
              <div className="text-xs text-gray-500 dark:text-gray-400 pt-1">
                <span>• Puede arrastrar nodos para reorganizar</span><br/>
                <span>• Use la rueda del ratón para zoom</span>
              </div>
            </div>
          </div>
          
          {/* Pantalla de carga */}
          {!graphReady && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white">
              <div className="flex flex-col items-center">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-white mb-3"></div>
                <div>Generando visualización...</div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
} 