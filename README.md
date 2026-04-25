# WeatherBot Monorepo

Monorepo para bots de alertas meteorologicas por Telegram.

## Estructura

- `SnowBot/`: alertas de nieve
- `RainBot/`: alertas de lluvia

## Objetivo

Mantener cada bot aislado para deploy y configuracion, pero con una estructura que permita compartir codigo comun mas adelante si hace falta.

## Render

El deploy del monorepo se controla desde `render.yaml` en la raiz.

- `SnowBot` usa `rootDir: SnowBot`
- `RainBot` usa `rootDir: RainBot`

Esto permite que ambos servicios vivan en el mismo repo de GitHub y se desplieguen por separado en Render.
