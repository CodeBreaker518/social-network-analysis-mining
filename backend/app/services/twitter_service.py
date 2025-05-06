import tweepy
import networkx as nx
from typing import List, Dict, Any, Tuple, Optional
from fastapi import HTTPException
import os
from tweepy.errors import Forbidden, TweepyException, TooManyRequests
import sys
from pathlib import Path
import time
import random
import json
from datetime import datetime, timedelta

# Añadir la ruta raíz del backend al path de Python
backend_dir = Path(__file__).parent.parent.parent.absolute()
if str(backend_dir) not in sys.path:
    sys.path.append(str(backend_dir))

# Importar configuración
from config import TWITTER_API_KEY, TWITTER_API_SECRET, BEARER_TOKEN, TWITTER_ACCESS_TOKEN, TWITTER_ACCESS_SECRET

# Configuración de la API de Twitter
consumer_key = TWITTER_API_KEY
consumer_secret = TWITTER_API_SECRET
bearer_token = BEARER_TOKEN
access_token = TWITTER_ACCESS_TOKEN
access_secret = TWITTER_ACCESS_SECRET

# Sistema de caché simple
cache = {}
CACHE_DURATION = 3600  # 1 hora en segundos

# Configuración de reintentos
MAX_RETRIES = 3
INITIAL_BACKOFF = 2  # segundos

# Inicialización del cliente de Twitter
client = None

# Autenticación con Tweepy
try:
    # Asegurarnos de que tenemos el bearer token
    if not bearer_token:
        print("ERROR: No se ha encontrado el Bearer Token para la API de Twitter")
    else:
        try:
            # Inicializar cliente con el bearer token para la API v2
            print("Intentando inicializar cliente de Twitter V2 con Bearer Token...")
            client = tweepy.Client(bearer_token=bearer_token)
            
            # Opcional: verificar usuario propio si tenemos credenciales completas
            if consumer_key and consumer_secret and access_token and access_secret:
                client = tweepy.Client(
                    bearer_token=bearer_token,
                    consumer_key=consumer_key, 
                    consumer_secret=consumer_secret,
                    access_token=access_token, 
                    access_token_secret=access_secret
                )
                try:
                    test_response = client.get_me()
                    if test_response and hasattr(test_response, 'data'):
                        print(f"Cliente V2 con credenciales completas funciona correctamente. Conectado como: @{test_response.data.username}")
                except Exception as e:
                    print(f"Error al verificar cliente V2: {str(e)}")
                
        except Exception as e:
            print(f"Error al inicializar cliente de Twitter: {str(e)}")
except Exception as e:
    print(f"Error crítico al configurar la API de Twitter: {str(e)}")

# Funcion Decorador para caché y reintentos
def with_retry_and_cache(cache_key: str, cache_duration: int = CACHE_DURATION):
    def decorator(func):
        def wrapper(*args, **kwargs):
            # Construir clave de caché basada en los argumentos
            key = f"{cache_key}:{str(args)}:{str(kwargs)}"
            
            # Verificar caché
            if key in cache:
                cache_time, cache_data = cache[key]
                if datetime.now() - cache_time < timedelta(seconds=cache_duration):
                    print(f"Usando resultado en caché para: {key}")
                    return cache_data
            
            # Si no está en caché o ha expirado, hacer la llamada a la API
            retries = 0
            backoff = INITIAL_BACKOFF
            
            while retries <= MAX_RETRIES:
                try:
                    result = func(*args, **kwargs)
                    
                    # Guardar en caché
                    cache[key] = (datetime.now(), result)
                    return result
                    
                except TooManyRequests as e:
                    if retries == MAX_RETRIES:
                        print(f"Error después de {retries} reintentos: {str(e)}")
                        raise HTTPException(
                            status_code=429, 
                            detail=f"Twitter API rate limit exceeded. Please try again later. Retries: {retries}"
                        )
                    
                    # Backoff exponencial con jitter
                    sleep_time = backoff + (random.randint(0, 1000) / 1000.0)
                    print(f"Rate limit hit. Reintento {retries + 1}/{MAX_RETRIES} después de {sleep_time:.2f}s")
                    time.sleep(sleep_time)
                    backoff *= 2
                    retries += 1
                    
                except Exception as e:
                    print(f"Error no recuperable: {str(e)}")
                    raise
            
            raise HTTPException(status_code=500, detail="Maximum retries exceeded")
        
        return wrapper
    
    return decorator

