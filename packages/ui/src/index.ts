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
export { Text, type TextProps, type TextVariant, type TextTone } from './Text';
export { Card, type CardProps } from './Card';
export { Modal, type ModalProps } from './Modal';
export { Panel, type PanelProps } from './Panel';
export { HudPanel, type HudPanelProps } from './HudPanel';
export { Field, type FieldProps } from './Field';
export { Textarea, type TextareaProps } from './Textarea';
export { PasswordField, type PasswordFieldProps } from './PasswordField';
export { CodeInput, type CodeInputProps } from './CodeInput';
export { FormError } from './FormError';
export { Switch, type SwitchProps } from './Switch';
export { Nameplate, type NameplateProps } from './Nameplate';
export { Dot } from './Dot';
export { PopularityMeter, type PopularityMeterProps } from './PopularityMeter';

// --- Fase 3.5 · La Red Social: primitivos + shell de lujo ---
export { Avatar, type AvatarProps, type AvatarPresence } from './Avatar';
export { Badge, type BadgeProps } from './Badge';
export { IconButton, type IconButtonProps } from './IconButton';
export { SearchInput, type SearchInputProps } from './SearchInput';
export { Skeleton, type SkeletonProps } from './Skeleton';
export { Tabs, type TabsProps, type TabItem } from './Tabs';
export { Divider } from './Divider';
export { EmptyState, type EmptyStateProps } from './EmptyState';
export { Menu, type MenuProps, type MenuItem } from './Menu';
export { AppShell, type AppShellProps, type ShellNavItem } from './AppShell';
export * from './icons';

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
