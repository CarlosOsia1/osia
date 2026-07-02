'use client';

import {
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Avatar, Field, Text, Textarea } from '@osia/ui';
import type { ProfileSummaryDto } from '@osia/shared';
import { searchProfiles } from '../../lib/api';
import { queryKeys } from '../../lib/query-keys';

/** Token de mención activo: desde el cursor hacia atrás hasta un `@` precedido de inicio/espacio. */
function activeMention(value: string, caret: number): { start: number; query: string } | null {
  const upToCaret = value.slice(0, caret);
  const at = upToCaret.lastIndexOf('@');
  if (at === -1) return null;
  if (at > 0 && !/\s/.test(upToCaret[at - 1] ?? '')) return null;
  const query = upToCaret.slice(at + 1);
  if (!/^[a-zA-Z0-9_]{1,20}$/.test(query)) return null;
  return { start: at, query };
}

/**
 * MentionTextarea (R3) — campo de texto con autocompletado de menciones `@handle` (combobox
 * ligero WAI-ARIA: `aria-autocomplete` + listbox + `aria-activedescendant`; flechas navegan,
 * Enter/Tab insertan, Esc cierra). Busca personas con el endpoint existente (debounce 250 ms).
 * `multiline` decide la piel (Textarea del composer / Field del comentario); la lógica es una.
 */
export function MentionTextarea({
  value,
  onChange,
  multiline = false,
  placeholder,
  ariaLabel,
  maxLength,
  rows,
  invalid,
  autoFocus,
  onSubmit,
}: {
  value: string;
  onChange: (next: string) => void;
  multiline?: boolean;
  placeholder?: string;
  ariaLabel: string;
  maxLength?: number;
  rows?: number;
  invalid?: boolean;
  autoFocus?: boolean;
  /** Enter sin Shift con el panel CERRADO (solo single-line): enviar. */
  onSubmit?: () => void;
}) {
  const t = useTranslations('social');
  const listId = useId();
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const [mention, setMention] = useState<{ start: number; query: string } | null>(null);
  const [debounced, setDebounced] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (!mention) return;
    const id = setTimeout(() => setDebounced(mention.query), 250);
    return () => clearTimeout(id);
  }, [mention]);

  const search = useQuery({
    queryKey: queryKeys.search(`mention:${debounced}`),
    queryFn: () => searchProfiles(debounced),
    enabled: mention !== null && debounced.length > 0,
    staleTime: 30_000,
  });
  const options: ProfileSummaryDto[] = mention && debounced ? (search.data ?? []).slice(0, 6) : [];
  const open = mention !== null && options.length > 0;

  function refreshMention(el: HTMLInputElement | HTMLTextAreaElement): void {
    const caret = el.selectionStart ?? el.value.length;
    const next = activeMention(el.value, caret);
    setMention(next);
    if (!next) setActiveIndex(0);
  }

  function handleChange(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void {
    onChange(e.target.value);
    refreshMention(e.target);
  }

  function insert(handle: string): void {
    if (!mention) return;
    const el = inputRef.current;
    const caret = el?.selectionStart ?? value.length;
    const next = `${value.slice(0, mention.start)}@${handle} ${value.slice(caret)}`;
    onChange(next);
    setMention(null);
    setActiveIndex(0);
    // Devuelve el foco y coloca el cursor tras la mención insertada.
    requestAnimationFrame(() => {
      const pos = mention.start + handle.length + 2;
      el?.focus();
      el?.setSelectionRange(pos, pos);
    });
  }

  function handleKeyDown(e: ReactKeyboardEvent<HTMLInputElement | HTMLTextAreaElement>): void {
    if (open) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((i) => (i + 1) % options.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((i) => (i - 1 + options.length) % options.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        const chosen = options[activeIndex];
        if (chosen) {
          e.preventDefault();
          insert(chosen.handle);
          return;
        }
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setMention(null);
        return;
      }
    }
    if (!multiline && e.key === 'Enter' && !e.shiftKey && onSubmit) {
      e.preventDefault();
      onSubmit();
    }
  }

  const shared = {
    value,
    placeholder,
    maxLength,
    autoFocus,
    invalid,
    'aria-label': ariaLabel,
    'aria-autocomplete': 'list' as const,
    'aria-expanded': open,
    'aria-controls': open ? listId : undefined,
    'aria-activedescendant': open ? `${listId}-${activeIndex}` : undefined,
    role: 'combobox' as const,
    onChange: handleChange,
    onKeyDown: handleKeyDown,
    onClick: (e: ReactMouseEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      refreshMention(e.currentTarget),
  };

  return (
    <span className="osia-mentionbox">
      {multiline ? (
        <Textarea
          textareaRef={(el) => {
            inputRef.current = el;
          }}
          rows={rows}
          {...shared}
        />
      ) : (
        <Field
          inputRef={(el) => {
            inputRef.current = el;
          }}
          {...shared}
        />
      )}
      {open && (
        <span id={listId} role="listbox" aria-label={t('mention.label')} className="osia-mentionbox__panel">
          {options.map((u, i) => (
            <button
              key={u.accountId}
              id={`${listId}-${i}`}
              type="button"
              role="option"
              aria-selected={i === activeIndex}
              data-active={i === activeIndex || undefined}
              className="osia-mentionbox__option"
              // mousedown antes que blur: la selección con click no pierde el token.
              onMouseDown={(e) => {
                e.preventDefault();
                insert(u.handle);
              }}
              onMouseEnter={() => setActiveIndex(i)}
            >
              <Avatar src={u.avatarUrl} name={u.displayName} size={26} />
              <span className="osia-mentionbox__names">
                <Text variant="meta" as="span">
                  {u.displayName}
                </Text>
                <Text variant="caption" tone="subtle" as="span">
                  {`@${u.handle}`}
                </Text>
              </span>
            </button>
          ))}
        </span>
      )}
    </span>
  );
}
