import { Notifications } from '../_components/Notifications';

/**
 * "/notificaciones" (S3.7) — página de notificaciones (antes vivía embebida en el home). El shell y la
 * sesión los provee `AppFrame`. El deep-link + scroll infinito llegan en S3.11.
 */
export default function NotificationsPage() {
  return <Notifications />;
}
