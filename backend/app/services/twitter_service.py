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
from collections import Counter
from textblob import TextBlob
import re
import nltk
nltk.download('stopwords', quiet=True)
from nltk.corpus import stopwords
spanish_stopwords = set(stopwords.words('spanish'))
from transformers import pipeline

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

# Variables globales
cache = {}
last_cache_cleanup = datetime.now()
CACHE_CLEANUP_INTERVAL = 3600  # 1 hora
CACHE_DURATION = 7200  # 2 horas
MAX_RETRIES = 3
INITIAL_BACKOFF = 2  # segundos
client = None
nltk_initialized = False
sentiment_analyzer = None

def initialize_sentiment_analyzer():
    """Inicializa el analizador de sentimientos usando BERT multilingüe."""
    global sentiment_analyzer
    try:
        sentiment_analyzer = pipeline(
            "sentiment-analysis",
            model="nlptown/bert-base-multilingual-uncased-sentiment",
            truncation=True
        )
        print("Modelo de análisis de sentimientos inicializado correctamente")
        return True
    except Exception as e:
        print(f"Error al inicializar el modelo de sentimientos: {str(e)}")
        return False

def initialize_twitter_client():
    global client
    try:
        if not bearer_token:
            print("ERROR: No se ha encontrado el Bearer Token para la API de Twitter")
            return False
            
        print("Intentando inicializar cliente de Twitter V2 con Bearer Token...")
        client = tweepy.Client(
            bearer_token=bearer_token,
            wait_on_rate_limit=True
        )
        
        if consumer_key and consumer_secret and access_token and access_secret:
            try:
                client = tweepy.Client(
                    bearer_token=bearer_token,
                    consumer_key=consumer_key, 
                    consumer_secret=consumer_secret,
                    access_token=access_token, 
                    access_token_secret=access_secret,
                    wait_on_rate_limit=True
                )
                print("Cliente de Twitter inicializado con credenciales completas")
                return True
            except Exception as e:
                print(f"Error al inicializar cliente con credenciales completas: {str(e)}")
                client = tweepy.Client(bearer_token=bearer_token, wait_on_rate_limit=True)
                print("Cliente de Twitter inicializado solo con Bearer Token")
                return True
        print("Cliente de Twitter inicializado solo con Bearer Token")
        return True
    except Exception as e:
        print(f"Error al inicializar cliente de Twitter: {str(e)}")
        return False

# Inicialización de servicios
print("Iniciando servicios...")
if not initialize_twitter_client():
    print("ADVERTENCIA: No se pudo inicializar el cliente de Twitter al inicio")

try:
    if initialize_sentiment_analyzer():
        print("Analizador de sentimientos inicializado correctamente")
    else:
        print("ADVERTENCIA: No se pudo inicializar el analizador de sentimientos")
except Exception as e:
    print(f"Error al inicializar el analizador de sentimientos: {str(e)}")

# Funcion Decorador para caché y reintentos
def with_retry_and_cache(cache_key: str, cache_duration: int = None):
    def decorator(func):
        def wrapper(*args, **kwargs):
            # Construir clave de caché basada en los argumentos
            key = f"{cache_key}:{str(args)}:{str(kwargs)}"
            
            # Verificar caché
            if key in cache:
                print(f"Usando resultado en caché para: {key}")
                return cache[key]
            
            # Si no está en caché, hacer la llamada a la API
            retries = 0
            backoff = INITIAL_BACKOFF
            last_error = None
            
            while retries <= MAX_RETRIES:
                try:
                    result = func(*args, **kwargs)
                    
                    # Guardar en caché solo si la llamada fue exitosa
                    if result:
                        cache[key] = result
                        print(f"Guardando nuevo resultado en caché para: {key}")
                    return result
                    
                except TooManyRequests as e:
                    last_error = e
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
                    last_error = e
                    print(f"Error no recuperable: {str(e)}")
                    raise
            
            if last_error:
                raise last_error
            raise HTTPException(status_code=500, detail="Maximum retries exceeded")
        
        return wrapper
    
    return decorator

