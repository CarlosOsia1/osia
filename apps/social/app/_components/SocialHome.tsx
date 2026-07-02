'use client';

import { ComposerInline } from './ComposerInline';
import { Feed } from './Feed';

/**
 * SocialHome (R2) — contenido central de "/" en el Salón: el composer inline (invitación serena
 * que se expande al composer real) + el feed editorial. El shell (header/sidebar/rail/tab bar)
 * y la sesión los provee `AppFrame` en el layout; aquí solo va el cuerpo.
 */
export function SocialHome() {
  return (
    <>
      <ComposerInline />
      <Feed />
    </>
  );
}
