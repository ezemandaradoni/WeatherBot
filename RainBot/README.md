# Bot de alerta de lluvia por Telegram

Este proyecto revisa condiciones de lluvia en:

- Buzios
- Ilha Grande

Manda mensajes de Telegram para:

- lluvia anunciada para manana a las `10:00`
- lluvia anunciada para manana a las `22:00`
- lluvia prevista dentro de la proxima hora
- alertas oficiales importantes
- lluvia actual, indicando cuando se estima que pare

Ejemplo de alerta:

```text
Rain detected in Buzios

Temperature: 23.4 C
Condition: Moderate rain
Current rain: 3.2 mm
Humidity: 91%
Report time: 2026-04-25T08:00
```

## Como funciona

1. Consulta `forecast.json` de WeatherAPI con pronostico por hora y alertas.
2. Revisa Buzios e Ilha Grande.
3. Detecta eventos de lluvia por franja horaria, proximidad, lluvia actual y alertas importantes.
4. Guarda estado para no repetir mensajes innecesarios.

## Estructura

La logica propia de lluvia vive en:

- `alerts/`: reglas de deteccion y mensajes
- `locations.js`: ubicaciones monitoreadas
- `bot.js`: flujo principal del bot

La infraestructura compartida para lluvia y nieve vive en `WeatherBot/src/shared/`.

## Requisitos

- Node.js 18 o superior
- Un bot de Telegram
- Una API key de WeatherAPI

## Configuracion

1. Crea tu archivo `.env` a partir de `.env.example`.
2. Completa tus credenciales:

```env
CHECK_INTERVAL_MINUTES=15
DATA_DIR=./data

WEATHER_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
RAIN_TELEGRAM_BOT_TOKEN=123456789:AAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
RAIN_TELEGRAM_CHAT_ID=123456789
```

## Ejecutar

Chequeo unico:

```bash
node src/index.js --once
```

Mensaje de prueba a Telegram:

```bash
node src/index.js --test-message
```

Modo continuo:

```bash
node src/index.js
```

## Render

Este bot es el deploy activo del monorepo por ahora. En Render se usa el `render.yaml` de la raiz con `rootDir: RainBot`.

Variables necesarias:

```env
CHECK_INTERVAL_MINUTES=15
DATA_DIR=/opt/render/project/src/render-data
WEATHER_API_KEY=tu_weather_api_key
RAIN_TELEGRAM_BOT_TOKEN=tu_token_de_lluvia
RAIN_TELEGRAM_CHAT_ID=tu_chat_id_de_lluvia
```

## Evolucion sugerida

La base comun ya quedo unificada en `src/shared/`, asi que el siguiente paso natural seria compartir tambien helpers de mensajes o reglas si aparecen mas bots.
