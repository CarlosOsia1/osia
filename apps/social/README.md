# apps/social — La Red Social

App independiente (deep-linkable) del **Tejido Social** de OSIA (Fase 3): feed, seguidores,
popularidad/reputación, presencia social y notificaciones. Se enchufa al ecosistema **solo** por el
Pasaporte (SSO de `@osia/identity`) y el Vestíbulo (`apps/web`). Estética editorial dark-first; el
bundle **no** incluye Three.js (el engine 3D vive solo en `world-client`).

> Estado: **S3.1-H1 ✅** — scaffold + SSO (sin re-login) + shell autenticado. El feed/grafo/
> notificaciones llegan en S3.2–S3.4. Backlog: [`docs/backlog/fase-3-tejido-social.md`](../../docs/backlog/fase-3-tejido-social.md).

## Desarrollo

```bash
pnpm --filter @osia/social dev   # Next.js App Router en http://localhost:3002
```

Requiere `apps/api` arriba (`pnpm --filter @osia/api dev`, :4000) para resolver la sesión SSO, y
el Vestíbulo (`apps/web`, :3001) para el login. Variables: ver [`.env.example`](./.env.example)
(`NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_VESTIBULE_URL`, `NEXT_PUBLIC_SOCIAL_URL`).

## SSO

- **Con sesión** (cookie de refresh del dominio padre `.osia.*`): `useOsiaSession` resuelve el
  Pasaporte sin re-login.
- **Sin sesión**: el `middleware` redirige al `/login` del Vestíbulo con `returnTo` a esta app.
- **Sesión stale** (401): `SocialHome` revalida y reenvía al login.

## Estructura

```
app/        layout · providers · page · _components/SocialHome  (App Router)
i18n/       request.ts (locale por cookie osia.locale, @osia/i18n)
lib/        identity.ts (cliente SSO) · vestibule.ts (URL de login)
middleware.ts  guard de rutas (privada)
```

Contratos y validación en `@osia/shared`; UI en `@osia/ui`; textos en `@osia/i18n` (namespace `social`).
