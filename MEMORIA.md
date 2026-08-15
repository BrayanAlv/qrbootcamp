# MEMORIA DE DESARROLLO — QR Invitations

Bitácora de seguimiento del proyecto. Se actualiza al cierre de cada fase con el
formato de la sección 38 del plan: qué se implementó, archivos, dependencias,
comandos, pruebas, problemas, soluciones, seguridad aplicada y siguiente fase.

---

## Fase 1 — Scaffold del proyecto

**Estado:** ✔ Completada

### Qué se implementó
Base del monorepo: estructura de carpetas, archivos de configuración raíz y
documentación inicial. Sin lógica de negocio aún.

### Archivos creados
```
.gitignore
.env.example
README.md
MEMORIA.md
apps/web/src/{components, pages/{Login,ScanQR,Invitations}, services, stores, hooks, router, utils, theme}
apps/api/src/{config, controllers, middleware, models, routes, services, security, validators, utils}
infrastructure/nginx/
```

### Dependencias agregadas
Ninguna (fase solo de estructura).

### Comandos para ejecutar
```
(sin comandos de instalación en esta fase)
```

### Pruebas realizadas
- Verificación de la estructura de directorios creada correctamente.

### Problemas encontrados
Ninguno.

### Soluciones aplicadas
N/A.

### Medidas de seguridad aplicadas
- `.env` y claves privadas (`*.pem`, `*.key`) excluidas de Git.
- `.env.example` sin valores reales.

### Siguiente fase recomendada
**Fase 2 — Docker + MongoDB + Nginx**

---

## Fase 2 — Docker + MongoDB + Nginx

**Estado:** ✔ Completada

### Qué se implementó
Orquestación completa con Docker Compose, reverse proxy Nginx y base de datos
MongoDB aislada en red privada.

### Archivos creados
```
infrastructure/nginx/nginx.conf
apps/web/Dockerfile
apps/api/Dockerfile
apps/web/package.json   (deps base React + Vite + MUI + axios + router)
apps/api/package.json   (deps base Express + Mongo + Zod + helmet + cors + rate-limit)
docker-compose.yml
.env                      (generado con claves JWT RS256, fuera de Git)
```

### Dependencias agregadas
Solo definidas en `package.json` (instalación en sus fases).

### Comandos para ejecutar
```
docker compose config --quiet   # valida la sintaxis OK
```

### Pruebas realizadas
- `docker compose config` → sintaxis válida.

### Problemas encontrados
- El compose requiere `.env` (no existía). Resuelto generándolo con claves RS256.

### Soluciones aplicadas
- `.env` creado con `openssl genrsa` (4096 bits) sin exponer los secretos.

### Medidas de seguridad aplicadas
- MongoDB sin publicar puerto (`27017` solo en red `backend`).
- Nginx único servicio expuesto (80/443).
- Claves privadas RS256 no se imprimen ni se suben a Git.
- Redes separadas `frontend` (nginx↔web↔api) y `backend` (api↔mongodb).
- Healthcheck de MongoDB (`mongosh ping`).
- `*.key`/`*.pem`/`.env` en `.gitignore`.

### Siguiente fase recomendada
**Fase 3 — React + Vite (interfaz base)**

---

## Fase 3 — React + Vite (interfaz base)

**Estado:** ✔ Completada

### Qué se implementó
Estructura base del frontend con React 19 + Vite 6 + Material UI + React Router,
tema, layout global y páginas placeholder.

### Archivos creados
```
apps/web/vite.config.js
apps/web/index.html
apps/web/eslint.config.js
apps/web/src/main.jsx
apps/web/src/theme/index.js
apps/web/src/theme/global.css
apps/web/src/router/index.jsx
apps/web/src/layout/AppLayout.jsx
apps/web/src/services/api.js
apps/web/src/pages/Login/LoginPage.jsx
apps/web/src/pages/ScanQR/ScanQRPage.jsx
apps/web/src/pages/Invitations/InvitationsPage.jsx
apps/web/src/pages/HealthPage.jsx
apps/web/package-lock.json
```

### Dependencias agregadas (instaladas)
`react@19`, `react-dom@19`, `react-router-dom@7`, `@mui/material@6`, `@mui/icons-material@6`,
`@emotion/react`, `@emotion/styled`, `axios`, y dev: `vite@6`, `@vitejs/plugin-react`,
`eslint@9`, `eslint-plugin-react`, `eslint-plugin-react-hooks`, `globals`, `@eslint/js`.

