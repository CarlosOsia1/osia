import type { Metadata } from 'next';
import { ProfileView } from '../../_components/ProfileView';

/**
 * "/perfil/{handle}" (R2) — perfil público de un residente. La sesión y el shell los provee
 * `AppFrame`; aquí solo el contenido. Metadata de MARCA: el título usa el handle de la URL
 * (identificador, no copy); el contenido del perfil exige sesión y no se filtra a crawlers.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string }>;
}): Promise<Metadata> {
  const { handle } = await params;
  return { title: `@${decodeURIComponent(handle)}` };
}

export default async function PerfilPage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  return <ProfileView handle={handle} />;
}
