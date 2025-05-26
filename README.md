# Social Network Mining

Aplicación para análisis de redes sociales que permite visualizar y analizar conexiones entre usuarios, comunidades y tendencias en Twitter/X. Utiliza un sistema de caché en memoria para un rendimiento óptimo.

## Características Principales

- Búsqueda y análisis de tweets en tiempo real
- Visualización de redes de interacción entre usuarios
- Detección de comunidades y usuarios influyentes
- Sistema de caché optimizado para consultas rápidas
- Interfaz moderna y responsiva

## Requisitos

- Python 3.8 o superior
- Node.js 14 o superior
- Bun.sh
- Credenciales de API de Twitter/X

## Configuración

1. Clona el repositorio:
```bash
git clone https://github.com/tu-usuario/social-network-mining.git
cd social-network-mining
```

2. Configura las variables de entorno:
   - Crea un archivo `.env` en la raiz del proyecto con las siguientes variables:
```env
TWITTER_API_KEY=tu_api_key
TWITTER_API_SECRET=tu_api_secret
BEARER_TOKEN=tu_bearer_token
TWITTER_ACCESS_TOKEN=tu_access_token
TWITTER_ACCESS_SECRET=tu_access_secret
```

3. Instala las dependencias del backend:
```bash
cd backend
python -m venv venv
source venv/bin/activate  # En Windows: venv\Scripts\activate
pip install -r requirements.txt
```

4. Instala las dependencias del frontend:
```bash
cd frontend
bun install  # o npm install
```

## Uso

1. Inicia el backend:
```bash
cd backend
source venv/bin/activate  # En Windows: venv\Scripts\activate
uvicorn app.main:app --reload
```
El backend se iniciará en `http://localhost:8000`.

2. Inicia el frontend:
```bash
cd frontend
bun run dev  # o npm run dev
```
El frontend estará disponible en `http://localhost:3000`

## Arquitectura

El proyecto utiliza una arquitectura moderna y eficiente:

### Backend
- FastAPI para el servidor REST
- Sistema de caché en memoria para optimizar consultas
- Procesamiento asíncrono de peticiones
- Análisis de redes sociales con NetworkX
- Gestión eficiente de la API de Twitter

### Frontend
- Next.js 13+ con App Router
- Interfaz moderna con Tailwind CSS
- Visualización de grafos interactiva
- Componentes reutilizables

## Estructura del proyecto

```
social-network-mining/
├── backend/
│   ├── app/
│   │   ├── services/
│   │   │   └── twitter_service.py
│   │   └── main.py
│   └── requirements.txt
└── frontend/
    ├── app/
    ├── components/
    │   ├── search/
    │   └── results/
    └── package.json
```

## Sistema de Caché

El proyecto implementa un sistema de caché en memoria que:
- Almacena permanentemente los resultados de todas las búsquedas realizadas
- Reutiliza automáticamente los resultados de búsquedas idénticas previas
- Evita llamadas innecesarias a la API de Twitter
- Mejora significativamente el tiempo de respuesta para búsquedas repetidas
- No tiene expiración de datos, manteniendo todo el historial de búsquedas

## Contribuir

1. Haz fork del repositorio
2. Crea una rama para tu feature (`git checkout -b feature/nueva-funcionalidad`)
3. Haz commit de tus cambios (`git commit -am 'Añade nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Crea un Pull Request