### Comandos para ejecutar
```
cd apps/web && npm run build   # ✅ build OK
cd apps/web && npm run lint    # ✅ lint limpio
```

### Pruebas realizadas
- `vite build` → compilación correcta (992 módulos).
- ESLint sin errores tras añadir reglas JSX.

### Problemas encontrados
- npm `allow-scripts` bloqueó el postinstall de `esbuild` (requerido por Vite).
- ESLint marcaba importaciones JSX como "unused".

### Soluciones aplicadas
- `npm approve-scripts esbuild` + `npm rebuild esbuild`.
- Reglas `react/jsx-uses-vars` y `react/jsx-uses-react` en `eslint.config.js`.

### Medidas de seguridad aplicadas
- Capa central de Axios (`services/api.js`) como punto único de configuración HTTP.
- Theme mobile-first y viewport optimizado (preparado para el escáner).

### Siguiente fase recomendada
**Fase 4 — Express API (base)**

---

## Fase 4 — Express API (base)

**Estado:** ✔ Completada

### Qué se implementó
Backend modular de Express con Manejo de errores centralizado, validación Zod,
config/env centralizada, conexión Mongoose y endpoint de health. Lógica en
services, controllers delgados.

### Archivos creados
```
apps/api/eslint.config.js
apps/api/src/config/env.js        (validación de .env con Zod)
apps/api/src/config/db.js         (conexión Mongoose)
apps/api/src/utils/ApiError.js    (AppError + códigos)
apps/api/src/utils/asyncHandler.js
apps/api/src/middleware/errorHandler.js
apps/api/src/middleware/validate.js
apps/api/src/services/health.service.js
apps/api/src/controllers/health.controller.js
apps/api/src/routes/health.routes.js
apps/api/src/server.js
apps/api/package-lock.json
```

### Dependencias agregadas (instaladas)
`express@4`, `mongoose@8`, `zod@3`, `helmet@8`, `cors`, `express-rate-limit@7`,
`cookie-parser`, `dotenv`; dev: `eslint@9`, `globals`, `@eslint/js`.

### Comandos para ejecutar
```
cd apps/api && npm run lint     # ✅ lint limpio
for f in src/**/*.js; do node --check $f; done   # ✅ sintaxis OK
```

### Pruebas realizadas
- ESLint sin errores.
- `node --check` en todos los archivos (sintaxis ES2024 válida).

### Problemas encontrados
- Ninguno.

### Soluciones aplicadas
- N/A.

### Medidas de seguridad aplicadas
- `helmet()` con cabeceras HTTP seguras por defecto.
- CORS estricto contra lista de orígenes (`CORS_ORIGINS`).
- Límite global de 300 req/min + formato `{error:{code}}`.
- Límite de tamaño de body (`express.json` 1mb).
- Errores sin stack traces fuera de `development`.
- `AppError` con códigos consistentes (`VALIDATION_ERROR`, `RATE_LIMITED`, etc.).
- `trust proxy` correcto para usar la IP real tras Nginx.

### Siguiente fase recomendada
**Fase 5 — Healthcheck y verificación con Docker Compose**

---

## Fase 5 — Healthcheck y verificación Docker

**Estado:** ✔ Completada

### Qué se implementó
Puesta en marcha de la pila completa con Docker Compose y verificación
punto a punto de la comunicación: Nginx → React y Nginx → API → MongoDB.

### Archivos modificados
```
apps/api/src/server.js   (arranque automático + bootstrap condicional)
```
(apps/web sin cambios; la health page ya existía desde fase 3)

### Dependencias agregadas
Sin nuevas.

### Comandos para ejecutar
```
docker compose up -d --build
docker compose ps
curl http://localhost/api/v1/health
curl http://localhost/
```

### Pruebas realizadas
- `docker compose up -d --build` → 4 contenedores arriba.
- MongoDB **healthy** (`mongosh ping`).
- `GET /api/v1/health` vía Nginx → `200 {"success":true,"status":"ok","db":"connected"}`.
- `GET /api/v1/inexistente` → `404` con JSON estándar de error.
- Frontend en `http://localhost/` → `200` (título "QR Invitations"), redirige a `/login`.
- Cabeceras Helmet presentes (HSTS, nosniff, X-Frame-Options).
- Render frontend confirmado en navegador (chrome-devtools).

### Problemas encontrados
1. **API finalizaba sin arrancar**: `server.js` solo exportaba funciones, nadie llamaba `startServer()`.
2. Los 404 del nav (2 x `favicon`) al renderizar la SPA (inofensivo, sin favicon aún).

