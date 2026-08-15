# Crear sistema web seguro de invitaciones mediante QR de un solo uso

Quiero desarrollar desde cero una aplicación web responsive para gestionar invitaciones mediante códigos QR únicos y de un solo uso.

La prioridad del proyecto es:

* Desarrollo rápido.
* Seguridad desde el inicio.
* Arquitectura limpia y modular.
* Fácil mantenimiento.
* Responsive y mobile-first.
* Preparado para producción.
* Ejecución mediante Docker.
* Backend con validaciones estrictas.
* QR criptográficamente seguros.
* QR de un solo uso.
* Feedback visual inmediato al escanear.
* Evitar sobreingeniería innecesaria.

**IMPORTANTE:** todo el proyecto debe utilizar **JavaScript ES2024**.
**NO utilizar TypeScript bajo ninguna circunstancia.**

---

# 1. Arquitectura general

Crear un monorepo con esta estructura:

```text
qr-invitations/
├── apps/
│   ├── web/
│   │   ├── src/
│   │   │   ├── components/
│   │   │   ├── pages/
│   │   │   │   ├── Login/
│   │   │   │   ├── ScanQR/
│   │   │   │   └── Invitations/
│   │   │   ├── services/
│   │   │   ├── stores/
│   │   │   ├── hooks/
│   │   │   ├── router/
│   │   │   ├── utils/
│   │   │   ├── theme/
│   │   │   └── main.jsx
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── vite.config.js
│   │
│   └── api/
│       ├── src/
│       │   ├── config/
│       │   ├── controllers/
│       │   ├── middleware/
│       │   ├── models/
│       │   ├── routes/
│       │   ├── services/
│       │   ├── security/
│       │   ├── validators/
│       │   ├── utils/
│       │   └── server.js
│       ├── Dockerfile
│       └── package.json
│
├── infrastructure/
│   └── nginx/
│
├── docker-compose.yml
├── .env.example
├── .gitignore
└── README.md
```

Separar claramente:

* frontend;
* backend;
* persistencia;
* autenticación;
* seguridad;
* lógica de negocio;
* infraestructura.

Los controllers no deben contener toda la lógica empresarial. La lógica debe estar principalmente en services.

---

# 2. Stack tecnológico

## Frontend

Utilizar:

* React 19+
* Vite
* JavaScript ES2024
* React Router DOM
* Axios
* Zustand
* Material UI
* `@zxing/browser` o una librería equivalente para lectura QR mediante cámara.

NO utilizar TypeScript.

La interfaz debe ser:

* responsive;
* mobile-first;
* optimizada para teléfonos;
* sencilla;
* rápida;
* accesible.

---

# 3. Backend

Utilizar:

* Node.js
* Express
* JavaScript ES2024
* MongoDB
* Mongoose
* Zod
* JWT
* Argon2id
* Helmet
* CORS
* express-rate-limit

API REST versionada:

```text
/api/v1
```

Separar:

```text
routes
controllers
services
models
validators
middleware
security
```

---

# 4. Módulos principales

La aplicación tendrá inicialmente dos módulos principales:

## Módulo 1 — Escaneo QR

Ruta:

```text
/scan
```

Debe permitir:

1. Solicitar permiso para utilizar la cámara.
2. Activar el lector QR.
3. Detectar el QR.
4. Extraer el token.
5. Informar inmediatamente al usuario que se detectó un QR.
6. Enviar el token al backend.
7. Validar el QR.
8. Mostrar el resultado.
9. Permitir aceptar la invitación si es válida.

## Módulo 2 — Invitaciones recibidas

Ruta:

```text
/invitations
```

Debe permitir consultar las invitaciones recibidas por el usuario.

Cada invitación debe mostrar:

* persona o empresa;
* fecha;
* estado;
* información básica;
* acciones disponibles.

Estados iniciales:

```text
pendiente
aceptada
rechazada
expirada
```

---

# 5. Login y autenticación

Crear:

```text
/login
```

Implementar autenticación mediante JWT.

Utilizar:

```text
Access Token
Refresh Token
```

El access token debe tener duración corta, por ejemplo:

```text
15 minutos
```

El refresh token puede tener una duración mayor, por ejemplo:

```text
7 días
```

Utilizar firma asimétrica para JWT, preferentemente:

```text
RS256
```

El JWT debe incluir y validar:

```text
iss
aud
exp
iat
jti
```

