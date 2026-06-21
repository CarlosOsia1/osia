/**
 * Métricas por tick del world-server (S0.4-H4 / S0.5-H4): duración del tick,
 * jugadores y bytes de salida — para verificar el presupuesto ≤1.5 KB/jugador/tick.
 * Expuestas en /health y logueadas periódicamente.
 */

export class TickMetrics {
  private durationEwmaMs = 0;
  private players = 0;
  private bytesOut = 0;
  private bytesPerPlayer = 0;
  private ticks = 0;

  record(durationMs: number, players: number, bytesOut: number): void {
    this.durationEwmaMs =
      this.ticks === 0 ? durationMs : this.durationEwmaMs * 0.9 + durationMs * 0.1;
    this.players = players;
    this.bytesOut = bytesOut;
    this.bytesPerPlayer = players > 0 ? Math.round(bytesOut / players) : 0;
    this.ticks += 1;
  }

  snapshot(): {
    tickDurationMs: number;
    playersInTick: number;
    bytesOutPerTick: number;
    bytesPerPlayer: number;
    ticks: number;
  } {
    return {
      tickDurationMs: Math.round(this.durationEwmaMs * 100) / 100,
      playersInTick: this.players,
      bytesOutPerTick: this.bytesOut,
      bytesPerPlayer: this.bytesPerPlayer,
      ticks: this.ticks,
    };
  }
}
