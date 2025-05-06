'use client'

import NetworkGraph from '@/components/NetworkGraph'

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

interface GraphTabProps {
  graphData: {
    nodes: GraphNode[];
    links: GraphLink[];
  };
  communitySizeRanking: Record<number, number>;
}

export function GraphTab({ graphData, communitySizeRanking }: GraphTabProps) {
  return (
    <div className="space-y-4">
      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-md mb-4 border border-blue-100 dark:border-blue-800">
        <h4 className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-1">Interpretación de esta visualización</h4>
        <p className="text-sm text-blue-700 dark:text-blue-200">
          Cada círculo (nodo) representa un usuario de Twitter. El <strong>tamaño</strong> de cada círculo indica su <strong>influencia</strong> en la conversación. Los <strong>colores</strong> indican las diferentes <strong>comunidades</strong> a las que pertenecen.
        </p>
        <p className="text-sm text-blue-700 dark:text-blue-200 mt-2">
          Las líneas representan <strong>interacciones</strong> entre usuarios (retweets, menciones, respuestas o citas). Al pasar el cursor sobre un usuario, se destacarán en <strong>naranja</strong> todas sus conexiones directas.
        </p>
        <div className="mt-2 text-sm text-blue-700 dark:text-blue-200">
          <strong>Consejos de uso:</strong>
          <ul className="list-disc pl-5 mt-1">
            <li>Arrastre los nodos para reorganizar el gráfico</li>
            <li>Use la rueda del ratón para hacer zoom</li>
            <li>Pase el cursor sobre un nodo para ver sus conexiones</li>
          </ul>
        </div>
      </div>
      
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Visualización de la Red</h3>
        <div className="text-sm text-gray-500">
          {graphData.nodes.length} usuarios • {graphData.links.length} conexiones
        </div>
      </div>
      
      <div className="h-[600px]">
        <NetworkGraph 
          nodes={graphData.nodes} 
          links={graphData.links} 
          communitySizeRanking={communitySizeRanking}
          onNodeClick={(node) => {
            console.log(`Clicked on user: @${node.name}`)
            window.open(`https://twitter.com/${node.name}`, '_blank')
          }}
        />
      </div>
    </div>
  );
} 