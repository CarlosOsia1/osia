'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { SearchInput, Text, UserRow } from '@osia/ui';
import { searchProfiles } from '../../lib/social-api';

/**
 * SearchPeople (S3.11) — buscador de personas del header: input con debounce (250 ms) + panel de
 * resultados enlazados al perfil. Cierra al elegir o al perder foco. Compone @osia/ui + i18n.
 */
export function SearchPeople() {
  const t = useTranslations('social');
  const [q, setQ] = useState('');
  const [debounced, setDebounced] = useState('');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(q.trim()), 250);
    return () => clearTimeout(id);
  }, [q]);

  const query = useQuery({
    queryKey: ['social', 'search', debounced],
    queryFn: () => searchProfiles(debounced),
    enabled: debounced.length > 0,
  });
  const results = query.data ?? [];

  return (
    <div className="osia-searchbox">
      <SearchInput
        value={q}
        onValueChange={(v) => {
          setQ(v);
          setOpen(true);
        }}
        label={t('search.label')}
        placeholder={t('search.placeholder')}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && debounced.length > 0 && (
        <div className="osia-searchbox__panel">
          {query.isPending ? (
            <Text variant="meta" tone="muted">
              {t('search.searching')}
            </Text>
          ) : results.length === 0 ? (
            <Text variant="meta" tone="muted">
              {t('search.empty')}
            </Text>
          ) : (
            results.map((u) => (
              <Link
                key={u.profileId}
                href={`/profile/${u.handle}`}
                style={{ textDecoration: 'none' }}
                onClick={() => setOpen(false)}
              >
                <UserRow name={u.displayName} handle={u.handle} avatarUrl={u.avatarUrl} />
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}
