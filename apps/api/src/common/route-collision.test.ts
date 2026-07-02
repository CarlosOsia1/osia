/**
 * Guardia de enrutamiento: en Nest, dos controllers que declaran la misma ruta NO fallan al
 * arrancar — gana el del módulo registrado primero y el otro queda inalcanzable en silencio.
 * Así se tapó `GET /v1/profiles/{handle}` (identity S1.6 sombreaba al de social S3.5 y el perfil
 * llegaba sin `viewerState`/`canViewContent`). Este test recorre el árbol real de módulos desde
 * `AppModule` (solo metadatos de decoradores; no instancia nada) y falla ante cualquier duplicado.
 */

import 'reflect-metadata';
import test from 'node:test';
import assert from 'node:assert/strict';
import { RequestMethod } from '@nestjs/common';
import { AppModule } from '../app.module';

type Ctor = abstract new (...args: never[]) => unknown;
type DynamicModule = { module: Ctor; controllers?: Ctor[]; imports?: ModuleRef[] };
type ModuleRef = Ctor | DynamicModule | Promise<never>;

function isDynamic(ref: ModuleRef): ref is DynamicModule {
  return typeof ref === 'object' && ref !== null && 'module' in ref;
}

/** Recolecta todos los controllers alcanzables desde el módulo raíz (clases y módulos dinámicos). */
function collectControllers(root: ModuleRef, seen = new Set<unknown>(), out: Ctor[] = []): Ctor[] {
  const key = isDynamic(root) ? root.module : root;
  if (seen.has(key)) return out;
  seen.add(key);

  const controllers: Ctor[] = isDynamic(root)
    ? (root.controllers ?? [])
    : ((Reflect.getMetadata('controllers', root) as Ctor[] | undefined) ?? []);
  out.push(...controllers);

  const imports: ModuleRef[] = isDynamic(root)
    ? (root.imports ?? [])
    : ((Reflect.getMetadata('imports', root) as ModuleRef[] | undefined) ?? []);
  for (const child of imports) collectControllers(child, seen, out);
  return out;
}

/** Rutas completas de un controller como `MÉTODO /segmentos/:param` (params normalizados). */
function routesOf(controller: Ctor): string[] {
  const bases = ([] as string[]).concat(
    (Reflect.getMetadata('path', controller) as string | string[] | undefined) ?? '/',
  );
  const proto = controller.prototype as Record<string, unknown>;
  const routes: string[] = [];
  for (const name of Object.getOwnPropertyNames(proto)) {
    if (name === 'constructor') continue;
    const handler = proto[name];
    if (typeof handler !== 'function') continue;
    const sub = Reflect.getMetadata('path', handler) as string | string[] | undefined;
    const method = Reflect.getMetadata('method', handler) as number | undefined;
    if (sub === undefined || method === undefined) continue;
    for (const base of bases) {
      for (const p of ([] as string[]).concat(sub)) {
        const full = `/${base}/${p}`
          .replace(/\/+/g, '/')
          .replace(/\/$/, '')
          .replace(/:[^/]+/g, ':param');
        routes.push(`${RequestMethod[method]} ${full === '' ? '/' : full}`);
      }
    }
  }
  return routes;
}

test('ningún par de controllers declara la misma ruta (método + path)', () => {
  const controllers = collectControllers(AppModule);
  assert.ok(controllers.length >= 10, `se esperaban los controllers reales, llegaron ${controllers.length}`);

  const owners = new Map<string, string[]>();
  for (const c of controllers) {
    for (const route of routesOf(c)) {
      owners.set(route, [...(owners.get(route) ?? []), c.name]);
    }
  }
  const collisions = [...owners].filter(([, names]) => names.length > 1);
  assert.deepEqual(
    collisions,
    [],
    `rutas duplicadas (el segundo controller queda inalcanzable): ${collisions
      .map(([r, names]) => `${r} → ${names.join(' y ')}`)
      .join(' · ')}`,
  );
});

test('GET /profiles/{handle} la sirve el perfil social (con viewerState), no el brief de identity', () => {
  const controllers = collectControllers(AppModule);
  const owner = controllers.filter((c) => routesOf(c).includes('GET /profiles/:param'));
  assert.deepEqual(
    owner.map((c) => c.name),
    ['PublicProfileController'],
  );
});