# Función para convertir la respuesta de tweepy a un formato JSON
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
    global client
    if not client:
        # Intentar reinicializar el cliente si no está disponible
        if not initialize_twitter_client():
            print("Error: No se pudo inicializar el cliente de Twitter")
            raise HTTPException(
                status_code=503,
                detail="Servicio de Twitter temporalmente no disponible. Por favor, intente más tarde."
            )
    
    try:
        print(f"Realizando búsqueda de tweets para: {query}")
        response = client.search_recent_tweets(
            query=query, 
            max_results=max_tweets,
            tweet_fields=['author_id', 'context_annotations', 'created_at', 
                         'entities', 'public_metrics', 'referenced_tweets'],
            user_fields=['username', 'name', 'description', 'public_metrics'],
            expansions=['author_id', 'referenced_tweets.id', 
                       'referenced_tweets.id.author_id', 'entities.mentions.username']
        )
        
        if not response or not hasattr(response, 'data'):
            print(f"No se encontraron resultados para la consulta: {query}")
            return None
            
        print(f"Se encontraron {len(response.data) if response.data else 0} tweets")
        return response
        
    except TooManyRequests as e:
        print(f"Error de límite de tasa: {str(e)}")
        raise HTTPException(
            status_code=429,
            detail="Límite de solicitudes a la API de Twitter excedido. Por favor, espere unos minutos."
        )
    except TweepyException as e:
        print(f"Error de Tweepy: {str(e)}")
        raise HTTPException(
            status_code=503,
            detail=f"Error al acceder a la API de Twitter: {str(e)}"
        )
    except Exception as e:
        print(f"Error inesperado al buscar tweets: {str(e)}")
        raise HTTPException(
            status_code=503,
            detail=f"Error inesperado al buscar tweets: {str(e)}"
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
        
        if not response:
            raise HTTPException(
                status_code=404,
                detail="No se obtuvieron resultados de la búsqueda."
            )
        
        # Procesar los resultados para construir el grafo
        if hasattr(response, 'data') and response.data:
            try:
                process_tweets(response, G)
            except Exception as e:
                print(f"Error procesando tweets: {str(e)}")
                raise HTTPException(
                    status_code=500,
                    detail=f"Error procesando tweets: {str(e)}"
                )
        else:
            print("No se encontraron tweets que cumplan los criterios")
            raise HTTPException(
                status_code=404,
                detail="No se encontraron tweets que cumplan los criterios de búsqueda."
            )
        
        # Agregar la respuesta original a los atributos del grafo
        G.graph['raw_response'] = convert_tweepy_response_to_dict(response)
        
    except HTTPException as e:
        # Propagar errores HTTP
        raise e
    except TooManyRequests:
        print("Error: Límite de solicitudes excedido")
        raise HTTPException(
            status_code=429,
            detail="Límite de solicitudes a la API de Twitter excedido. Por favor, espere unos minutos."
        )
    except Exception as e:
        print(f"Error al buscar tweets o construir grafo: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error inesperado: {str(e)}"
        )
        
    return G

def process_tweets(response, G):
    """Procesa los tweets y construye el grafo de relaciones."""
    tweet_texts = []
    tweet_examples = []
    hashtags = []
    words = []
    urls = []
    users_dict = {}
    
    # Procesar usuarios primero
    if hasattr(response, 'includes') and 'users' in response.includes:
        for user in response.includes['users']:
            user_id = getattr(user, 'id', None)
            if user_id:
                users_dict[user_id] = {
                    'username': getattr(user, 'username', ''),
                    'name': getattr(user, 'name', ''),
                    'followers_count': getattr(user, 'public_metrics', {}).get('followers_count', 0),
                    'following_count': getattr(user, 'public_metrics', {}).get('following_count', 0),
                    'tweet_count': getattr(user, 'public_metrics', {}).get('tweet_count', 0)
                }
    
    # Procesar tweets
    for tweet in response.data:
        try:
            # Extraer información básica del tweet
            text = getattr(tweet, 'text', '')
            author_id = getattr(tweet, 'author_id', None)
            
            if not author_id or author_id not in users_dict:
                continue
                
            # Calcular engagement score
            metrics = getattr(tweet, 'public_metrics', {})
            engagement_score = sum([
                metrics.get('retweet_count', 0) * 2,
                metrics.get('reply_count', 0) * 3,
                metrics.get('like_count', 0),
                metrics.get('quote_count', 0) * 2
            ])
            
            # Obtener ID del tweet de manera segura
            tweet_id = getattr(tweet, 'id', 'unknown')
            created_at = getattr(tweet, 'created_at', None)
            created_at_str = created_at.isoformat() if created_at else None
            
            # Crear objeto de tweet con metadata completa
            tweet_obj = {
                'id': str(tweet_id),
                'text': text,
                'author': users_dict[author_id]['username'],
                'author_name': users_dict[author_id]['name'],
                'created_at': created_at_str,
                'engagement_score': engagement_score
            }
            
            tweet_texts.append(text)
            tweet_examples.append(tweet_obj)
            
            # Extraer hashtags de manera segura
            if hasattr(tweet, 'entities') and tweet.entities:
                for hashtag in tweet.entities.get('hashtags', []):
                    tag = hashtag.get('tag', '') or hashtag.get('text', '')
                    if tag:
                        hashtags.append(tag.lower())
            
            # Extraer palabras (limpiando)
            clean = re.sub(r'http\S+|[^\wáéíóúüñ#@]', ' ', text.lower())
            for w in clean.split():
                if w not in spanish_stopwords and len(w) > 2 and not w.startswith('@'):
                    words.append(w)
            
            # Extraer URLs de manera segura
            if hasattr(tweet, 'entities') and tweet.entities:
                for url in tweet.entities.get('urls', []):
                    expanded_url = url.get('expanded_url') or url.get('url')
                    if expanded_url:
                        urls.append(expanded_url)
            
            # Agregar nodo del autor si no existe
            if not G.has_node(author_id):
                G.add_node(author_id,
                          name=users_dict[author_id]['username'],
                          full_name=users_dict[author_id]['name'])
                            
            # Procesar retweets y citas
            if hasattr(tweet, 'referenced_tweets') and tweet.referenced_tweets:
                for ref_tweet in tweet.referenced_tweets:
                    ref_id = getattr(ref_tweet, 'id', None)
                    if not ref_id:
                        continue
                        
                    ref_author_id = None
                    # Buscar el autor del tweet referenciado en los usuarios
                    if hasattr(response, 'includes') and 'tweets' in response.includes:
                        for included_tweet in response.includes['tweets']:
                            if getattr(included_tweet, 'id', None) == ref_id:
                                ref_author_id = getattr(included_tweet, 'author_id', None)
                                break
                    
                    if ref_author_id and ref_author_id in users_dict:
                        if not G.has_node(ref_author_id):
                            G.add_node(ref_author_id,
                                     name=users_dict[ref_author_id]['username'],
                                     full_name=users_dict[ref_author_id]['name'])
                        
                        edge_type = getattr(ref_tweet, 'type', 'unknown')
                        if edge_type == 'retweeted':
                            G.add_edge(author_id, ref_author_id, type='retweet')
                        elif edge_type == 'quoted':
                            G.add_edge(author_id, ref_author_id, type='quote')
                        elif edge_type == 'replied_to':
                            G.add_edge(author_id, ref_author_id, type='reply')
                            
            # Procesar menciones de manera segura
            if hasattr(tweet, 'entities') and tweet.entities:
                for mention in tweet.entities.get('mentions', []):
                    mentioned_username = mention.get('username')
                    if not mentioned_username:
                        continue
                        
                    # Buscar el ID del usuario mencionado
                    mentioned_id = None
                    for user_id, user_data in users_dict.items():
                        if user_data['username'] == mentioned_username:
                            mentioned_id = user_id
                            break
                            
                    if mentioned_id and mentioned_id != author_id:
                        if not G.has_node(mentioned_id):
                            G.add_node(mentioned_id,
                                     name=mentioned_username,
                                     full_name=users_dict.get(mentioned_id, {}).get('name', mentioned_username))
                        G.add_edge(author_id, mentioned_id, type='mention')
                        
        except Exception as e:
            print(f"Error procesando tweet {getattr(tweet, 'id', 'unknown')}: {str(e)}")
            continue

    # Guardar datos crudos para análisis posterior
    G.graph['tweet_texts'] = tweet_texts
    G.graph['tweet_examples'] = tweet_examples
    G.graph['hashtags'] = hashtags
    G.graph['words'] = words
    G.graph['urls'] = urls

def analyze_sentiment(text: str) -> float:
    """Analiza el sentimiento de un texto usando BERT multilingüe."""
    global sentiment_analyzer
    
    if not sentiment_analyzer:
        try:
            from transformers import pipeline
            sentiment_analyzer = pipeline(
                "sentiment-analysis",
                model="nlptown/bert-base-multilingual-uncased-sentiment",
                truncation=True
            )
        except Exception as e:
            print(f"Error al inicializar el modelo de sentimientos: {str(e)}")
            return 0.0
    
    try:
        # El modelo retorna valores de 1 a 5 estrellas
        result = sentiment_analyzer(text[:512])[0]  # Limitar a 512 tokens
        # Convertir de escala 1-5 a -1 a 1
        score = (float(result['label'][0]) - 3) / 2
        return score
    except Exception as e:
        print(f"Error en análisis de sentimientos: {str(e)}")
        return 0.0  # En caso de error, retornar neutro

# Función para obtener métricas del grafo
def get_network_metrics(G: nx.Graph) -> Dict[str, Any]:
    """Obtiene métricas del grafo."""
    metrics = {}
    if len(G.nodes()) == 0:
        return {"error": "Grafo vacío"}
    
    try:
        # Métricas básicas de red
        metrics["num_nodes"] = len(G.nodes())
        metrics["num_edges"] = len(G.edges())
        
        # Calcular diferentes tipos de centralidad
        degree_centrality = nx.degree_centrality(G)
        betweenness_centrality = nx.betweenness_centrality(G)
        eigenvector_centrality = nx.eigenvector_centrality(G, max_iter=1000)
        
        # Combinar métricas de centralidad
        node_importance = {}
        for node in G.nodes():
            node_importance[node] = (
                degree_centrality.get(node, 0) * 0.4 +
                betweenness_centrality.get(node, 0) * 0.3 +
                eigenvector_centrality.get(node, 0) * 0.3
            )
        
        # Obtener los usuarios más influyentes
        top_influential = sorted(node_importance.items(), key=lambda x: x[1], reverse=True)[:10]
        metrics["influential_nodes"] = [
            {
                "id": node_id,
                "name": G.nodes[node_id].get("name", "unknown"),
                "full_name": G.nodes[node_id].get("full_name", ""),
                "centrality": round(centrality, 4),
                "metrics": {
                    "degree": round(degree_centrality[node_id], 4),
                    "betweenness": round(betweenness_centrality[node_id], 4),
                    "eigenvector": round(eigenvector_centrality[node_id], 4)
                }
            }
            for node_id, centrality in top_influential
        ]
        
        # Tipos de conexiones
        edge_types = {}
        for _, _, attr in G.edges(data=True):
            edge_type = attr.get("type", "unknown")
            edge_types[edge_type] = edge_types.get(edge_type, 0) + 1
        metrics["edge_types"] = edge_types
        
        # Métricas de red adicionales
        metrics["density"] = round(nx.density(G), 4)
        metrics["clustering"] = round(nx.average_clustering(G), 4)
        
        # Métricas de componentes
        components = list(nx.connected_components(G))
        metrics["connected_components"] = len(components)
        metrics["largest_component_size"] = len(max(components, key=len))
        
        # Detectar comunidades
        communities = detect_communities(G)
        
        # Procesar información de comunidades
        metrics["communities"] = []
        for i, community in enumerate(communities):
            # Calcular nodos más importantes de la comunidad
            community_subgraph = G.subgraph(community)
            community_centrality = nx.degree_centrality(community_subgraph)
            top_nodes = sorted(community_centrality.items(), key=lambda x: x[1], reverse=True)[:5]
            
            community_info = {
                "id": i + 1,
                "name": f"Comunidad {i + 1}",
                "size": len(community),
                "nodes": [{
                    "id": node,
                    "name": G.nodes[node].get("name", "unknown"),
                    "full_name": G.nodes[node].get("full_name", "")
                } for node in community],
                "top_nodes": [{
                    "id": node,
                    "name": G.nodes[node].get("name", "unknown"),
                    "centrality": round(centrality, 4)
                } for node, centrality in top_nodes]
            }
            metrics["communities"].append(community_info)
        
        # Procesar datos del grafo
        tweet_sentiments = []
        if 'tweet_texts' in G.graph:
            # Analizar sentimiento de los tweets
            sentiments = []
            for idx, text in enumerate(G.graph['tweet_texts']):
                sentiment_score = analyze_sentiment(text)
                if sentiment_score > 0.2:
                    sentiments.append('positivo')
                elif sentiment_score < -0.2:
                    sentiments.append('negativo')
                else:
                    sentiments.append('neutro')
                tweet_sentiments.append(sentiment_score)
            # Calcular proporciones de sentimiento
            total_tweets = len(sentiments)
            if total_tweets > 0:
                sentiment_counts = Counter(sentiments)
                metrics["sentiment"] = {
                    "positivo": sentiment_counts['positivo'] / total_tweets,
                    "negativo": sentiment_counts['negativo'] / total_tweets,
                    "neutro": sentiment_counts['neutro'] / total_tweets
                }
            else:
                metrics["sentiment"] = {
                    "positivo": 0,
                    "negativo": 0,
                    "neutro": 1  # Por defecto neutro si no hay tweets
                }
        # Asociar sentimiento a cada tweet_example
        representative_examples = {"positivo": None, "negativo": None}
        if 'tweet_examples' in G.graph and tweet_sentiments:
            tweet_examples = G.graph['tweet_examples']
            # Añadir el score a cada tweet_example
            for i, tw in enumerate(tweet_examples):
                tw['sentiment_score'] = tweet_sentiments[i] if i < len(tweet_sentiments) else 0.0
            # Seleccionar el positivo y negativo más representativo
            positivos = [tw for tw in tweet_examples if tw['sentiment_score'] > 0.2]
            negativos = [tw for tw in tweet_examples if tw['sentiment_score'] < -0.2]
            if positivos:
                representative_examples['positivo'] = max(positivos, key=lambda t: t['sentiment_score'])
            if negativos:
                representative_examples['negativo'] = min(negativos, key=lambda t: t['sentiment_score'])
        metrics['representative_examples'] = representative_examples
        if 'tweet_examples' in G.graph:
            metrics['tweet_examples'] = G.graph['tweet_examples']
        
        # Insights principales
        insights = {}
        if 'hashtags' in G.graph and G.graph['hashtags']:
            hashtag_counts = Counter(G.graph['hashtags'])
            insights['top_hashtags'] = [
                {'hashtag': ht, 'count': cnt}
                for ht, cnt in hashtag_counts.most_common(5)
            ]
        else:
            insights['top_hashtags'] = []
        if 'words' in G.graph and G.graph['words']:
            word_counts = Counter(G.graph['words'])
            insights['top_keywords'] = [
                {'word': w, 'count': cnt}
                for w, cnt in word_counts.most_common(5)
            ]
        else:
            insights['top_keywords'] = []
        if 'urls' in G.graph and G.graph['urls']:
            url_counts = Counter(G.graph['urls'])
            insights['top_urls'] = [
                {'url': u, 'count': cnt}
                for u, cnt in url_counts.most_common(5)
            ]
        else:
            insights['top_urls'] = []
        metrics['insights'] = insights
        
        return metrics
    except Exception as e:
        print(f"Error al calcular métricas: {str(e)}")
        return {"error": f"Error al calcular métricas: {str(e)}"}

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
        
        # Detectar comunidades
        partition = community_louvain.best_partition(G)
        
        # Reorganizar las comunidades
        communities = {}
        for node, community_id in partition.items():
            if community_id not in communities:
                communities[community_id] = []
            communities[community_id].append(node)
        
        # Ordenar comunidades por tamaño
        sorted_communities = sorted(communities.values(), key=len, reverse=True)
        
        return sorted_communities
        
    except ImportError:
        print("Advertencia: módulo community no encontrado, usando método alternativo")
        # Si no está disponible community, usar componentes conectados
        return [list(c) for c in nx.connected_components(G)]
    except Exception as e:
        print(f"Error en detect_communities: {str(e)}")
        # En caso de error, retornar cada nodo como su propia comunidad
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