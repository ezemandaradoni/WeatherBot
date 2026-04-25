# Bot de alerta de lluvia por Telegram

Este proyecto revisa si esta lloviendo en:

- Buzios
- Ilha Grande

Cuando detecta que **empieza** a llover en una ubicacion, manda un mensaje de Telegram y evita repetirlo mientras la lluvia siga activa.

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

1. Consulta el clima actual en WeatherAPI.
2. Revisa la condicion actual, el codigo meteorologico y la precipitacion actual.
3. Si una ubicacion pasa de "sin lluvia" a "con lluvia", envia un mensaje por Telegram.
4. Guarda el ultimo estado en `data/state.json`.

## Estructura

La carpeta `src/` esta separada para que despues podamos compartir piezas entre bots sin rehacer la logica:

- `alerts/`: reglas de deteccion y mensajes
- `services/`: integraciones con WeatherAPI y Telegram
- `state-store.js`: persistencia simple del ultimo estado
- `config.js` y `locations.js`: configuracion y ubicaciones monitoreadas

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
TELEGRAM_BOT_TOKEN=123456789:AAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TELEGRAM_CHAT_ID=123456789
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

## Desplegar en Render

En el monorepo, la configuracion de Render vive en [render.yaml](C:\Users\Ezequiel\Documents\Codex\WeatherBot\render.yaml) y este bot se despliega con `rootDir: RainBot`.

### Pasos

1. Sube este proyecto a GitHub.
2. En Render, entra a **New +** > **Blueprint**.
3. Conecta el repo `WeatherBot`.
4. Render va a detectar el `render.yaml` de la raiz y crear el worker `telegram-rain-alert-bot`.
5. Completa las variables secretas:

```env
WEATHER_API_KEY=tu_weather_api_key
TELEGRAM_BOT_TOKEN=tu_token
TELEGRAM_CHAT_ID=tu_chat_id
```

## Evolucion sugerida

Si despues queres compartir codigo con `SnowBot`, la ruta natural es extraer a una carpeta comun:

- cliente de WeatherAPI
- cliente de Telegram
- carga de `.env`
- almacenamiento de estado

Por ahora `SnowBot` queda intacto y `RainBot` ya nace con esa separacion interna.
