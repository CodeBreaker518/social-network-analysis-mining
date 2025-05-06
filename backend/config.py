from dotenv import load_dotenv
import os
import sys
from pathlib import Path

# Obtener la ruta del directorio actual (backend)
current_dir = Path(__file__).parent.absolute()
# Obtener la ruta raíz del monorepo (subir un nivel)
root_dir = current_dir.parent.absolute()

# Intenta cargar .env desde la raíz del monorepo
if os.path.exists(os.path.join(root_dir, ".env")):
    load_dotenv(os.path.join(root_dir, ".env"))
    print(f"Cargando variables de entorno desde: {os.path.join(root_dir, '.env')}")
# Si no existe, intenta cargar desde backend
elif os.path.exists(os.path.join(current_dir, ".env")):
    load_dotenv(os.path.join(current_dir, ".env"))
    print(f"Cargando variables de entorno desde: {os.path.join(current_dir, '.env')}")
else:
    print("No se encontró el archivo .env")

# Verificar que las variables necesarias estén disponibles
TWITTER_API_KEY = os.getenv("TWITTER_API_KEY")
TWITTER_API_SECRET = os.getenv("TWITTER_API_SECRET")
BEARER_TOKEN = os.getenv("BEARER_TOKEN")
TWITTER_ACCESS_TOKEN = os.getenv("TWITTER_ACCESS_TOKEN")
TWITTER_ACCESS_SECRET = os.getenv("TWITTER_ACCESS_SECRET")

# Imprimir información de diagnóstico (no incluye valores sensibles)
print(f"BEARER_TOKEN definido: {'Sí' if BEARER_TOKEN else 'No'}")
print(f"TWITTER_API_KEY definido: {'Sí' if TWITTER_API_KEY else 'No'}")
print(f"TWITTER_API_SECRET definido: {'Sí' if TWITTER_API_SECRET else 'No'}")
print(f"TWITTER_ACCESS_TOKEN definido: {'Sí' if TWITTER_ACCESS_TOKEN else 'No'}")
print(f"TWITTER_ACCESS_SECRET definido: {'Sí' if TWITTER_ACCESS_SECRET else 'No'}")