# Análisis de Redes Sociales

Una aplicación web para analizar y visualizar redes sociales, específicamente las conexiones y comunidades de la red social Twitter.

## Características

- Búsqueda de usuarios y tweets por consultas específicas
- Visualización de grafos de redes sociales
- Análisis de métricas (centralidad, comunidades, influencia)
- Identificación de nodos influyentes y comunidades
- Interfaz intuitiva con múltiples vistas de datos

## Minería de Datos y Métodos de Procesamiento

Este proyecto utiliza diversas técnicas de minería de datos y análisis de redes sociales:

- **Teoría de grafos**: Utilizamos NetworkX para modelar relaciones entre usuarios como grafos
- **Detección de comunidades**: Aplicamos algoritmos de clustering para identificar grupos cohesivos
- **Métricas de centralidad**: Calculamos grado de centralidad, intermediación y cercanía para identificar nodos influyentes
- **Análisis de patrones de interacción**: Modelamos diferentes tipos de interacciones (retweets, menciones, respuestas)
- **Técnicas de caché y optimización**: Minimizamos llamadas a la API y mejoramos los tiempos de respuesta
- **Visualización de datos de red**: Representación visual interactiva de las comunidades y sus conexiones

## Estructura del proyecto

- **frontend**: Aplicación web en Next.js con componentes UI modernos y de visualizacion
- **backend**: Desarrollo de Api con FastAPI (python) que utiliza la API de X/Twitter y procesa datos de tweets

## Requisitos

- Python 3.8+ (backend)
- Node.js 16+ (frontend)
- Credenciales de API de Twitter

## Instalación

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

Configura tus credenciales de Twitter en un archivo `.env` en la raíz del proyecto:

```
TWITTER_API_KEY=your_api_key
TWITTER_API_SECRET=your_api_secret
BEARER_TOKEN=your_bearer_token
TWITTER_ACCESS_TOKEN=your_access_token
TWITTER_ACCESS_SECRET=your_access_secret
```

### Frontend

```bash
cd frontend
bun install
```

## Uso

### Iniciar el backend

```bash
cd backend
venv\Scripts\activate
uvicorn app.main:app --reload
```

### Iniciar el frontend

```bash
cd frontend
bun dev
```

Navega a `http://localhost:3000` para usar la aplicación.


Esta herramienta permite entender:
- Estructuras de comunidades en conversaciones digitales
- Patrones de influencia y difusión de información
- Polarización y agrupaciones temáticas
- Actores clave en conversaciones sobre temas específicos
- Flujos de información y propagación de contenido
- Descubrimiento de subtemas emergentes en conversaciones