### Soluciones aplicadas
1. Guard de ejecución directa (`isMain` con `pathToFileURL`) que llama `startServer()` solo al ejecutarse el archivo, sin interferir en tests futuros. `node --watch` reinició solo por el bind mount.
2. Se aceptará el aviso de favicon (no afecta funcionalidad).

### Medidas de seguridad aplicadas (verificadas en vivo)
- MongoDB solo en red `backend`, sin puerto público.
- Nginx como único punto de entrada (80/443), API y web no expuestos.
- Helmet aplica cabeceras seguras; HSTS presente.
- Body limitado, rate limit global, CORS estricto.
- Error 404 sin detalles internos.

### Siguiente fase recomendada
**Fase 6 — Autenticación JWT RS256 (access + refresh en cookie HttpOnly)**

---

## Fase 6+7 — Autenticación JWT RS256 + Usuarios

**Estado:** ✔ Completada

### Qué se implementó
Login/logout/refresh con JWT firmados con RS256 (access + refresh), rotación y
revocación de refresh tokens (anti-replay) almacenados en cookie HttpOnly, modelo
de usuario con hash Argon2id y script de seed del admin.

### Archivos creados
```
apps/api/src/security/keys.js           (carga de llaves PEM vía env, soporta base64)
apps/api/src/security/jwt.js            (sign/verify RS256, claims iss/aud/iat/exp/jti)
apps/api/src/models/User.model.js
apps/api/src/models/RefreshToken.model.js  (jti, rotación, TTL de expiración)
apps/api/src/services/password.service.js  (Argon2id)
apps/api/src/services/token.service.js     (issue/revoke/rotate/validate refresh)
apps/api/src/services/auth.service.js      (login/refresh/logout + sesión)
apps/api/src/controllers/auth.controller.js
apps/api/src/validators/auth.validators.js (zod: login, refresh)
apps/api/src/middleware/auth.js            (protect)
apps/api/src/routes/auth.routes.js         (+rate limits login/refresh)
apps/api/src/scripts/seed.js               (crea admin)
```
**Modificados:** `apps/api/src/server.js` (monta `/auth`), `apps/api/src/middleware/validate.js` (soporta `cookies`), `docker-compose.yml` (volúmenes con nombre para node_modules), `apps/api/package.json` (jsonwebtoken, @node-rs/argon2), `.env` (claves en base64).

### Dependencias agregadas
`jsonwebtoken`, `@node-rs/argon2` (Argon2id con binarios precompilados, sin toolchain de compilación en alpine).

### Comandos para ejecutar
```
docker compose exec api env SEED_ADMIN_EMAIL=... SEED_ADMIN_PASSWORD='...' node src/scripts/seed.js
docker compose up -d --force-recreate --no-deps api   # tras cambiar .env
```

### Pruebas realizadas (vía Nginx)
- Login inválido → 401.
- Login correcto → 200 + access token RS256 + cookie `refresh_token` HttpOnly.
- `/me` con token → 200; `/me` sin token → 401.
- `/refresh` → 200 (rota refresh token).
- **Anti-replay:** reutilizar un refresh token ya rotado → 401; el sucesor → 200.
- `/logout` → 200.

### Problemas encontrados y soluciones
1. **rutas de auth como 404**: los routers hijos se montaban en la raíz del `api`, pero auth define `/login`; la request llegaba como `/auth/login` sin matchear. → Montar `api.use('/auth', authRoutes)`.
2. **Llaves RS256 no reconocidas**: almacenar PEM con `\n` escapados en `.env` corrompía el formato. → Cambiar `.env` a **base64** y decodificar en `keys.js`.
3. **El contenedor no tomaba el nuevo `.env`**: las variables de entorno se inyectan al crear el contenedor. → `docker compose up -d --force-recreate --no-deps api`.
4. **node_modules desactualizado** en el contenedor (deps añadidas tras el build inicial). → Volúmenes con nombre (`api_node_modules`, `web_node_modules`) para limpiarlos sin borrar datos de Mongo.
5. **npm `allow-scripts`** bloqueó `esbuild`. → `npm approve-scripts esbuild`.

### Medidas de seguridad aplicadas
- JWT RS256 (nunca `alg:none`), validación completa de `iss/aud/exp/iat/jti`.
- Sin datos sensibles dentro del JWT.
- Refresh token en cookie `HttpOnly` + `SameSite=Lax` (+`Secure` en producción).
- Rotación de refresh token con revocación (anti-replay de sesión).
- Contraseñas con **Argon2id**.
- Rate limit en `/login` (10/15min) y `/refresh` (60/15min).

