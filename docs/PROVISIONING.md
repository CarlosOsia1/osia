# PROVISIONING — lo que Carlos hace manual (cuentas, keys, activaciones)

> Este doc lista **todo lo que el código deja listo pero que requiere una acción tuya** (crear una
> cuenta, pegar una key, activar una feature, aplicar una migración al desplegar). Cada ítem dice
> **qué es, dónde conseguirlo y qué variable/paso poner**. El código correspondiente ya está en `main`.
>
> Convención de secretos: **nunca** en el repo. Van en `supabase/.env.local` (dev, gitignored) y en el
> host/CI (prod). Ver `apps/api/src/config/env.ts` (validación Zod al arrancar).

---

## 0. Ya committeado — pendiente de un paso tuyo al desplegar

### 0.1 Aplicar las 2 migraciones pendientes al desplegar/probar el API nuevo
> `supabase db push` aplica TODAS las pendientes en orden. Estas dos van juntas y las aplicas TÚ (bajo tu
> vista) al correr el API nuevo, porque `dev == prod`: `pnpm exec supabase db push --db-url "$SUPABASE_DB_URL" --yes`
>
> - **`20260702000011_post_media_private.sql` (1D):** pone los buckets `post-media`/`post-video` en privado.
>   Desde ese momento la media SOLO se ve por URL firmada (la firma el API nuevo). **Verificar:** subir una
>   foto a un post, confirmar que **se ve logueado** y que **da 403 por URL directa**. Si NO se ve, avísame
>   (el firmado está unit-testeado pero no lo pude probar contra un objeto real subido).
> - **`20260702000012_identity_sessions.sql` (1F):** crea `identity.sessions`. **El API nuevo la NECESITA**
>   para el login (si no existe, el login falla al insertar la sesión).
>
> **Re-login único (1F):** la cookie de sesión cambió de `osia.rt` a `osia.sid`. La primera vez que corras el
> API nuevo, las sesiones viejas dejan de valer y hay que **volver a entrar una vez** (esperado, no es un bug).
> **Probar 1F:** entra en Vestíbulo → Social → Mundo (SSO sigue), deja una pestaña abierta un rato y confirma
> que NO te saca solo (el "logout aleatorio" ya no pasa), y que **Logout** cierra de verdad.

### 0.2 Template de email "Recovery" en Supabase (recuperar contraseña — ya en Vestíbulo)
- **Dónde:** Supabase Dashboard → Authentication → Email Templates → **Reset Password**.
- **Qué:** confirmar que el cuerpo incluye `{{ .Token }}` (OTP), no solo `{{ .ConfirmationURL }}`.

---

## 1. Entornos dev/prod separados (hoy dev == prod — IMPORTANTE)

- **Problema:** hay UNA sola base Supabase; el dev local corre contra producción. Cualquier migración o
  test destructivo toca datos reales.
- **Qué hacer:** crear un **segundo proyecto Supabase** (gratis) para desarrollo.
  - **Dónde:** https://supabase.com/dashboard → New project (nómbralo `osia-dev`).
  - **Copiar** a `supabase/.env.local` (dev) las keys del proyecto DEV:
    - `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` → Project Settings → API.
    - `SUPABASE_DB_URL` → Project Settings → Database → Connection string (session pooler, con tu password).
  - En **producción** (host/CI): las mismas 4 variables pero del proyecto PROD.
  - Aplicar TODAS las migraciones al proyecto dev nuevo: `supabase db push --db-url "<DEV_DB_URL>" --yes`.
- **Resultado:** el `OSIA_ENV`/`NODE_ENV` ya distingue; con dos proyectos, dev deja de tocar prod.

---

## 2. Observabilidad — Sentry (código listo, env-gated)

- **Qué:** el API ya inicializa Sentry si hay `SENTRY_DSN` y reporta los errores 5xx; sin DSN es inerte.
- **Dónde conseguirlo:** https://sentry.io → New Project → **Node.js** → copia el **DSN** (Settings → Client Keys).
- **Qué poner:** `SENTRY_DSN=https://…@…ingest.sentry.io/…` en el entorno del API (host/CI; y en dev si quieres).
- **Verificar:** forzar un 500 (o mirar el primer error real) y ver que aparece en el dashboard de Sentry.
- **(Opcional) Alertas a Discord:** en Sentry → Alerts → crea una regla → integración **Discord** (o un webhook).

## 3. Voz P2P — TURN (código listo, env-gated)

- **Qué:** `GET /v1/world/ice` ya devuelve STUN siempre; y TURN con credenciales efímeras HMAC si hay
  `TURN_URLS`+`TURN_SECRET`. Sin ellas, solo STUN (suficiente en la mayoría de redes; falla en NAT simétrico).
- **Opción fácil (recomendada al lanzar): Cloudflare Calls TURN** → https://dash.cloudflare.com → Calls →
  TURN → genera credenciales; usa el `turn:`/`turns:` y el secreto que te den.
