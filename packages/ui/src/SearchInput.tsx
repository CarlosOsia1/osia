import type { InputHTMLAttributes } from 'react';
import { IconSearch } from './icons';

/**
 * SearchInput — campo de búsqueda con icono (buscar personas). Controlado: recibe `value`/`onValueChange`.
 * Tonto; el debounce y el fetch viven en la app.
 */
export type SearchInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'onChange' | 'value' | 'type'
> & {
  value: string;
  onValueChange: (value: string) => void;
  /** Nombre accesible del campo. */
  label: string;
};

export function SearchInput({ value, onValueChange, label, className, placeholder, ...rest }: SearchInputProps) {
  return (
    <div className={['osia-search', className].filter(Boolean).join(' ')}>
      <IconSearch className="osia-search__icon" />
      <input
        className="osia-search__input"
        type="search"
        role="searchbox"
        aria-label={label}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        {...rest}
      />
    </div>
  );
}