Nunca aceptar:

```text
alg = none
```

No incluir información sensible dentro del JWT.

El refresh token debe utilizar:

```text
HttpOnly
Secure
SameSite
```

No almacenar refresh tokens en `localStorage`.

Evitar almacenar tokens sensibles en `localStorage`.

Implementar:

```text
POST /api/v1/auth/login
POST /api/v1/auth/refresh
POST /api/v1/auth/logout
```

---

# 6. Seguridad de las requests

**NO implementar cifrado manual de cada request.**

No hacer algo como:

```javascript
encrypt(JSON.stringify(request))
```

para cada petición.

La comunicación debe protegerse mediante:

```text
HTTPS / TLS
```

Arquitectura:

```text
React
   │
   │ HTTPS
   ▼
Nginx
   │
   ▼
Node.js + Express
   │
   ▼
MongoDB
```

HTTPS debe proporcionar confidencialidad e integridad durante el transporte.

Si posteriormente existen campos especialmente sensibles que necesiten protección adicional en almacenamiento, implementar cifrado de campo solamente para esos datos.

No cifrar indiscriminadamente toda la aplicación.

---

# 7. Seguridad HTTP

Configurar correctamente:

* Helmet.
* HSTS.
* Content-Security-Policy.
* X-Content-Type-Options.
* Referrer-Policy.
* Cache-Control para información sensible.
* CORS estricto.
* Rate limiting.
* Límites de tamaño de requests.
* Validación de body.
* Validación de params.
* Validación de query.
* Métodos HTTP permitidos.
* Manejo centralizado de errores.

Nunca devolver en producción:

* stack traces;
* passwords;
* JWT;
* refresh tokens;
* secretos;
* información interna del servidor.

Nunca colocar tokens o secretos en:

```text
URLs
query parameters
logs
```

---

# 8. Contraseñas

Utilizar:

```text
Argon2id
```

para almacenar contraseñas.

Nunca utilizar:

```text
MD5
SHA1
SHA256 simple
texto plano
```

Las contraseñas deben almacenarse mediante hashing seguro y nunca mediante cifrado reversible.

---

# 9. Sistema de QR

Cada invitación debe tener un QR único.

NO utilizar como secreto:

```text
/invite/1
/invite/2
/invite/3
```

No utilizar IDs incrementales como tokens de seguridad.

Generar cada token mediante un generador criptográficamente seguro.

Preferentemente utilizar al menos:

```text
32 bytes
```

de aleatoriedad criptográfica.

El QR puede contener:

```text
https://dominio.com/i/<token>
```

El token debe ser impredecible y suficientemente largo.

---

# 10. Almacenamiento seguro del token QR

No almacenar directamente el token original si no es necesario.

Al generar:

```text
token
```

calcular:

```text
SHA-256(token)
```

y guardar:

```text
tokenHash
```

en MongoDB.

Flujo:

```text
QR
 ↓
token
 ↓
SHA-256(token)
 ↓
MongoDB
 ↓
buscar tokenHash
```

Esto reduce el impacto de una posible exposición de la base de datos.

---

# 11. Expiración y estado del QR

Cada QR debe manejar:

```text
createdAt
expiresAt
usedAt
```

Estados conceptuales:

```text
activo
utilizado
expirado
```

Un QR expirado nunca puede utilizarse.

Un QR utilizado nunca puede volver a utilizarse.

---

# 12. QR de un solo uso

La aceptación debe ser atómica.

Debe evitarse:

```text
Usuario A ──┐
            ├── mismo QR
Usuario B ──┘
```

donde ambos podrían ser aceptados.

La operación debe garantizar:

```text
usedAt == null
```

antes de aceptar y establecer:

```text
usedAt = fecha actual
```

en una operación atómica o transacción apropiada.

Si dos usuarios intentan utilizar el mismo QR simultáneamente:

```text
Solicitud A → aceptada
Solicitud B → QR_ALREADY_USED
```

Solamente una solicitud puede tener éxito.

---

# 13. Escaneo repetido del QR

Cuando el usuario vuelva a escanear un QR que ya fue utilizado, debe mostrarse claramente:

```text
Código QR ya utilizado
```

El backend debe responder con un código específico:

```text
QR_ALREADY_USED
```

El frontend debe mostrar una alerta diferenciada.

El frontend nunca debe decidir por sí mismo si un QR está utilizado.

