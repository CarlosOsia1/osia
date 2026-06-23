import pino from 'pino';

/** Logger Pino (JSON). pino-pretty se añadiría en dev, pero su worker no juega
 *  bien con tsx; preferimos JSON estable. */
export const log = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  // §8: secretos NUNCA en logs. Red de seguridad: si por error se loggea un campo con
  // ticket/resumeToken/payload/credenciales, se censura en vez de escribirlo en claro.
  redact: {
    paths: [
      'ticket',
      'resumeToken',
      'token',
      'payload',
      'authorization',
      '*.ticket',
      '*.resumeToken',
      '*.token',
      'req.headers.authorization',
      'req.headers.cookie',
    ],
    censor: '[redacted]',
  },
});
