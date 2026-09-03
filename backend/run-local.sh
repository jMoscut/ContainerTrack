#!/usr/bin/env bash
# Corre el backend localmente cargando las variables de .env.local
# Uso: ./run-local.sh   (desde Git Bash)
set -e
cd "$(dirname "$0")"

if [ ! -f .env.local ]; then
  echo "No existe .env.local -- editalo primero (contiene DATABASE_URL de Neon)." >&2
  exit 1
fi

# No usamos `source` porque los valores (DATABASE_URL) contienen '&' sin comillas,
# que bash interpretaria como separador de comandos en background.
while IFS='=' read -r key value; do
  [[ -z "$key" || "$key" == \#* ]] && continue
  export "$key=$value"
done < .env.local

echo "Variables cargadas desde .env.local. Iniciando backend..."
./mvnw spring-boot:run