### Siguiente fase recomendada
**Fase 8 — Modelo de Invitation (guest + assistant + emailStatus)**

---

## Fase 8 — Modelo de Invitation

**Estado:** ✔ Completada

### Qué se implementó
Modelo Mongoose de invitaciones con destinatario principal (guest), asistente
opcional (assistant), estados, seguimiento de envío de correos por destinatario,
y campo para el hash del token QR.

### Archivos creados
```
apps/api/src/models/Invitation.model.js
```

### Dependencias agregadas
Ninguna.

### Pruebas realizadas
- Round-trip de creación/lectura/borrado en MongoDB con guest + assistant.
- `toJSON()` no expone `qrTokenHash`.

### Problemas encontrados y soluciones
- Índice duplicado de `qrTokenHash`. → Eliminado el `index:true` inline (queda el `schema.index`).

### Medidas de seguridad
- El QR nunca se guarda como token original: solo `qrTokenHash` (SHA-256) y se oculta en respuestas.

---

## Fase 9 — Importación de invitados por Excel

**Estado:** ✔ Completada

### Qué se implementó
Carga masiva de invitaciones desde Excel (.xlsx/.xls/.csv) con subida segura
(multer), parseo (exceljs), validación fila a fila con Zod y reporte de errores.
Cada invitación se crea con `guest` (nombre, email, empresa) y `assistant`
(nombre, email) opcional.

### Archivos creados
```
apps/api/src/middleware/upload.js                   (multer: memoria, 2MB, filtro de tipo)
apps/api/src/validators/invitation.validators.js    (zod fila + columnas)
apps/api/src/services/invitationImport.service.js   (parseo, mapeo de encabezados, bulk insert)
apps/api/src/controllers/invitation.controller.js
apps/api/src/routes/invitation.routes.js            (POST /invitations/import, rate limit)
```
**Modificados:** `apps/api/src/server.js` (monta `/invitations`), `apps/api/src/models/Invitation.model.js` (campo `company`).

### Dependencias agregadas
`multer@2.2.0`, `exceljs@4.4.0`. Se descartó `xlsx` (vulnerabilidad high no parcheada) por `exceljs`.

### Probar
```
POST /api/v1/invitations/import  (Bearer + multipart "file")
```

### Pruebas realizadas (end-to-end con token real)
Excel de 5 filas → `inserted:2`, errores en filas 3,4,5 (`Falta el nombre`, `Email inválido`, `Email duplicado`).
- Ana (con asistente Juan) y Luis (sin asistente) almacenados correctamente con `status: pendiente`.

### Problemas encontrados y soluciones
1. `xlsx` en npm tiene CVE (prototype pollution) sin parche → usar `exceljs`.
2. El header del Excel se leía mal (se tomaba la primera fila de datos como encabezado). → Leer encabezado con `ws.getRow(1)` y datos desde la fila 2.
3. Contenedor sin dependencias nuevas (volumen node_modules viejo). → Reconstruir imagen + `docker volume rm qr-invitations_api_node_modules`.

### Medidas de seguridad
- Subida limitada a 1 archivo de 2MB, solo tipos Excel/CSV.
- Validación estricta por fila (email, requeridos) y dedupe de emails en el archivo y en BD.
- Endpoint protegido por JWT + rate limit (20/15min).
- `$setOnInsert` + upsert evita duplicados de invitación (mismo email + sender).

### Siguiente fase recomendada
**Fase 10 — Generación de QR criptográfico (token 32 bytes + SHA-256)**

---

## Fase 10 — Generación de QR criptográfico

**Estado:** ✔ Completada

### Qué se implementó
Servicio de QR: token criptográfico de 32 bytes (base64url), hash SHA-256 (solo
se persiste el hash), fechas `expiresAt`, búsqueda por token y generación de PNG
base64 para incrustar en correos. `APP_URL` alimenta el enlace `<APP_URL>/i/<token>`.

### Archivos creados
```
apps/api/src/services/qr.service.js
```
**Modificados:** `apps/api/src/config/env.js` (agrega `appUrl`).

### Dependencias agregadas
`qrcode@1.5.4`.

### Pruebas (round-trip en contenedor)
- Token de 43 chars (32 bytes), impredecible.
- `qrTokenHash` + `expiresAt` guardados; token incorrecto no matchea.
- PNG dataURL generado correctamente.

### Medidas de seguridad
- `crypto.randomBytes(32)` → token impredecible (sin IDs predecibles).
- Nunca se almacena el token original, solo su SHA-256.
- El QR apunta a una URL pública (no a un endpoint con ID).

