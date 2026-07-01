import { SocialHome } from './_components/SocialHome';

/**
 * "/" (S3.7) — inicio de La Red Social: composer + feed. La sesión SSO y el shell de lujo los provee
 * `AppFrame` en el layout raíz (una sola vez para todas las rutas), así que aquí solo va el contenido.
 */
export default function HomePage() {
  return <SocialHome />;
}