# Función para convertir la respuesta de tweepy a un formato serializable
def convert_tweepy_response_to_dict(response):
    if response is None:
        return None
    
    # Función auxiliar para convertir objetos a diccionarios
    def object_to_dict(obj):
        if hasattr(obj, '_json'):
            return obj._json
        elif hasattr(obj, '__dict__'):
            return {k: object_to_dict(v) for k, v in obj.__dict__.items() 
                   if not k.startswith('_') and not callable(v)}
        elif isinstance(obj, (list, tuple)):
            return [object_to_dict(item) for item in obj]
        elif isinstance(obj, dict):
            return {k: object_to_dict(v) for k, v in obj.items()}
        elif isinstance(obj, (str, int, float, bool, type(None))):
            return obj
        else:
            # Para tipos que no se pueden convertir, usar su representación de cadena
            return str(obj)
            
    # Crear diccionario base
    result = {
        "includes": {},
        "meta": {},
        "errors": []
    }
    
    # Extraer datos principales si existen
    if hasattr(response, 'data'):
        if isinstance(response.data, list):
            result["data"] = [object_to_dict(item) for item in response.data]
        else:
            result["data"] = object_to_dict(response.data) if response.data else {}
    
    # Extraer includes si existen
    if hasattr(response, 'includes'):
        for key, items in response.includes.items():
            result["includes"][key] = [object_to_dict(item) for item in items]
    
    # Extraer meta si existe
    if hasattr(response, 'meta') and response.meta:
        result["meta"] = object_to_dict(response.meta)
    
    # Extraer errores si existen
    if hasattr(response, 'errors') and response.errors:
        result["errors"] = [object_to_dict(error) for error in response.errors]
    
    # Para respuestas simples o casos no cubiertos, intentar la conversión completa
    if not (hasattr(response, 'data') or hasattr(response, 'includes') or hasattr(response, 'meta')):
        try:
            return object_to_dict(response)
        except Exception as e:
            return {
                "error": "No se pudo serializar la respuesta completa",
                "error_detail": str(e),
                "response_str": str(response)
            }
        
    return result

# Función para buscar tweets
@with_retry_and_cache("search_tweets")
def search_tweets(query: str, max_tweets: int = 50):
    if not client:
        raise HTTPException(status_code=500, detail="Cliente de Twitter no inicializado")
        
    return client.search_recent_tweets(
        query=query, 
        max_results=max_tweets,
        tweet_fields=['author_id', 'context_annotations', 'created_at', 
                     'entities', 'public_metrics', 'referenced_tweets'],
        user_fields=['username', 'name', 'description', 'public_metrics'],
        expansions=['author_id', 'referenced_tweets.id', 
                   'referenced_tweets.id.author_id', 'entities.mentions.username']
    )

# Función para obtener tweets y construir el grafo de relaciones
def get_tweets_and_build_graph(query: str, max_tweets: int = 50) -> nx.Graph:
    print(f"Iniciando búsqueda y construcción de grafo para consulta: '{query}' (max_tweets: {max_tweets})")
    
    # Crear un grafo vacío
    G = nx.Graph()
    
    # Si se solicitan demasiados tweets, limitar para prevenir errores
    if max_tweets > 100:  # API v2 permite máximo 100 por solicitud
        print(f"Limitando solicitud de {max_tweets} a 100 tweets (límite de API v2)")
        max_tweets = 100
    
    try:
        # Usar la función con caché y reintentos
        response = search_tweets(query, max_tweets)
        
        # Procesar los resultados para construir el grafo
        if response and hasattr(response, 'data') and response.data:
            process_tweets(response, G)
        
        # Agregar la respuesta original a los atributos del grafo
        G.graph['raw_response'] = convert_tweepy_response_to_dict(response)
        
    except HTTPException as e:
        # Propagar errores HTTP
        raise e
    except Exception as e:
        print(f"Error al buscar tweets o construir grafo: {str(e)}")
        G.graph['error'] = str(e)
        
    return G

def process_tweets(response, G):
    # Verificar que tenemos datos y usuarios
    if not response.data or not response.includes.get('users'):
        return
    
    # Crear un diccionario para mapear IDs de usuarios a sus nombres
    users_dict = {user.id: {'username': user.username, 'name': user.name} 
                 for user in response.includes.get('users', [])}
    
    # Mapear tweets por ID para referencia rápida
    tweets_dict = {tweet.id: tweet for tweet in response.data}
    
    # Procesar cada tweet
    for tweet in response.data:
        author_id = tweet.author_id
        
        # Añadir el autor al grafo si no existe
        if not G.has_node(author_id) and author_id in users_dict:
            G.add_node(author_id, 
                      name=users_dict[author_id]['username'],
                      full_name=users_dict[author_id]['name'])
        
        # Procesar retweets y citas
        if hasattr(tweet, 'referenced_tweets') and tweet.referenced_tweets:
            for ref_tweet in tweet.referenced_tweets:
                # Obtener el tweet referenciado
                if ref_tweet.id in tweets_dict:
                    ref_tweet_data = tweets_dict[ref_tweet.id]
                    ref_author_id = ref_tweet_data.author_id
                    
                    # Añadir el autor del tweet referenciado al grafo
                    if ref_author_id in users_dict and not G.has_node(ref_author_id):
                        G.add_node(ref_author_id, 
                                  name=users_dict[ref_author_id]['username'],
                                  full_name=users_dict[ref_author_id]['name'])
                    
                    # Añadir la relación según el tipo
                    if ref_author_id in users_dict:
                        if ref_tweet.type == 'retweeted':
                            G.add_edge(author_id, ref_author_id, type='retweet')
                        elif ref_tweet.type == 'quoted':
                            G.add_edge(author_id, ref_author_id, type='quote')
                        elif ref_tweet.type == 'replied_to':
                            G.add_edge(author_id, ref_author_id, type='reply')
        
        # Procesar menciones
        if hasattr(tweet, 'entities') and 'mentions' in tweet.entities:
            for mention in tweet.entities['mentions']:
                mentioned_username = mention.get('username')
                mentioned_id = None
                
                # Buscar el ID correspondiente a este username
                for user_id, user_data in users_dict.items():
                    if user_data['username'] == mentioned_username:
                        mentioned_id = user_id
                        break
                
                if mentioned_id and mentioned_id != author_id:  # Evitar auto-menciones
                    # Añadir el usuario mencionado al grafo si no existe
                    if not G.has_node(mentioned_id):
                        G.add_node(mentioned_id, 
                                  name=mentioned_username,
                                  full_name=users_dict.get(mentioned_id, {}).get('name', mentioned_username))
                    
                    # Añadir la relación de mención
                    G.add_edge(author_id, mentioned_id, type='mention')

