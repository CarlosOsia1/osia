/**
 * Capa de datos de La Red Social (R1 de la reconstrucción). Un módulo por dominio; TODA
 * respuesta se valida contra su esquema de `@osia/shared` en `client.ts` (ApiContractError
 * si el contrato diverge). Las mutaciones optimistas viven en `lib/mutations/*`.
 */

export * from './client';
export * from './media';
export * from './posts';
export * from './feed';
export * from './comments';
export * from './profiles';
export * from './follows';
export * from './notifications';
export * from './presence';
export * from './discover';
export * from './reports';
export * from './bookmarks';
export * from './moderation';
export * from './dm';
