from fastapi import FastAPI, HTTPException, Query, Request, status
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from app.services.twitter_service import get_tweets_and_build_graph, detect_communities, client, get_network_metrics, get_user_info
import tweepy
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from tweepy.errors import TooManyRequests

app = FastAPI()

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Permitir todas las origins para desarrollo
    allow_credentials=True,
    allow_methods=["*"],  # Permitir todos los métodos
    allow_headers=["*"],  # Permitir todos los headers
    expose_headers=["*"]  # Exponer todos los headers en la respuesta
)

# Manejador de excepciones para errores 429 (Too Many Requests)
@app.exception_handler(TooManyRequests)
async def too_many_requests_handler(request: Request, exc: TooManyRequests):
    return JSONResponse(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        content={
            "error": "Twitter API rate limit exceeded",
            "message": "Has alcanzado el límite de solicitudes a la API de Twitter. Por favor, espera unos minutos antes de intentar nuevamente."
        }
    )

# Manejador de excepciones para errores HTTP genéricos
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": f"Error {exc.status_code}",
            "message": str(exc.detail)
        }
    )

class QueryRequest(BaseModel):
    query: str
    max_tweets: int = 100

class GraphResponse(BaseModel):
    nodes: List[Dict[str, Any]]
    edges: List[Dict[str, Any]]
    communities: List[List[int]]
    metrics: Dict[str, Any]
    raw_response: Optional[Dict[str, Any]] = None

class UserInfoResponse(BaseModel):
    username: str
    name: Optional[str] = None
    error: Optional[str] = None
    raw_response: Optional[Dict[str, Any]] = None

class NetworkMetricsResponse(BaseModel):
    query: str
    metrics: Dict[str, Any]
    most_influential: List[Dict[str, Any]]
    communities: List[Dict[str, Any]]
    raw_response: Optional[Dict[str, Any]] = None
    
@app.post("/analyze_tweets/", response_model=GraphResponse)
async def analyze_tweets(query_request: QueryRequest):
    # Obtener el grafo de usuarios y relaciones
    graph = get_tweets_and_build_graph(query_request.query, query_request.max_tweets)

    # Detectar comunidades en el grafo
    communities = detect_communities(graph)

    # Obtener métricas del grafo
    metrics = get_network_metrics(graph)
    
    # Obtener la respuesta original de la API si existe
    raw_response = None
    if hasattr(graph, 'graph') and 'raw_response' in graph.graph:
        raw_response = graph.graph['raw_response']

    # Extraer nodos y aristas del grafo
    nodes = []
    for node in graph.nodes():
        node_data = graph.nodes[node]
        nodes.append({
            "id": node,
            "name": node_data.get("name", ""),
            "full_name": node_data.get("full_name", "")
        })
        
    edges = [{"source": u, "target": v, "type": data["type"]} for u, v, data in graph.edges(data=True)]

    # Agregar información de comunidad a cada nodo
    node_to_community = {}
    for i, community in enumerate(communities):
        for node in community:
            node_to_community[node] = i
            
    # Actualizar nodos con información de comunidad
    for node in nodes:
        node["community"] = node_to_community.get(node["id"], -1)  # -1 significa sin comunidad

    return {
        "nodes": nodes, 
        "edges": edges, 
        "communities": communities,
        "metrics": metrics,
        "raw_response": raw_response
    }

@app.get("/network_metrics/")
async def network_metrics(query: str, max_tweets: int = 100):
    print(f"Recibida solicitud de análisis de red para: '{query}' (max_tweets: {max_tweets})")
    
    try:
        # Obtener el grafo de usuarios y relaciones
        graph = get_tweets_and_build_graph(query, max_tweets)
        
        # Obtener la respuesta original de la API si existe
        raw_response = None
        if hasattr(graph, 'graph') and 'raw_response' in graph.graph:
            raw_response = graph.graph['raw_response']
        
        # Detectar comunidades en el grafo
        communities = detect_communities(graph)
        
        # Obtener métricas del grafo
        metrics = get_network_metrics(graph)
        
        # Preparar información de comunidades
        community_info = []
        for i, community in enumerate(communities):
            # Obtener los nodos de esta comunidad
            nodes_in_community = [{"id": node, "name": graph.nodes[node].get("name", "")} for node in community]
            
            # Ordenar por centralidad si está disponible
            if "influential_nodes" in metrics:
                influential_in_community = [node for node in metrics["influential_nodes"] if node["id"] in community]
                influential_in_community = sorted(influential_in_community, key=lambda x: x["centrality"], reverse=True)
                
                if influential_in_community:
                    community_info.append({
                        "id": i,
                        "size": len(community),
                        "nodes": nodes_in_community[:10],  # Limitar a 10 nodos para no sobrecargar
                        "top_nodes": influential_in_community[:3]  # Top 3 nodos influyentes
                    })
                else:
                    community_info.append({
                        "id": i,
                        "size": len(community),
                        "nodes": nodes_in_community[:10]
                    })
            else:
                community_info.append({
                    "id": i,
                    "size": len(community),
                    "nodes": nodes_in_community[:10]
                })
        
        # Ordenar comunidades por tamaño
        community_info.sort(key=lambda x: x["size"], reverse=True)
        
        return {
            "query": query,
            "metrics": metrics,
            "most_influential": metrics.get("influential_nodes", [])[:10],
            "communities": community_info,
            "raw_response": raw_response
        }
    except HTTPException as e:
        raise e
    except TooManyRequests as e:
        # Propagar excepciones de límite de tasa para que sean manejadas por el handler
        raise e
    except Exception as e:
        # Para cualquier otra excepción, devolver una respuesta de error genérica
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al procesar la solicitud: {str(e)}"
        )

@app.get("/user-info", response_model=UserInfoResponse)
@app.head("/user-info")  # Añadir soporte para método HEAD
def get_user_info_endpoint(request: Request, username: str = Query(None)):
    # Si es una solicitud HEAD o si username es None, retornar una respuesta vacía
    if request.method == "HEAD" or username is None:
        return UserInfoResponse(username="")
    
    print(f"Recibida solicitud para información de usuario: @{username}")
    
    try:
        # Usar la función del servicio de Twitter
        result = get_user_info(username)
        
        if "error" in result:
            # Verificar si es un error de límite de tasa
            if result.get("status_code") == 429:
                raise TooManyRequests("Twitter API rate limit exceeded")
                
            print(f"Error al obtener información para @{username}: {result['error']}")
            return UserInfoResponse(
                username=username,
                error=result["error"],
                raw_response=result.get("raw_response")
            )
        
        print(f"Información obtenida con éxito para @{username}")
        return UserInfoResponse(
            username=username,
            name=result.get("name"),
            raw_response=result.get("raw_response")
        )
    except TooManyRequests as e:
        # Propagar excepciones de límite de tasa para que sean manejadas por el handler
        raise e
    except Exception as e:
        # Para cualquier otra excepción, devolver una respuesta de error genérica
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al procesar la solicitud: {str(e)}"
        )

# Endpoint sencillo para verificar la conexión
@app.get("/health")
def check_health():
    status = {
        "status": "ok",
        "api_status": "unknown"
    }
    
    # Verificar el estado de la API de Twitter si el cliente está inicializado
    if client:
        try:
            # Intentar una petición simple para verificar la API
            client.get_user(username="twitter")
            status["api_status"] = "ok"
        except TooManyRequests:
            status["api_status"] = "rate_limited"
        except Exception as e:
            status["api_status"] = "error"
            status["api_error"] = str(e)
    else:
        status["api_status"] = "not_configured"
    
    return status
