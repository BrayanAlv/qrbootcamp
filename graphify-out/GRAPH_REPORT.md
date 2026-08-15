# Graph Report - /home/brayanalvz/WebstormProjects/qrBootcam/apps  (2026-08-13)

## Corpus Check
- Corpus is ~8,896 words - fits in a single context window. You may not need a graph.

## Summary
- 254 nodes · 504 edges · 12 communities
- Extraction: 93% EXTRACTED · 7% INFERRED · 0% AMBIGUOUS · INFERRED: 33 edges (avg confidence: 0.51)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Autenticación y Usuarios
- Frontend y Páginas
- Dependencias Web
- Dependencias API
- Emails e Invitaciones
- Manejo de Invitaciones
- Importación y Validación QR
- Infraestructura y Salud
- Auth API y Rutas

## God Nodes (most connected - your core abstractions)
1. `Invitation` - 13 edges
2. `AppError` - 13 edges
3. `env` - 11 edges
4. `refresh()` - 10 edges
5. `sendInvitationEmails()` - 10 edges
6. `hashToken()` - 8 edges
7. `useAuthStore` - 8 edges
8. `issueSession()` - 7 edges
9. `asyncHandler()` - 7 edges
10. `extractError()` - 7 edges

## Surprising Connections (you probably didn't know these)
- `toQrDataUrl()` --references--> `qrcode`  [EXTRACTED]
  api/src/services/qr.service.js → api/package.json
- `createApp()` --indirect_call--> `errorHandler()`  [INFERRED]
  api/src/server.js → api/src/middleware/errorHandler.js
- `importInvitationsFromExcel()` --references--> `Invitation`  [EXTRACTED]
  api/src/services/invitationImport.service.js → api/src/models/Invitation.model.js
- `findInvitationByHash()` --references--> `Invitation`  [EXTRACTED]
  api/src/services/qr.service.js → api/src/models/Invitation.model.js
- `validateQrToken()` --calls--> `hashToken()`  [EXTRACTED]
  api/src/services/qrValidate.service.js → api/src/services/qr.service.js

## Import Cycles
- None detected.

## Communities (12 total, 0 thin omitted)

### Community 0 - "Autenticación y Usuarios"
Cohesion: 0.12
Nodes (26): RefreshToken, refreshTokenSchema, User, userSchema, baseClaims(), signAccessToken(), signRefreshToken(), verifyToken() (+18 more)

### Community 1 - "Frontend y Páginas"
Cohesion: 0.13
Nodes (18): AppLayout(), HealthPage(), InvitationsPage(), STATUS_COLOR, LoginPage(), SCAN_STATES, ScanQRPage(), router (+10 more)

### Community 2 - "Dependencias Web"
Cohesion: 0.06
Nodes (32): allowScripts, esbuild@0.25.12, dependencies, axios, @emotion/react, @emotion/styled, @mui/icons-material, @mui/material (+24 more)

### Community 3 - "Dependencias API"
Cohesion: 0.06
Nodes (30): dependencies, cookie-parser, cors, dotenv, exceljs, express, express-rate-limit, handlebars (+22 more)

### Community 4 - "Emails e Invitaciones"
Cohesion: 0.14
Nodes (21): EMAIL_STATUS, Invitation, INVITATION_STATUS, invitationSchema, recipientSchema, buildMessage(), isSent(), sendAllPendingEmails() (+13 more)

### Community 5 - "Manejo de Invitaciones"
Cohesion: 0.12
Nodes (19): sendAll, sendInvitation, accept, importInvitations, listInvitations, validateQr, ALLOWED, uploadExcel (+11 more)

### Community 6 - "Importación y Validación QR"
Cohesion: 0.15
Nodes (16): bufferToString(), HEADER_ALIASES, importInvitationsFromExcel(), mapHeaders(), normalizeKey(), readRows(), rowToGuest(), findInvitationByHash() (+8 more)

### Community 7 - "Infraestructura y Salud"
Cohesion: 0.22
Nodes (11): connectDb(), isDbConnected(), env, envSchema, parsed, getHealth, errorHandler(), router (+3 more)

### Community 8 - "Auth API y Rutas"
Cohesion: 0.18
Nodes (13): clearRefreshCookie(), loginHandler, logoutHandler, meHandler, refreshCookieOptions(), refreshHandler, protect, loginLimiter (+5 more)

## Knowledge Gaps
- **78 isolated node(s):** `name`, `version`, `private`, `type`, `description` (+73 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `toQrDataUrl()` connect `Emails e Invitaciones` to `Dependencias API`?**
  _High betweenness centrality (0.147) - this node is a cross-community bridge._
- **Why does `qrcode` connect `Dependencias API` to `Emails e Invitaciones`?**
  _High betweenness centrality (0.143) - this node is a cross-community bridge._
- **What connects `name`, `version`, `private` to the rest of the system?**
  _78 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Autenticación y Usuarios` be split into smaller, more focused modules?**
  _Cohesion score 0.12051282051282051 - nodes in this community are weakly interconnected._
- **Should `Frontend y Páginas` be split into smaller, more focused modules?**
  _Cohesion score 0.13277310924369748 - nodes in this community are weakly interconnected._
- **Should `Dependencias Web` be split into smaller, more focused modules?**
  _Cohesion score 0.06060606060606061 - nodes in this community are weakly interconnected._
- **Should `Dependencias API` be split into smaller, more focused modules?**
  _Cohesion score 0.06451612903225806 - nodes in this community are weakly interconnected._