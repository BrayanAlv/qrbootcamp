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

## Variables de entorno

Consulta `.env.example` para la lista completa (`MONGODB_URI`, `JWT_PRIVATE_KEY`,
`JWT_PUBLIC_KEY`, `MAILCHIMP_TRANSACTIONAL_KEY`, `APP_URL`, etc.).

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