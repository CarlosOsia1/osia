/**
 * @osia/ui — Design System de OSIA (tokens + componentes con Italiana / Jost).
 *
 * La piel de OSIA vive aquí: tokens (CSS vars en `styles.css`, importado una vez por app)
 * y primitivas React reutilizables. Ningún componente de las apps redefine estilos desde 0;
 * todo consume esta capa. Ver docs/02-marca-design-system.md.
 */

export { OSIA_COLORS, type OsiaColorToken } from './tokens';
export { Button, type ButtonProps, type ButtonVariant, type ButtonSize } from './Button';
export { Panel, type PanelProps } from './Panel';
export { Field, type FieldProps } from './Field';
export { Dot } from './Dot';
