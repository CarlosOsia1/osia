/** Divider — hairline de oro al 14% (el divisor de lujo, no un gris). */
export function Divider({ className }: { className?: string }) {
  return <hr className={['osia-divider', className].filter(Boolean).join(' ')} />;
}
