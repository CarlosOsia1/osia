import { Skeleton } from '@osia/ui';

/**
 * Loading de ruta (R1): mientras una página navega/carga, el centro respira con skeletons
 * (shimmer índigo→champán) en vez de quedarse en blanco. Cada pantalla afina el suyo; este
 * es el respaldo genérico de ruta.
 */
export default function RouteLoading() {
  return (
    <div className="osia-route-loading">
      <Skeleton variant="block" width="100%" height="6rem" />
      <Skeleton variant="block" width="100%" height="14rem" />
      <Skeleton variant="block" width="100%" height="14rem" />
    </div>
  );
}