El backend siempre será la fuente de verdad.

---

# 14. Feedback inmediato al escanear

Cada vez que la cámara detecte un QR, debe existir feedback visual inmediato.

Flujo:

```text
Cámara
   ↓
QR detectado
   ↓
"QR escaneado"
   ↓
"Validando código..."
   ↓
Resultado
```

Al detectar:

```text
QR escaneado
```

mostrar inmediatamente una alerta.

Después:

```text
Validando código QR...
```

Mientras se procesa la petición.

No esperar a la respuesta del backend para informar que la cámara detectó el QR.

---

# 15. Estados visuales del escáner

Implementar como mínimo:

```text
Escaneando
QR detectado
Validando
Invitación válida
QR_ALREADY_USED
QR_EXPIRED
INVALID_QR
INVITATION_NOT_FOUND
INVITATION_NOT_AVAILABLE
ERROR
```

Utilizar Material UI:

```text
Alert
Snackbar
Dialog
CircularProgress
```

Estados semánticos:

```text
success
info
warning
error
```

---

# 16. Ejemplo de QR ya utilizado

Mostrar algo similar a:

```text
┌──────────────────────────────────┐
│ ⚠ Código QR ya utilizado        │
│                                  │
│ Este código QR ya fue utilizado  │
│ y no puede volver a utilizarse.  │
│                                  │
│    [ Escanear nuevamente ]       │
└──────────────────────────────────┘
```

El botón:

```text
Escanear nuevamente
```

debe:

1. limpiar el resultado;
2. cerrar la alerta;
3. reactivar la cámara;
4. permitir un nuevo escaneo.

---

# 17. QR válido

Mostrar algo similar a:

```text
┌──────────────────────────────────┐
│ ✓ Invitación válida              │
│                                  │
│ Invitación de: Persona/Empresa   │
│                                  │
│          [ Aceptar ]             │
└──────────────────────────────────┘
```

La aceptación siempre debe ser validada nuevamente por el backend.

---

# 18. Evitar múltiples requests

El lector de cámara puede detectar el mismo QR varias veces.

Por ello:

* bloquear temporalmente el escaneo mientras se procesa;
* evitar requests duplicadas;
* utilizar debounce/throttle cuando sea necesario;
* detener temporalmente la cámara después de detectar un QR;
* reactivar la cámara únicamente cuando corresponda.

Nunca enviar múltiples solicitudes simultáneas por el mismo QR debido a detecciones repetidas de la cámara.

---

# 19. API inicial

Crear:

```text
POST /api/v1/auth/login
POST /api/v1/auth/refresh
POST /api/v1/auth/logout

GET /api/v1/invitations

POST /api/v1/invitations/:id/accept

POST /api/v1/qr/validate

GET /api/v1/health
```

Los endpoints protegidos deben requerir autenticación.

Nunca confiar en un `userId` enviado desde React.

El usuario autenticado debe obtenerse desde el contexto de autenticación del backend.

---

# 20. Validación con Zod

Utilizar Zod para validar:

```text
body
params
query
headers relevantes
```

No confiar en datos enviados por el frontend.

Cada endpoint debe tener validación explícita.

Formato de error:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Datos inválidos"
  }
}
```

No devolver detalles internos innecesarios.

---

# 21. Códigos de error

Implementar códigos consistentes:

```text
INVALID_QR
QR_EXPIRED
QR_ALREADY_USED
INVITATION_NOT_FOUND
INVITATION_NOT_AVAILABLE
UNAUTHORIZED
FORBIDDEN
VALIDATION_ERROR
RATE_LIMITED
INTERNAL_ERROR
```

El frontend debe convertir estos códigos en mensajes amigables.

---

# 22. Modelo conceptual de Invitation

Preparar MongoDB para una estructura similar a:

```text
Invitation
├── _id
├── sender
├── recipient
├── status
├── qrTokenHash
├── expiresAt
├── usedAt
├── acceptedAt
├── createdAt
└── updatedAt
```

No agregar campos innecesarios.

Preparar el modelo para futuras ampliaciones.

Crear índices adecuados para:

```text
recipient
status
qrTokenHash
expiresAt
createdAt
```

Evaluar cuidadosamente el uso de índices TTL según el comportamiento requerido.

---

# 23. Docker

Crear:

```text
docker-compose.yml
```

con:

```text
web
api
mongodb
nginx
```

MongoDB debe estar únicamente dentro de una red privada.

NO exponer públicamente:

```text
27017
```

No utilizar en producción:

```text
27017:27017
```

El backend debe comunicarse con MongoDB mediante el nombre del servicio Docker.

Configurar:

* healthchecks;
* restart policies apropiadas;
* redes internas;
* variables de entorno;
* persistencia de MongoDB.

---

# 24. Nginx

Nginx será el reverse proxy.

Arquitectura:

```text
Internet
   │
   ▼
