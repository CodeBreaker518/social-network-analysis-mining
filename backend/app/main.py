from fastapi import FastAPI, HTTPException, Query, Request, status
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from app.services.twitter_service import get_tweets_and_build_graph, detect_communities, client, get_network_metrics, get_user_info
import tweepy
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from tweepy.errors import TooManyRequests
import logging
from datetime import datetime, timedelta

# Configurar logging más eficiente
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Social Network Mining API",
    description="API para análisis de redes sociales en Twitter/X",
    version="1.0.0"
)

# Configuración CORS optimizada
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Solo permitir el frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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
    max_tweets: int = 50

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
            node_to_community[node] = i + 1  # Usar 1-based indexing para coincidir con las comunidades
            
    # Actualizar nodos con información de comunidad y métricas
    for node in nodes:
        node_id = node["id"]
        node["community"] = node_to_community.get(node_id, -1)  # -1 significa sin comunidad
        # Agregar información de influencia si está disponible
        if "influential_nodes" in metrics:
            for influential in metrics["influential_nodes"]:
                if influential["id"] == node_id:
                    node["metrics"] = influential["metrics"]
                    node["centrality"] = influential["centrality"]
                    break

    return {
        "nodes": nodes, 
        "edges": edges, 
        "communities": communities,
        "metrics": metrics,
        "raw_response": raw_response
    }

@app.get("/health")
async def health_check():
    if not client:
        return {"status": "error", "api_status": "error", "message": "Twitter client not initialized"}
    try:
        test_response = client.get_me()
        return {
            "status": "ok",
            "api_status": "ok" if test_response else "error",
            "message": "API connection successful"
        }
    except Exception as e:
        return {"status": "error", "api_status": "error", "message": str(e)}

@app.get("/network_metrics/")
async def analyze_network(
    query: str,
    max_tweets: int = Query(default=50, le=100)  # Limitar máximo de tweets
):
    logger.info(f"Recibida solicitud de análisis de red para: '{query}' (max_tweets: {max_tweets})")
    
    try:
        graph = get_tweets_and_build_graph(query, max_tweets)
        
        if not graph or len(graph.nodes()) == 0:
            raise HTTPException(
                status_code=404,
                detail="No se encontraron tweets o usuarios que cumplan los criterios de búsqueda."
            )
        
        metrics = get_network_metrics(graph)
        
        if not metrics:
            raise HTTPException(
                status_code=500,
                detail="No se pudieron calcular las métricas del grafo."
            )
        
        if "error" in metrics:
            raise HTTPException(
                status_code=500,
                detail=f"Error al calcular métricas: {metrics['error']}"
            )
        
        return metrics
        
    except Exception as e:
        logger.error(f"Error en analyze_network: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

@app.get("/user-info")
async def get_user_info_endpoint(username: str):
    try:
        user_info = get_user_info(username)
        
        if "error" in user_info:
            raise HTTPException(
                status_code=user_info.get("status_code", 500),
                detail=user_info["error"]
            )
            
        return user_info
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
