import pino from 'pino';

/** Logger Pino (JSON). pino-pretty se añadiría en dev, pero su worker no juega
 *  bien con tsx; preferimos JSON estable. */
export const log = pino({ level: process.env.LOG_LEVEL ?? 'info' });