Nginx :443
   │
   ├── React
   │
   └── API
         │
         ▼
      MongoDB
```

Nginx debe ser el único servicio expuesto públicamente en producción.

Preparar HTTPS.

Redirigir:

```text
HTTP → HTTPS
```

cuando se configure el certificado.

---

# 25. Variables de entorno

Crear:

```text
.env.example
```

con:

```env
NODE_ENV=development

PORT=3000

MONGODB_URI=

JWT_PRIVATE_KEY=
JWT_PUBLIC_KEY=

JWT_ISSUER=
JWT_AUDIENCE=

ACCESS_TOKEN_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d

FRONTEND_URL=
CORS_ORIGINS=
```

Nunca incluir valores reales.

Agregar `.env` a `.gitignore`.

Nunca hardcodear:

* JWT secrets;
* passwords;
* API keys;
* private keys;
* credenciales de MongoDB.

---

# 26. Frontend API

Crear una capa centralizada de Axios:

```text
services/api.js
```

Gestionar:

```text
baseURL
headers
errores
401
refresh token
logout
```

Crear:

```text
services/authService.js
services/invitationService.js
services/qrService.js
```

No duplicar configuración de Axios en los componentes.

---

# 27. Estado global

Utilizar Zustand únicamente cuando sea necesario.

Separar conceptualmente:

```text
auth state
UI state
application state
```

No utilizar Zustand como sustituto innecesario del manejo de datos de API.

Mantener el estado simple.

---

# 28. UX móvil del escáner

El módulo QR debe estar optimizado para teléfonos.

Considerar:

* cámara trasera;
* permisos;
* permiso rechazado;
* poca iluminación;
* QR desenfocado;
* QR demasiado lejos;
* QR demasiado cerca;
* escaneo repetido;
* pérdida de conexión;
* timeout;
* detener cámara después de detección;
* reactivar cámara;
* loading.

Mostrar mensajes claros en todos los casos.

---

# 29. Rate limiting

Aplicar rate limiting especialmente a:

```text
/login
/refresh
/qr/validate
/invitations/:id/accept
```

La validación de QR debe estar protegida contra intentos masivos de fuerza bruta.

Considerar límites por:

```text
IP
usuario autenticado
```

cuando sea apropiado.

---

# 30. Logs y auditoría

Implementar logs estructurados para eventos importantes:

```text
login
logout
login_failed
qr_validation_failed
qr_used
invitation_accepted
invitation_rejected
rate_limit
security_error
```

Nunca registrar:

```text
password
JWT completo
refresh token
QR token completo
private keys
secrets
```

Si se necesita identificar un QR en logs, utilizar un identificador seguro o hash parcial.

---

# 31. Pruebas

Preparar pruebas para:

## Autenticación

```text
login correcto
login incorrecto
token expirado
refresh
logout
JWT inválido
JWT manipulado
```

## QR

```text
QR válido
QR inválido
QR expirado
QR ya utilizado
QR inexistente
QR escaneado nuevamente
dos solicitudes simultáneas
```

## Invitaciones

```text
listar invitaciones
aceptar invitación
usuario sin permisos
invitación inexistente
invitación expirada
```

## Seguridad

```text
CORS
rate limiting
validación
headers
requests inválidos
acceso sin autenticación
```

---

# 32. Scripts

Configurar:

```text
npm run dev
npm run build
npm run start
npm run lint
npm run test
```

---

# 33. Calidad de código

Aplicar:

* ESLint;
* separación de responsabilidades;
* funciones pequeñas;
* nombres descriptivos;
* evitar código duplicado;
* manejo centralizado de errores;
* configuración centralizada;
* servicios independientes;
* componentes React reutilizables.

No sobrearquitecturar.

Priorizar:

```text
simple
seguro
rápido
mantenible
```

---

# 34. Primera fase de implementación

NO intentar implementar todo de una sola vez.

Primero crear una base completamente funcional.

Debe ser posible ejecutar:

```bash
docker compose up -d
```

y levantar:

```text
Nginx
React
Node.js
MongoDB
```

Crear:

```text
GET /api/v1/health
```

con:

```json
{
  "success": true,
  "status": "ok"
}
```

Verificar:

* frontend;
* backend;
* MongoDB;
* Docker;
* API;
* healthcheck;
* comunicación entre contenedores.

---

# 35. README

Crear documentación con:

```text
Requisitos
Instalación
Variables de entorno
Desarrollo
Docker
Producción
Estructura
API
Autenticación
Sistema QR
Seguridad
Testing
```

Incluir comandos exactos.

---

# 36. Orden obligatorio de desarrollo

Seguir este orden:

```text
FASE 1
Scaffold del proyecto
        ↓
