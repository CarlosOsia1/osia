'use client';

import { Modal } from './Modal';
import { Button } from './Button';
import { Text } from './Text';

/**
 * ConfirmDialog — modal de confirmación reutilizable para acciones irreversibles (borrar post/comentario,
 * rechazar). Compone Modal + Button; el botón principal es `danger` cuando la acción destruye. Tonto.
 */
export type ConfirmDialogProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  danger?: boolean;
  loading?: boolean;
};

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel,
  cancelLabel,
  danger = false,
  loading = false,
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div style={{ display: 'grid', gap: 'var(--space-5)' }}>
        <Text variant="read" tone="muted">
          {message}
        </Text>
        <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
          <Button variant="ghost" onClick={onClose}>
            {cancelLabel}
          </Button>
          <Button variant={danger ? 'danger' : 'primary'} loading={loading} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
