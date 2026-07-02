'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import {
  Avatar,
  Badge,
  Button,
  EmptyState,
  ErrorState,
  Field,
  Skeleton,
  Text,
  IconComment,
  useToast,
} from '@osia/ui';
import { DM_BODY_MAX, type ConversationDto, type MessageDto, type Page } from '@osia/shared';
import { getConversations, getMessages, markConversationRead, sendDmMessage } from '../../lib/api';
import { queryKeys } from '../../lib/query-keys';
import { relativeTime } from '../../lib/time';
import { useLocale } from 'next-intl';

/**
 * Mensajes (R5) — master-detail: bandeja a la izquierda (polling 30 s) + hilo a la derecha
 * (polling 7 s con la conversación abierta; en móvil se apilan). Enviar es inmediato con estado
 * «enviando»; abrir un hilo lo marca leído (el badge del nav baja). `?con=<id>` deep-linkea.
 */
export function MessagesView() {
  const t = useTranslations('social');
  const searchParams = useSearchParams();
  const [selectedId, setSelectedId] = useState<string | null>(searchParams.get('con'));

  const inbox = useQuery({
    queryKey: queryKeys.dmConversations,
    queryFn: () => getConversations(),
    refetchInterval: 30_000,
  });

  const conversations = inbox.data?.data ?? [];
  const selected = conversations.find((c) => c.id === selectedId) ?? null;

  if (inbox.isPending) {
    return (
      <div className="osia-dm" aria-hidden="true">
        <Skeleton variant="block" width="100%" height="20rem" />
      </div>
    );
  }
  if (inbox.isError) {
    return (
      <ErrorState
        title={t('errors.loadTitle')}
        description={t('errors.loadBody')}
        action={
          <Button variant="secondary" onClick={() => void inbox.refetch()}>
            {t('retry')}
          </Button>
        }
      />
    );
  }
  if (conversations.length === 0) {
    return (
      <EmptyState
        icon={<IconComment width={40} height={40} />}
        title={t('dm.emptyTitle')}
        description={t('dm.emptyBody')}
      />
    );
  }

  return (
    <div className="osia-dm" data-open={selected ? true : undefined}>
      <aside className="osia-dm__inbox" aria-label={t('dm.title')}>
        {conversations.map((c) => (
          <button
            key={c.id}
            type="button"
            className="osia-dm__row"
            data-active={c.id === selectedId || undefined}
            onClick={() => setSelectedId(c.id)}
          >
            <Avatar src={c.other.avatarUrl} name={c.other.displayName} size={40} />
            <span className="osia-dm__rowmeta">
              <Text variant="meta" as="span">
                {c.other.displayName}
              </Text>
              <Text variant="caption" tone="subtle" as="span" className="osia-dm__preview">
                {c.lastMessagePreview ?? t('dm.noMessages')}
              </Text>
            </span>
            {c.unreadCount > 0 && <Badge count={c.unreadCount} label={t('notif.unread', { count: c.unreadCount })} />}
          </button>
        ))}
      </aside>

      {selected ? (
        <Thread key={selected.id} conversation={selected} onBack={() => setSelectedId(null)} />
      ) : (
        <div className="osia-dm__idle">
          <Text variant="read" tone="muted">
            {t('dm.pick')}
          </Text>
        </div>
      )}
    </div>
  );
}

function Thread({ conversation, onBack }: { conversation: ConversationDto; onBack: () => void }) {
  const t = useTranslations('social');
  const locale = useLocale();
  const toast = useToast();
  const qc = useQueryClient();
  const [text, setText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const thread = useInfiniteQuery({
    queryKey: queryKeys.dmThread(conversation.id),
    queryFn: ({ pageParam }) => getMessages(conversation.id, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last: Page<MessageDto>) => last.page.nextCursor ?? undefined,
    refetchInterval: 7_000,
  });

  // Abrir el hilo lo deja leído (y baja el badge). Repetirlo al llegar mensajes nuevos.
  const unread = conversation.unreadCount;
  useEffect(() => {
    if (unread === 0) return;
    void markConversationRead(conversation.id).then(() => {
      void qc.invalidateQueries({ queryKey: queryKeys.dmConversations });
    });
  }, [conversation.id, unread, qc]);

  const send = useMutation({
    mutationFn: () => sendDmMessage(conversation.id, text.trim()),
    onSuccess: () => {
      setText('');
      void qc.invalidateQueries({ queryKey: queryKeys.dmThread(conversation.id) });
      void qc.invalidateQueries({ queryKey: queryKeys.dmConversations });
      // El hilo pinta abajo lo nuevo: baja al fondo al confirmar.
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
      });
    },
    onError: () => toast.error(t('dm.sendError')),
  });
  const canSend = text.trim().length > 0 && !send.isPending;

  // Server: recientes primero → el hilo se pinta invertido (viejos arriba, nuevos abajo).
  const messages = [...(thread.data?.pages.flatMap((p) => p.data) ?? [])].reverse();

  return (
    <section className="osia-dm__thread" aria-label={conversation.other.displayName}>
      <header className="osia-dm__head">
        <Button variant="ghost" size="sm" className="osia-dm__back" onClick={onBack}>
          {`← ${t('dm.back')}`}
        </Button>
        <Avatar src={conversation.other.avatarUrl} name={conversation.other.displayName} size={32} />
        <Text variant="subheading" as="span">
          {conversation.other.displayName}
        </Text>
      </header>

      <div ref={scrollRef} className="osia-dm__scroll">
        {thread.hasNextPage && (
          <Button
            variant="ghost"
            size="sm"
            loading={thread.isFetchingNextPage}
            onClick={() => void thread.fetchNextPage()}
          >
            {t('dm.older')}
          </Button>
        )}
        {messages.map((m) => {
          const mine = m.senderAccountId !== conversation.other.accountId;
          return (
            <div key={m.id} className="osia-dm__msg" data-mine={mine || undefined}>
              {m.body === null ? (
                <Text variant="caption" tone="subtle" as="span">
                  {t('dm.retracted')}
                </Text>
              ) : (
                <Text variant="read" as="span">
                  {m.body}
                </Text>
              )}
              <Text variant="caption" tone="subtle" as="span" className="osia-dm__time">
                {relativeTime(m.createdAt, locale)}
              </Text>
            </div>
          );
        })}
      </div>

      <div className="osia-dm__composer">
        <Field
          value={text}
          maxLength={DM_BODY_MAX}
          placeholder={t('dm.placeholder')}
          aria-label={t('dm.placeholder')}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && canSend) {
              e.preventDefault();
              send.mutate();
            }
          }}
        />
        <Button variant="primary" size="sm" disabled={!canSend} loading={send.isPending} onClick={() => send.mutate()}>
          {t('dm.send')}
        </Button>
      </div>
    </section>
  );
}
