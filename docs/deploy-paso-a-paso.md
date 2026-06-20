# Deploy de OSIA — paso a paso (piloto → escala)

> Objetivo: poner OSIA en internet con **HTTPS** (imprescindible para la voz) de la forma
> más simple y barata, dejando el camino a miles de jugadores. Estado: guía operativa.

## Stack del piloto (~4–7 USD/mes)

| Pieza | Servicio | Costo |
|---|---|---|
| Frontend (Next.js) | **Vercel** (free) — zero-config para Next | 0 |
| World-server (WS + tick) | **Hetzner CX23** + Docker + Caddy (HTTPS auto) | ~4 €/mes |
| Voz (NAT traversal) | **STUN público** ahora; Cloudflare TURN al lanzar | 0 |
| Dominio | Cloudflare Registrar / Namecheap | ~10 USD/año |
| DNS / DDoS | **Cloudflare** (free) | 0 |

> Nota: arrancamos el front en **Vercel** (no Pages) porque hoy la escena es **procedural**
> (sin assets 3D pesados), y Vercel es zero-config para Next. Cuando metamos modelos/texturas
> pesados, movemos el front a **Cloudflare Pages + R2** (egress 0) — ahí Vercel se vuelve caro.

## Lo que YA dejé hecho (en el repo)
- `apps/world-server/Dockerfile` + `.dockerignore`
- `infra/Caddyfile` (TLS automático + reverse proxy del WS)
- `infra/docker-compose.prod.yml` (world-server + Caddy)
- `WORLD_PUBLIC_WS_URL` configurable (el server ya no devuelve `ws://localhost`)
- Fail-fast del secreto en producción + rate-limits + saneo (ya estaban)

## Lo que tenés que hacer VOS

### 0) Cuentas (una vez)
1. Comprá un **dominio** (ej. `osia.app`).
2. Creá cuenta en **Cloudflare**, agregá el dominio y apuntá los **nameservers** del dominio a Cloudflare.
3. Creá cuenta en **Hetzner Cloud**.
4. Tené el repo en **GitHub** (privado está bien) y una cuenta en **Vercel**.

### 1) Generá el secreto del ticket
En tu compu: `openssl rand -hex 32` → guardá ese valor (es `WORLD_TICKET_SECRET`).

### 2) World-server en Hetzner
1. Creá un servidor **CX23** (Ubuntu 24.04). Anotá su **IP**.
2. Entrá por SSH: `ssh root@IP`.
3. Instalá Docker: `curl -fsSL https://get.docker.com | sh`.
4. Cloná el repo: `git clone <tu-repo> osia && cd osia`.
5. Editá `infra/Caddyfile`: cambiá `ws.TU-DOMINIO.com` por tu subdominio real (ej. `ws.osia.app`).
6. Creá `infra/.env.prod` con:
   ```
   WORLD_TICKET_SECRET=<el-secreto-del-paso-1>
   WORLD_CORS_ORIGINS=https://<tu-app>.vercel.app
   WORLD_PUBLIC_WS_URL=wss://ws.osia.app/world
   ```
   (el origen de Vercel lo tendrás tras el paso 4; podés volver y completarlo)
7. Levantá: `docker compose -f infra/docker-compose.prod.yml --env-file infra/.env.prod up -d --build`
8. Abrí el **firewall** de Hetzner: permití puertos **80** y **443** (TCP).

### 3) DNS del WS (en Cloudflare)
- Registro **A**: `ws` → la **IP** de Hetzner.
- **Importante: nube GRIS (DNS only)**, no naranja. (El proxy naranja corta los WebSockets largos.)
- En ~1–2 min, Caddy obtiene el certificado solo. Probá: `https://ws.osia.app/health` debe responder `{"ok":true,...}`.

### 4) Frontend en Vercel
1. En Vercel: **Add New → Project → Import** tu repo de GitHub.
2. **Root Directory**: `apps/world-client`.
3. **Environment Variables**:
   ```
   NEXT_PUBLIC_WORLD_WS_URL = wss://ws.osia.app/world
   NEXT_PUBLIC_WORLD_API_URL = https://ws.osia.app
   ```
4. **Deploy**. Vercel te da una URL `https://<algo>.vercel.app` (HTTPS automático).

### 5) Conectá las puntas (CORS)
1. Copiá la URL de Vercel del paso 4.
2. En el server, poné esa URL en `WORLD_CORS_ORIGINS` (en `infra/.env.prod`) y reiniciá:
   `docker compose -f infra/docker-compose.prod.yml --env-file infra/.env.prod up -d`
3. (opcional) Asigná tu dominio propio al front en Vercel (`osia.app`) — nube **naranja** en Cloudflare — y agregalo también a `WORLD_CORS_ORIGINS`.

### 6) Probá
- Abrí la URL de Vercel en 2 dispositivos/navegadores → caminan juntos.
- **Voz**: ahora estás en **https**, así que `getUserMedia` funciona. Activá voz en ambos.

### 7) (Antes del lanzamiento público) TURN para la voz
Sin TURN, ~15–20 % de jugadores (NAT simétrico/CGNAT) no conectan voz. Cuando llegue el momento:
- Activá **Cloudflare Realtime TURN** (gratis hasta 1000 GB/mes) y poné `NEXT_PUBLIC_TURN_*` en Vercel.
- (El código ya lee esas variables; no hay que tocar nada.)

---

## Camino a miles de jugadores (qué cambia y cuándo)

| Escala | Qué hacer | Costo aprox |
|---|---|---|
| **0–100** | Todo como arriba, 1 caja | 4–15 USD/mes |
| **100–1.000** | Subir el world-server (CX42/CCX) cuando el tick tenga jitter; **sharding por zonas**; Redis managed para presencia compartida | 40–120 |
| **1.000–10.000** | Flota sharded multi-región (Fly.io/Vultr para LATAM/Asia); **voz P2P → SFU** (LiveKit/Cloudflare); front a **Pages + R2** | 1.500–6.000+ |

**Cuellos en orden:** primero el **CPU del tick** (~300–800 activos/caja), después el **egress**
(voz + broadcast). Regla de oro a escala: **quedate en Hetzner/bare-metal** por el egress barato
(1,19 €/TB) — un hyperscaler cobra 25–75× por lo mismo. Assets 3D **siempre** en R2 (egress 0).

**Decisiones a tomar cuando escalemos:** mundo por zonas discretas vs continuo (define si conviene
Colyseus); persistencia del estado (hoy es en RAM, volátil); primer mercado fuera de EU.
