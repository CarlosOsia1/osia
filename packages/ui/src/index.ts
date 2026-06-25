/**
 * @osia/ui — Design System de OSIA (tokens + componentes con Italiana / Jost).
 *
 * La piel de OSIA vive aquí: tokens (CSS vars en `styles.css`, importado una vez por app)
 * y primitivas React reutilizables. Ningún componente de las apps redefine estilos desde 0;
 * todo consume esta capa. Ver docs/02-marca-design-system.md.
 */

export { OSIA_COLORS, type OsiaColorToken } from './tokens';
export {
  ThemeProvider,
  useTheme,
  useReducedMotion,
  type ThemePrefs,
  type ReducedMotionPref,
} from './ThemeProvider';
export { Button, type ButtonProps, type ButtonVariant, type ButtonSize } from './Button';
export { Card, type CardProps } from './Card';
export { Modal, type ModalProps } from './Modal';
export { Panel, type PanelProps } from './Panel';
export { HudPanel, type HudPanelProps } from './HudPanel';
export { Field, type FieldProps } from './Field';
export { PasswordField, type PasswordFieldProps } from './PasswordField';
export { CodeInput, type CodeInputProps } from './CodeInput';
export { FormError } from './FormError';
export { Switch, type SwitchProps } from './Switch';
export { Nameplate, type NameplateProps } from './Nameplate';
export { Dot } from './Dot';

// --- Vestíbulo (S1.7): pasaporte, puertas, cruce de umbral ---
export {
  PassportCard,
  type PassportCardProps,
  ExperienceThreshold,
  type ExperienceThresholdProps,
  ThresholdTransition,
  type ThresholdTransitionProps,
  AppSwitcher,
  type AppSwitcherProps,
  type AppSwitcherExperience,
} from './vestibule';