### Siguiente fase recomendada
**Fase 11 — Envío masivo de correos con Mailchimp Transactional (2 correos por invitación, asistente opcional)**

---

## Fase 11 — Envío masivo de correos con Mailchimp Transactional

**Estado:** ✔ Completada

### Qué se implementó
Envío de correos transaccionales vía Mailchimp Transactional (Mandrill). Por cada
invitación se envían **2 correos HTML personalizados y con QR incrustado**: uno al
invitado y otro al asistente; si el invitado no tiene asistente, solo se envía 1.
Se registra el estado de envío (`emailStatus`) por destinatario.

### Archivos creados
```
apps/api/src/services/mailchimp.service.js      (cliente Mandrill + simulador en dev)
apps/api/src/services/emailTemplate.service.js   (plantilla HTML con Handlebars + QR)
apps/api/src/services/email.service.js           (orquestación de envío por invitación)
apps/api/src/controllers/email.controller.js
```
**Modificados:** `apps/api/src/routes/invitation.routes.js` (POST /send y /:id/send), `apps/api/src/config/env.js` (MAILCHIMP_KEY, EMAIL_FROM, EMAIL_FROM_NAME), `.env`.

### Dependencias agregadas
`@mailchimp/mailchimp_transactional@1.4.1`, `handlebars@4.7.9`.

### Probar
```
POST /api/v1/invitations/send          (envía a todas las pendientes)
POST /api/v1/invitations/:id/send
```

### Pruebas (modo dev, API key vacía ⇒ envió simulado y registrado)
- Ana → 2 correos (invitado + asistente Juan). Luis → 1 correo (sin asistente). Total 3.
- 2º envío ⇒ idempotente (`procesadas:0`).
- `emailStatus` persistido por destinatario; `qrTokenHash` presente.
- La misma URL/QR se comparte entre invitado y asistente de una invitación.

### Problemas encontrados y soluciones
- `EMAIL_FROM=no-reply@localhost` no pasaba `z.string().email()`. → Uso `no-reply@example.com` en `.env`.
- `docker compose down api` derribó también nginx/web (red `frontend`). → `docker compose up -d` restablece la pila.

### Medidas de seguridad
- Sin API key en desarrollo: no hay envíos reales (evita correos accidentales).
- No se registran tokens completos en logs (solo destinatario/asunto).
- QR de un solo uso embebido; el correo enlaza a la URL pública del token.

### Siguiente fase recomendada
**Fase 12 — Validación QR de un solo uso (atómico)**

---

## Fase 12 — Validación de QR (un solo uso)

**Estado:** ✔ Completada

### Qué se implementó
Endpoint para validar un token QR: localiza por hash, detecta inexistente,
expirado o ya utilizado. La marcación de uso ocurre en la aceptación (fase 15);
aquí solo se consulta.

### Archivos creados
```
apps/api/src/validators/qr.validators.js    (extrae token de URL/token, zod)
apps/api/src/services/qrValidate.service.js (lógica de validación + códigos)
apps/api/src/controllers/qr.controller.js
apps/api/src/routes/qr.routes.js            (POST /qr/validate, rate limit)
```
**Modificados:** `apps/api/src/server.js` (monta `/qr`).

### Probado
- QR válido (token y URL completa con query) → 200 + datos de la invitación.
- QR inexistente → 400 `INVALID_QR`.
- QR ya utilizado → 409 `QR_ALREADY_USED`.
- QR expirado → 410 `QR_EXPIRED`.

### Medidas de seguridad
- Busca por SHA-256 del token (nunca por el token original).
- Rate limit 200/15min contra fuerza bruta.
- No marca usado en validación (fuente de verdad para el estado la maneja la aceptación atómica).

### Siguiente fase recomendada
**Fase 14+15 — Listado de invitaciones recibidas y aceptación atómica del QR**

---

## Fase 14+15 — Invitaciones recibidas y aceptación atómica

**Estado:** ✔ Completada

### Qué se implementó
- `GET /invitations`: listado de invitaciones recibidas (email del usuario como invitado o asistente).
- `POST /invitations/:id/accept` con token: aceptación **atómica de un solo uso** (`findOneAndUpdate` con `usedAt: null` + `qrTokenHash` + no expirado).

