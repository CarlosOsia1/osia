import { ProfileView } from '../../_components/ProfileView';

/**
 * "/profile/{handle}" (S3.7) — perfil público de un residente. La sesión y el shell los provee
 * `AppFrame`; aquí solo el contenido del perfil. Se enriquece (foto/portada/privacidad) en S3.8.
 */
export default async function ProfilePage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  return <ProfileView handle={handle} />;
}
