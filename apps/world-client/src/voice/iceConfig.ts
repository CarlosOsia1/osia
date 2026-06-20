/**
 * Servidores ICE para WebRTC. STUN público gratis ahora; el slot TURN queda listo
 * (lee de env) para coturn self-host en S0.8 sin rebuildear el bundle.
 *
 * Sin TURN, ~15-20% de pares (NAT simétrico/CGNAT) no conectan ni para audio —
 * aceptable en F0 (amigos en redes conocidas), obligatorio antes del lanzamiento.
 * Las credenciales reales serán EFÍMERAS (HMAC, vía route handler) en S0.8; lo de
 * env es solo un placeholder para QA, nunca creds estáticas en producción.
 */
export function getIceServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [
    { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
  ];
  const url = process.env.NEXT_PUBLIC_TURN_URL;
  const username = process.env.NEXT_PUBLIC_TURN_USER;
  const credential = process.env.NEXT_PUBLIC_TURN_CRED;
  if (url && username && credential) servers.push({ urls: url, username, credential });
  return servers;
}