### Archivos creados
```
apps/api/src/services/invitation.service.js
```
**Modificados:** `apps/api/src/controllers/invitation.controller.js`, `apps/api/src/routes/invitation.routes.js` (+GET / y /:id/accept con rate limit), `apps/api/src/validators/invitation.validators.js` (acceptSchema), frontend: `apps/web/src/pages/Invitations/InvitationsPage.jsx` (listado), `apps/web/src/services/invitationService.js`.

### Probado
- Listado por email del usuario (invitación con `guest.email = admin@test.com` aparece).
- Aceptar con token correcto → 200 `status: aceptada`.
- **2º intento con el mismo token → 409 `QR_ALREADY_USED`** (se garantiza un solo uso).
- Frontend: `npm run lint` + `npm run build` OK.

### Problemas encontrados y soluciones
- `.lean()` en el listado exponía `qrTokenHash`. → `.select('-qrTokenHash')`.

### Medidas de seguridad
- La aceptación requiere el token QR (demuestra posesión); nunca se confía en un `userId` del React.
- Actualización atómica: si dos scrrantas usan el mismo QR, solo una gana; la otra recibe `QR_ALREADY_USED`.
- El listado nunca expone el hash del token QR.

### Siguiente fase recomendada
**Fase 16 — Auditoría (logs estructurados de eventos)**

---

## Fase 16 — Auditoría

**Estado:** ✔ Completada

### Qué se implementó
Registro de auditoría en MongoDB con TTL (90 días) para los eventos clave sin
guardar secretos ni tokens completos.

### Archivos creados
```
apps/api/src/services/audit.service.js  (modelo + función audit no bloqueante)
```
**Modificados:** `auth.controller.js` (login, login_failed, logout),
`qr.controller.js` (qr_valid, qr_validation_failed), `invitation.controller.js` (invitation_accepted, qr_used_attempt).

### Probado
- Login correcto y logout registrados con email + IP.
- Colección `auditlogs` con TTL de 90 días.

### Medidas de seguridad
- Nunca guarda password, JWT, refresh token ni token QR completo.
- Auditoría no bloqueante (nunca rompe el flujo principal).

---

## Fase 17 — Pruebas (runner nativo de Node)

**Estado:** ✔ Completada

### Qué se implementó
Pruebas unitarias de funciones puras (QR, validadores, contraseñas).

### Archivos creados
```
apps/api/test/qr.service.test.js
apps/api/test/qr.validators.test.js
apps/api/test/password.test.js
```

### Probado
`npm test` → **9/9 pruebas pasan**: longitud/unicidad/hash del token, extracción de token desde URL, esquema de fila de invitado, Argon2id.

### Ajustes
- `env.js`: defaults para `MONGODB_URI` y `EMAIL_FROM` para que las pruebas (sin `.env`) carguen la config.

### Siguiente fase recomendada
**Fase 18-19 — Hardening de seguridad y preparación para producción**

---

## Fase 18-19 — Hardening de seguridad y base de producción

**Estado:** ✔ Completada (base)

### Qué se implementó
Refuerzo de seguridad consistente y groundwork para producción.

### Archivos creados
```
apps/web/Dockerfile.production   (multi-etapa: build estáticos + Nginx)
apps/web/nginx.prod.conf         (sirve SPA + proxy /api con cabeceras de seguridad)
```

### Hardening aplicado en todo el proyecto (resumen)
- **Helmet** + HSTS; CORS estricto; body limitado (1MB); rate limit global y por endpoint.
- **Validación Zod** en body/params/query/headers/cookies.
- **JWT RS256** (nunca `alg:none`), claims `iss/aud/iat/exp/jti`, refresh en cookie HttpOnly/SameSite (+Secure en prod) con rotación y revocación.
- **Contraseñas Argon2id**; **QR de 32 bytes** con solo SHA-256 almacenado.
- **Aceptación atómica de un solo uso** (`findOneAndUpdate`) con anti-replay en refresh.
- **MongoDB en red privada** (sin puerto público); Nginx como único punto de entrada.
- **Auditoría y logs** sin passwords/JWT/tokens QR; errores sin stack traces en producción.
- **Carga Excel** limitada (2MB, tipos permitidos) y dedupe.

### Pendientes para producción real (despliegue)
- Dominio + certificados TLS; activar bloqueo HTTPS en `infrastructure/nginx/nginx.conf`.
- `RESEND_API_KEY` real y dominio de `EMAIL_FROM` verificado en Resend (ver Fase 20).
- `JWT_PRIVATE_KEY`/`JWT_PUBLIC_KEY` generadas y guardadas de forma segura.
- Usar `docker-compose.yml` con `Dockerfile.production` y static serving.

---

