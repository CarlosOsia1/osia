'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Button, Modal, Text, Textarea, useToast } from '@osia/ui';
import type { ReportTargetType } from '@osia/shared';
import { createReport } from '../../lib/api';

const REASON_MAX = 500;

/**
 * ReportDialog (R3) — reportar un post o comentario para moderación (manual, S3.6-H2): motivo
 * libre (≤500) + confirmación con toast. La resolución ocurre fuera de banda; aquí solo se
 * levanta la mano con discreción.
 */
export function ReportDialog({
  targetType,
  targetId,
  onClose,
}: {
  targetType: ReportTargetType;
  targetId: string;
  onClose: () => void;
}) {
  const t = useTranslations('social');
  const toast = useToast();
  const [reason, setReason] = useState('');

  const send = useMutation({
    mutationFn: () => createReport({ targetType, targetId, reason: reason.trim() }),
    onSuccess: () => {
      toast.success(t('report.sent'));
      onClose();
    },
    onError: () => toast.error(t('report.error')),
  });

  const canSend = reason.trim().length > 0 && reason.length <= REASON_MAX && !send.isPending;

  return (
    <Modal open onClose={onClose} title={t('report.title')}>
      <div className="osia-composer">
        <Text variant="read" tone="muted">
          {t('report.body')}
        </Text>
        <div className="osia-composer__field">
          <Textarea
            aria-label={t('report.reasonLabel')}
            placeholder={t('report.reasonPlaceholder')}
            rows={3}
            maxLength={REASON_MAX}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            autoFocus
          />
          <Text variant="label" tone="subtle">
            {t('compose.charCount', { count: reason.length, max: REASON_MAX })}
          </Text>
        </div>
        <div className="osia-composer__row">
          <Button variant="primary" disabled={!canSend} loading={send.isPending} onClick={() => send.mutate()}>
            {t('report.send')}
          </Button>
          <Button variant="ghost" onClick={onClose}>
            {t('edit.cancel')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
