# WeatherBot Monorepo

Monorepo para bots de alertas meteorologicas por Telegram.

## Estructura

- `SnowBot/`: logica de alertas de nieve
- `RainBot/`: logica de alertas de lluvia en Brasil
- `src/`: arranque del worker unico y utilidades compartidas

## Deploy actual

Por ahora el deploy de Render esta pensado para `SnowBot`, usando [render.yaml](C:\Users\Ezequiel\Documents\Codex\WeatherBot\render.yaml) en la raiz con `rootDir: SnowBot`.

`RainBot` queda dentro del monorepo y se puede volver a desplegar despues cambiando el mismo worker para que apunte otra vez a `RainBot`.