- **Opción propia: coturn** en tu server (Hetzner) con `use-auth-secret` y un `static-auth-secret`.
- **Qué poner:** `TURN_URLS=turn:tu-turn:3478,turns:tu-turn:5349` y `TURN_SECRET=<el secreto compartido>`
  (opcional `TURN_TTL_S`, default 3600). El secreto NUNCA sale al cliente; el API deriva la credencial.
- **Pendiente de front (Fable):** que `world-client` pida `GET /v1/world/ice` y pase `iceServers` al
  `RTCPeerConnection` de la voz (hoy usa STUN fijo). Es un cambio chico de front.

## 4. Rate-limit multi-instancia — Redis (solo si corres >1 instancia del API)

- **Qué:** el rate-limit ya es POR CUENTA, pero el conteo es en memoria del proceso. Con varias instancias
  del API detrás de un balanceador, cada una cuenta por separado. Para un límite consistente hace falta un
  storage compartido (Redis) para `@nestjs/throttler`.
- **Cuándo:** solo al escalar a >1 instancia (el piloto corre 1 → no hace falta aún).
- **Dónde:** Upstash Redis (free) https://upstash.com o el Redis de tu host. Copia la `REDIS_URL`.
- **Qué falta de código:** cablear `ThrottlerModule` con `@nest-lab/throttler-storage-redis` + `REDIS_URL`
  (media hora; lo hago cuando decidas escalar).

## 5. Tiempo real — Supabase Realtime (notificaciones al instante)

- **Qué:** hoy las notificaciones llegan por **polling cada 30 s**. Realtime las haría instantáneas.
- **Dónde/activar:** Supabase Dashboard → Database → Replication → habilita Realtime en `social.notifications`
  (o la tabla que corresponda). Requiere que el cliente se suscriba con la anon key.
- **Pendiente de front (Fable):** suscripción Realtime en `apps/social` (reemplaza/complementa el polling).
  Es trabajo de front; el backend solo necesita la tabla habilitada.

## 6. Deploy (imágenes + hosts)

- **Imágenes:** el push a `main` publica `ghcr.io/<owner>/osia-api` y `osia-world` (workflow `publish.yml`).
  Requiere que el repo tenga GitHub Packages habilitado (por defecto lo está). El world-server ya tiene
  guía (Fly.io/Hetzner) en `docs/deploy-paso-a-paso.md`; el **api** ahora también tiene Dockerfile.
- **Frontend (Vercel):** apps/web, apps/social, apps/world-client → Vercel (zero-config Next). Setea las
  envs `NEXT_PUBLIC_*` (API_URL, WORLD_URL, SOCIAL_URL) por proyecto.
- **Env del api en prod:** `SUPABASE_*`, `SUPABASE_DB_URL`, `CORS_ORIGINS` (dominios reales, nunca `*`),
  `COOKIE_DOMAIN=.tu-dominio` + `COOKIE_SECURE=true`, `WORLD_TICKET_SECRET` (robusto, = world-server),
  `WORLD_WS_URL`, `APP_BASE_URL`, `SMTP_*`, y los opcionales de arriba (SENTRY/TURN).

## 7. Pendientes de CÓDIGO que quedan (los hago cuando digas / cuando desbloquees)

- **1G — tests de integración HTTP:** el job de CI "migraciones-desde-cero" ya está. Los tests HTTP
  (supertest sobre la app Nest real) necesitan la **base de dev separada** (§1); cuando exista, los escribo.
- **1B — precisión µs del cursor (menor):** el driver pg trunca el timestamp a ms; el fix (seleccionar el
  ts como texto en cada query paginada) es amplio y arriesgado. Edge case raro (dos filas en el mismo ms).
  Lo hago con calma si aparece en la práctica. La otra mitad (dedup de notif) ya la cubre 1C.
- **Front de TURN y de Realtime:** cambios chicos en `world-client`/`social` (Fable), descritos arriba.

---

## Resumen: qué me pasas y yo activo

| Necesito de ti | Dónde | Variable / paso |
|---|---|---|
| Proyecto Supabase de DEV | supabase.com | `SUPABASE_*` + `SUPABASE_DB_URL` (dev) |
| Aplicar migraciones al desplegar | tu máquina | `supabase db push` (incluye 000011 media + 000012 sesiones) |
| Sentry DSN | sentry.io | `SENTRY_DSN` |
| TURN (Cloudflare o coturn) | Cloudflare Calls / tu server | `TURN_URLS`, `TURN_SECRET` |
| Redis (solo si escalas) | Upstash / tu host | `REDIS_URL` |
| Realtime | Supabase Dashboard | habilitar en `social.notifications` |
| Template Recovery con `{{ .Token }}` | Supabase Dashboard | Email Templates → Reset Password |
