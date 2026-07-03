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

<!-- Las secciones siguientes se completan a medida que se implementa cada pieza de Ola 4. -->