# Función para obtener métricas del grafo
def get_network_metrics(G: nx.Graph) -> Dict[str, Any]:
    metrics = {}
    
    if len(G.nodes()) == 0:
        return {"error": "Grafo vacío"}
    
    # Métricas básicas
    metrics["num_nodes"] = len(G.nodes())
    metrics["num_edges"] = len(G.edges())
    
    # Nodos más influyentes (por grado)
    degree_centrality = nx.degree_centrality(G)
    top_influential = sorted(degree_centrality.items(), key=lambda x: x[1], reverse=True)[:10]
    metrics["influential_nodes"] = [
        {"id": node_id, "name": G.nodes[node_id]["name"], "centrality": round(centrality, 4)}
        for node_id, centrality in top_influential
    ]
    
    # Tipos de conexiones
    edge_types = {}
    for _, _, attr in G.edges(data=True):
        edge_type = attr.get("type", "unknown")
        edge_types[edge_type] = edge_types.get(edge_type, 0) + 1
    metrics["edge_types"] = edge_types
    
    # Otros análisis si el grafo es suficientemente grande
    if len(G.nodes()) > 2:
        try:
            # Componentes conectados
            connected_components = list(nx.connected_components(G))
            metrics["connected_components"] = len(connected_components)
            metrics["largest_component_size"] = len(max(connected_components, key=len))
        except Exception as e:
            metrics["error_connected_components"] = str(e)
    
    return metrics

# Función para obtener las comunidades en el grafo
def detect_communities(G: nx.Graph) -> List[List[int]]:
    if len(G.nodes()) == 0:
        return []
        
    try:
        # Para grafos muy pequeños, usamos un enfoque simple
        if len(G.nodes()) < 3:
            return [list(G.nodes())]
            
        # Para grafos más grandes, usamos el algoritmo de Louvain
        import community as community_louvain
        partition = community_louvain.best_partition(G)
        
        # Reorganizar las comunidades
        communities = {}
        for node, community_id in partition.items():
            if community_id not in communities:
                communities[community_id] = []
            communities[community_id].append(node)
            
        return list(communities.values())
    except ImportError:
        # Si no está disponible community, usar nx.community
        try:
            # Usamos componentes conectados como una alternativa básica
            return list(nx.connected_components(G))
        except Exception:
            # Último recurso: cada nodo es su propia comunidad
            return [[node] for node in G.nodes()]

@with_retry_and_cache("get_user")
def get_user_by_username(username):
    if not client:
        raise HTTPException(status_code=500, detail="Cliente de Twitter no inicializado")
        
    return client.get_user(
        username=username,
        user_fields=['description', 'public_metrics', 'profile_image_url']
    )

# Función para obtener información de usuario
def get_user_info(username):
    if not client:
        return {"error": "Cliente de Twitter no inicializado. Verifique las credenciales."}
    
    try:
        # Usar la función con caché y reintentos
        response = get_user_by_username(username)
        
        # Convertir respuesta a diccionario para devolverla completa
        raw_response = convert_tweepy_response_to_dict(response)
        
        # Si no hay datos, devolver error
        if not response or not hasattr(response, 'data') or not response.data:
            return {
                "error": f"No se encontró información para el usuario @{username}",
                "raw_response": raw_response
            }
        
        # Extraer datos básicos del usuario
        user_data = response.data
        user_info = {
            "id": user_data.id,
            "username": username,
            "name": user_data.name if hasattr(user_data, "name") else None,
            "raw_response": raw_response
        }
        
        # Añadir métricas si están disponibles
        if hasattr(user_data, 'public_metrics'):
            metrics = user_data.public_metrics
            user_info.update({
                "followers_count": metrics.get('followers_count', 0),
                "following_count": metrics.get('following_count', 0),
                "tweet_count": metrics.get('tweet_count', 0)
            })
        
        return user_info
        
    except HTTPException as e:
        # Propagar errores HTTP
        return {"error": str(e.detail), "status_code": e.status_code}
    except Exception as e:
        print(f"Error al obtener información del usuario: {str(e)}")
        return {"error": f"Error al obtener información: {str(e)}"}