## ESTADO GENERAL DEL PROYECTO

**Fases 1-19 completadas** (base desarrollada y verificada en Docker).

Verificación final del smoke test:
```
health / ME / listado / import / validate QR (INVALID, EXPIRED, ALREADY_USED) / aceptación atómica → OK
npm test (api) → 9/9 pasan · lint (api y web) limpio · build (web) OK
```

Arquitectura funcionando: Nginx → React(vite) y Nginx → API → MongoDB, con:
- Autenticación JWT RS256 completa (login/refresh/logout/me).
- Importación de invitados por Excel.
- Envío masivo por Resend (2 correos por invitación, asistente opcional, QR como adjunto inline `cid:`).
- QR de un solo uso (validación + aceptación atómica).
- Escáner QR por cámara con todos los estados visuales.
- Invitaciones recibidas con estados.
- Auditoría, pruebas y hardening.

---

## Fase 13 — Autenticación en frontend + Escáner QR

**Estado:** ✔ Completada

### Qué se implementó
Login funcional, estado global con Zustand, interceptor Axios con refresh de
token en 401, guard de rutas, y página de escáner con cámara (`@zxing/browser`)
con todos los estados visuales del plan.

### Archivos creados
```
apps/web/src/stores/authStore.js
apps/web/src/router/RequireAuth.jsx
apps/web/src/services/authService.js
apps/web/src/services/qrService.js
apps/web/src/services/invitationService.js
apps/web/src/pages/Login/LoginPage.jsx      (login real)
apps/web/src/pages/ScanQR/ScanQRPage.jsx    (escáner + estados)
```
**Modificados:** `apps/web/src/services/api.js` (interceptor + refresh), `apps/web/src/main.jsx` (configura auth + init), `apps/web/src/router/index.jsx` (guard), `apps/web/src/layout/AppLayout.jsx` (logout real).

### Dependencias agregadas
`zustand`, `@zxing/browser`, `@zxing/library`.

### Verificado
- `npm run lint` limpio y `npm run build` OK.
- SPA y módulos resuelven vía Vite (200) sin errores de transform.
- Login real por API funciona (200).
- Estados del escáner: Escaneando, QR detectado, Validando, Invitación válida, QR_ALREADY_USED, QR_EXPIRED, INVALID_QR, ERROR, con bloqueo de escaneos duplicados y detención de cámara.

### Medidas de seguridad
- Refresh token solo en cookie HttpOnly (no en localStorage).
- Interceptor centraliza los 401 + refresh; cierre de sesión automático si falla.
- El acceso al token se inyecta al cliente Axios (sin acoplarlo al store).

### Siguiente fase recomendada
**Fase 14+15 — Listado de invitaciones recibidas y aceptación atómica del QR**

---
---

## Fase 20 — Migración del envío de correos a Resend

**Estado:** ✔ Completada

### Qué se implementó
Sustitución completa de Mailchimp Transactional (Mandrill) por **Resend**
(`https://resend.com/docs/api-reference/emails/send-email`). Los tres endpoints de
envío y la forma de la respuesta hacia el frontend no cambian.

### Archivos creados
```
apps/api/src/services/resend.service.js   (adaptador: cliente + ritmo + reintentos + idempotencia)
apps/api/test/email.service.test.js       (8 pruebas del formato del mensaje y del adaptador)
```
**Eliminado:** `apps/api/src/services/mailchimp.service.js`.
**Modificados:** `email.service.js` (formato del mensaje, éxito por `res.ok`, texto plano,
persistencia de `emailError`), `emailTemplate.service.js` (`cid:` en vez de data URI),
`qr.service.js` (`toQrBuffer`), `config/env.js`, `.env`, `.env.example`.

### Dependencias
`+ resend@6.20.0` · `- @mailchimp/mailchimp_transactional@1.4.1`

### Diferencias de API absorbidas
- **Mensaje:** `from_email`/`from_name`/`to:[{email,name}]` → `from: "Nombre <correo>"` y `to: [correo]`.
  En `to` va solo la dirección: los nombres vienen de Excel y pueden traer comas que romperían la cabecera.
- **Respuesta:** el SDK **no lanza** ante errores de la API, devuelve `{ data, error }`. El adaptador
  normaliza a `{ ok, id, error }`; el antiguo `res[0].status === 'sent'` habría marcado todo como fallido.
- **Límite de tasa:** 10 req/s por equipo. El adaptador serializa las llamadas con un hueco mínimo
  (`EMAIL_RATE_PER_SEC`, por defecto 8) y reintenta 429/5xx con backoff (500 ms, 1500 ms).
  Los 4xx de validación no se reintentan. Timeout propio de 30 s (el SDK no lo trae).
