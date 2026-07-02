/**
 * Rutas de La Red Social (R2): builders tipados, ÚNICA fuente de los paths. Ningún componente
 * escribe un href a mano — el smell de literales dispersos (`/profile/${x}`…) murió aquí.
 * Rutas en español (glosario es-CO): la app aún no está lanzada, cero enlaces externos rotos.
 */
export const routes = {
  home: '/',
  perfil: (handle: string) => `/perfil/${encodeURIComponent(handle)}`,
  publicacion: (id: string) => `/publicacion/${id}`,
  crear: '/crear',
  amigos: '/amigos',
  descubrir: '/descubrir',
  notificaciones: '/notificaciones',
  guardados: '/guardados',
  mensajes: '/mensajes',
} as const;
