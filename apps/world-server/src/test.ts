/**
 * Punto de entrada de los tests unitarios del world-server. node:test recoge todos
 * los tests registrados por estos imports y los corre al salir. (`tsx src/test.ts`)
 * El flujo end-to-end vivo está en verify-client.ts (requiere el server escuchando).
 */
import './rateLimit.test';
import './instance.test';
import './weather.test';
import './metrics.test';
import './http.test';