- **Idempotencia:** `Idempotency-Key` derivada del token emitido (`inv-<id>-<rol>-<hash16>`), TTL 24 h.
  Un reenvío con `force` emite token nuevo ⇒ clave nueva ⇒ sí reenvía; un reintento de red no duplica.

### Corrección de entregabilidad
El QR viajaba como `<img src="data:image/png;base64,…">`, que Gmail y Outlook descartan.
Ahora va como adjunto inline (`attachments[].contentId` + `src="cid:qr-invitacion"`), que sí
se renderiza, más una parte `text` con la URL en claro como respaldo.

### Probado
`npm test` → **17/17 pasan**. Lint limpio (solo avisos `no-console`, como antes).
Smoke test: PNG válido de 1996 bytes, HTML con `cid:` y sin `data:image`, envío simulado sin API key.

### Pendiente para producción
`RESEND_API_KEY` real y dominio de `EMAIL_FROM` verificado en Resend (DNS: SPF + DKIM).

---

## Fase 21 — Identidad visual "Real Estate Luxury" en el frontend

**Estado:** ✔ Completada

### Qué se implementó
Aplicación de la identidad de marca (hero oscuro con gradiente → contenido en
gris neutro → franja púrpura saturada) a **todo el frontend salvo la pantalla de
escaneo**, en escritorio y en móvil. `ScanQRPage.jsx` y `brand.js` no se tocaron.

Regla de composición que ordena el sistema: cada bloque es OSCURO, NEUTRO o
SATURADO, nunca los tres en la misma sección.

### Archivos creados
```
apps/web/src/theme/tokens.js              (paleta, gradientes, tipografías, mixins)
apps/web/src/components/Wordmark.jsx      (marca: serif + condensada, dos pisos)
apps/web/src/components/GlitchFigure.jsx  (cifra duotono, único gesto de campaña)
apps/web/src/components/PageHero.jsx      (banda oscura de apertura)
apps/web/src/components/BrandFooter.jsx   (franja púrpura + pasarela de aliados)
apps/web/src/components/StatusPill.jsx    (estado en versalitas sobre filete)
apps/web/preview-brand.html + src/preview-brand.jsx  (previsualización sin API)
```
**Modificados:** `theme/index.js`, `theme/global.css`, `index.html`,
`layout/AppLayout.jsx`, `pages/Login/LoginPage.jsx`,
`pages/Invitations/InvitationsPage.jsx`, `pages/AdminImport/AdminImportPage.jsx`,
`pages/HealthPage.jsx`.

### Dependencias
Ninguna. Se suma la tipografía **Big Shoulders Display** (Google Fonts) al
`<link>` existente, junto a Cormorant Garamond y Montserrat.

### Decisiones
- **Tema en modo claro.** El contenido (tablas, formularios) vive en el modo
  neutro; lo oscuro se pinta en los componentes de bloque. Un tema oscuro global
  habría invertido el popout de resultado del escáner, que fija sus colores a mano.
- **El tema no sobrescribe `Paper`, `Dialog`, `Chip` ni `CircularProgress`:** son
  los componentes de los que cuelga la pantalla de escaneo.
- **Ripple aceptado:** el panel de escaneo de escritorio hereda la paleta nueva
  (icono y botón en azul tinta en vez del azul MUI). La estructura no cambia.
- **Sin `viewport-fit=cover`** en el `<meta viewport>`: activaría los
  `safe-area-inset` de la pantalla de escaneo en iPhone con notch.
- **Móvil (fuera del escáner):** la barra colapsa a marca + menú, y la tabla de
  invitados se sustituye por una ficha por invitado con las mismas tres acciones.

### Corrección de la pasarela de aliados
El asset de S3 (`pasarela-de-logos-1.png`) hoy mide **3072x481 y ya viene
recortado**; el encuadre con `background-size:125%` / `position:49.87% 52.3%` que
usa el correo corresponde al artboard antiguo de 3840x2160 y dejaba ver dos filas
partidas. En web se sirve la imagen tal cual, con `max-width`.

### Probado
`npm run lint` limpio. `npm run build` correcto (1259 módulos). Capturas en
Chrome headless a 1440px y 390px de: login, invitaciones, control de invitados,
estado del sistema y las dos vistas del escáner (sin cambios de estructura).

### Pendiente
Revisar la pantalla de escaneo en dispositivo real tras el cambio de paleta.
