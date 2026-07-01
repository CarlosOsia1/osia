import { PostComposer } from '../_components/PostComposer';

/**
 * "/compose" (S3.7) — publicar un Post. La sesión SSO y el shell los provee `AppFrame` en el layout;
 * aquí solo el composer. (En S3.10 pasa a modal sobre el feed en desktop.)
 */
export default function ComposePage() {
  return <PostComposer />;
}
