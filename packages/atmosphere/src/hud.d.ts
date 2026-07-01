/**
 * Mapeo del cielo vigente a las variables del HUD (S2-A1) — "el HUD respira el cielo". Puro y
 * testeable; el world-client solo escribe el resultado en :root (--atmo-*) por DOM, con throttle.
 *
 * Clave de accesibilidad: el TINTE conserva la LUMINANCIA del acento champán y solo nubla su TONO
 * hacia el cielo → el acento respira sin perder legibilidad (WCAG AA intacto en día/noche/lluvia/
 * niebla). El GLOW baja de noche; el CONTRASTE (opacidad del panel) sube con la niebla.
 */
import type { AtmosphereParams } from './types';
export type HudAtmoVars = {
    /** Acento que respira con el cielo, con la luminancia del champán. '#rrggbb'. */
    tint: string;
    /** Resplandor tintado para las sombras del HUD; su alfa baja de noche. 'rgba(r,g,b,a)'. */
    glow: string;
    /** Multiplicador de opacidad del panel (1 = base); sube con la niebla para "solidificar". */
    contrast: number;
};
/** Resuelve las variables --atmo-* del HUD a partir de los params de atmósfera del frame. */
export declare function resolveHudAtmo(p: AtmosphereParams): HudAtmoVars;
//# sourceMappingURL=hud.d.ts.map