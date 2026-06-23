/**
 * DTO de avatar (docs/10 §2.2; ER §3.x). El editor de avatar low-poly y su esquema discreto
 * de `config` (partes/colores/cosméticos) se fijan en S1.6; aquí basta una forma serializable
 * y estable para que el contrato exista desde los cimientos.
 */

import type { AvatarKind } from '../../domain/enums';

/** Configuración serializable del avatar (jsonb en el ER). Esquema discreto exacto: S1.6. */
export type AvatarConfig = Readonly<Record<string, string | number | boolean>>;

export type AvatarDto = {
  id: string;
  kind: AvatarKind;
  config: AvatarConfig;
  /** URL del gltf renderizado; `null` para low-poly puramente paramétrico. */
  gltfUrl: string | null;
  isActive: boolean;
  /** ISO-8601 UTC. */
  createdAt: string;
};