FASE 2
Docker + MongoDB + Nginx
        ↓
FASE 3
React + Vite
        ↓
FASE 4
Express API
        ↓
FASE 5
Healthcheck
        ↓
FASE 6
Autenticación JWT
        ↓
FASE 7
Usuarios
        ↓
FASE 8
Modelo de invitaciones
        ↓
FASE 9
Generación de QR
        ↓
FASE 10
Validación QR
        ↓
FASE 11
QR de un solo uso
        ↓
FASE 12
Escáner QR
        ↓
FASE 13
Alertas de escaneo
        ↓
FASE 14
Invitaciones recibidas
        ↓
FASE 15
Aceptación de invitaciones
        ↓
FASE 16
Auditoría
        ↓
FASE 17
Pruebas
        ↓
FASE 18
Hardening de seguridad
        ↓
FASE 19
Preparación para producción
```

---

# 37. Reglas estrictas

Durante todo el desarrollo:

1. NO utilizar TypeScript.
2. Utilizar JavaScript ES2024.
3. No almacenar secretos en frontend.
4. No almacenar contraseñas en texto plano.
5. No utilizar IDs predecibles como tokens QR.
6. No almacenar tokens QR originales innecesariamente.
7. No confiar en validaciones del frontend.
8. Toda regla de seguridad debe validarse en backend.
9. No permitir reutilización de QR.
10. La aceptación de QR debe ser atómica.
11. No permitir múltiples requests simultáneas por un mismo escaneo.
12. Informar visualmente cada detección QR.
13. Mostrar una alerta específica cuando un QR ya fue utilizado.
14. Usar HTTPS/TLS para proteger las comunicaciones.
15. NO implementar cifrado manual innecesario de cada request.
16. Utilizar JWT para autenticación.
17. Utilizar cookies HttpOnly/Secure/SameSite para refresh tokens.
18. Utilizar Argon2id para contraseñas.
19. Aplicar rate limiting.
20. Aplicar validación estricta con Zod.
21. No exponer MongoDB públicamente.
22. No mostrar stack traces en producción.
23. No registrar secretos en logs.
24. Mantener el código modular.
25. No agregar dependencias innecesarias.
26. No sobrearquitecturar.
27. Después de cada fase, verificar que el proyecto compile y funcione antes de continuar.

---

# 38. Resultado esperado

Al finalizar la implementación inicial debe existir:

```text
                 INTERNET
                    │
                  HTTPS
                    │
                    ▼
                 NGINX
                    │
          ┌─────────┴─────────┐
          ▼                   ▼
       REACT                 API
       VITE              NODE + EXPRESS
                              │
                              ▼
                           MONGODB
```

La aplicación debe disponer de:

```text
/login
/scan
/invitations
```

y estar preparada para:

* autenticación segura;
* generación de invitaciones;
* generación de QR únicos;
* QR de un solo uso;
* detección mediante cámara;
* alertas de escaneo;
* detección de QR reutilizado;
* expiración;
* aceptación de invitaciones;
* auditoría;
* rate limiting;
* despliegue mediante Docker;
* producción mediante HTTPS.

Al terminar cada etapa, mostrar:

1. qué se implementó;
2. archivos creados o modificados;
3. dependencias agregadas;
4. comandos para ejecutar;
5. pruebas realizadas;
6. problemas encontrados;
7. cómo fueron solucionados;
8. medidas de seguridad aplicadas;
9. siguiente fase recomendada.

La prioridad absoluta es construir una aplicación **rápida de desarrollar, segura, sencilla de mantener y preparada para crecer**, sin introducir complejidad que no aporte valor real.
