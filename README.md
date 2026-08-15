# QR Invitations

Sistema web seguro de invitaciones mediante QR de un solo uso.

Monorepo con frontend (React + Vite), backend (Node + Express + MongoDB) y
despliegue vía Docker + Nginx.

## Requisitos

- Node.js >= 20
- npm
- Docker + Docker Compose

## Instalación

```bash
cp .env.example .env
# completa los valores reales en .env

docker compose up -d --build
```

## Producción (Docker + Nginx Proxy Manager)

El compose de desarrollo (`docker-compose.yml`) no sirve para producción. Usa
`docker-compose.prod.yml`, que no expone puertos: `qr-web` corre nginx, sirve el
SPA y proxy-ea `/api` a `qr-api`, que queda en una red privada junto a MongoDB.
Nginx Proxy Manager apunta **solo** a `qr-web:80`.

Pasos en el servidor (VPS):

```bash
docker network ls                                   # identificar la red de NPM (p. ej. "proxy")
cp .env.example .env                                # NODE_ENV=production y dominios reales
# FRONTEND_URL / CORS_ORIGINS / APP_URL = https://tu-dominio
# NPM_NETWORK = nombre de la red de NPM

docker compose -f docker-compose.prod.yml up -d --build
docker exec qr-api npm run seed                     # solo la primera vez (admin inicial)
curl -s https://tu-dominio/api/v1/health
```

Config en Nginx Proxy Manager → **Proxy Hosts → Add**:

- Domain Name: `tu-dominio` · Scheme: `http` · Forward Hostname: `qr-web` · Port: `80`
- ✓ Block Common Exploits
- SSL: *Request a new Let's Encrypt Certificate* · ✓ Force SSL

Actualizaciones: `git pull && docker compose -f docker-compose.prod.yml up -d --build`
(el volumen de MongoDB persiste).

## Variables de entorno

Consulta `.env.example` para la lista completa (`MONGODB_URI`, `JWT_PRIVATE_KEY`,
`JWT_PUBLIC_KEY`, `MAILCHIMP_TRANSACTIONAL_KEY`, `APP_URL`, etc.). En producción
incluye `NPM_NETWORK` con el nombre de la red Docker de Nginx Proxy Manager.

## Desarrollo

```bash
# landa la base: nginx, React, API y MongoDB
docker compose up -d --build
```

## Scripts

| App   | Comandos                                  |
|-------|-------------------------------------------|
| web   | `npm run dev` / `npm run build` / `npm run lint` |
| api   | `npm run dev` / `npm run start` / `npm run lint` / `npm run test` |

## Estructura

```
apps/
├── web/   # React + Vite + Material UI
└── api/   # Node + Express + MongoDB
infrastructure/nginx/
docker-compose.yml
```

## Seguridad

- Tokens QR criptográficos (32 bytes), solo se almacena su SHA-256.
- Contraseñas con Argon2id.
- JWT RS256 con refresh token en cookie HttpOnly/Secure/SameSite.
- MongoDB únicamente en red privada.
- Rate limiting y validación estricta con Zod.

## Documentación de avance

El progreso por fases de desarrollo se registra en `MEMORIA.md`.