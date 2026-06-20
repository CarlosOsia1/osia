'use client';

import { useEffect, useRef, useState } from 'react';
import { getNetClient, useNetState } from '../net/useNet';
import { setChatTyping, setChatNotice } from '../net/store';

/**
 * ChatPanel (S0.6-H1) — chat de texto in-world. Overlay HTML (fuera del Canvas).
 * Enter abre el input, Enter envía, Esc cierra y devuelve el control al mundo.
 * Mientras el input está abierto, el movimiento se bloquea (setChatTyping). El texto
 * se renderiza como children JSX (React escapa) — nunca dangerouslySetInnerHTML.
 */
export default function ChatPanel() {
  const { chatLog, chatNotice, status } = useNetState();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Enter abre el chat (si no se está escribiendo ya en un campo).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' || open) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      e.preventDefault();
      setOpen(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  // Bloquear el movimiento del avatar mientras el input está abierto.
  useEffect(() => {
    setChatTyping(open);
    if (open) inputRef.current?.focus();
    return () => setChatTyping(false);
  }, [open]);

  // Auto-limpiar el aviso transitorio (rate-limit).
  useEffect(() => {
    if (!chatNotice) return;
    const t = setTimeout(() => setChatNotice(null), 2600);
    return () => clearTimeout(t);
  }, [chatNotice]);

  const submit = () => {
    const v = value.trim();
    if (v) getNetClient().sendChat(v);
    setValue('');
    setOpen(false);
  };

  const onInputKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    e.stopPropagation(); // que las teclas no lleguen a los controles del mundo
    if (e.key === 'Enter') {
      e.preventDefault();
      submit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setValue('');
      setOpen(false);
    }
  };

  const recent = chatLog.slice(-6);

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 58,
        left: 28,
        width: 340,
        maxWidth: '60vw',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        pointerEvents: 'none',
        zIndex: 20,
      }}
      aria-label="chat del mundo"
    >
      <style>{`@keyframes osia-bubble-in{from{opacity:0;transform:translateY(2px) scale(.96)}to{opacity:1;transform:translateY(-6px) scale(1)}}`}</style>

      {/* Log de mensajes recientes */}
      <div role="log" aria-live="polite" style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {recent.map((l) => (
          <div
            key={l.key}
            style={{
              alignSelf: 'flex-start',
              maxWidth: '100%',
              padding: '4px 10px',
              borderRadius: 9,
              background: 'rgba(20,18,15,0.55)',
              color: '#e6dcc8',
              font: '400 13px/1.4 Jost, system-ui, sans-serif',
              backdropFilter: 'blur(4px)',
              wordBreak: 'break-word',
            }}
          >
            <span style={{ color: '#cbb89a', fontWeight: 600, marginRight: 6 }}>{l.handle}</span>
            {l.text}
          </div>
        ))}
      </div>

      {/* Aviso transitorio (rate-limit) */}
      {chatNotice && (
        <div
          style={{
            alignSelf: 'flex-start',
            padding: '3px 9px',
            borderRadius: 8,
            background: 'rgba(120,40,40,0.4)',
            color: '#f0cdc0',
            font: '400 11px/1.3 Jost, system-ui, sans-serif',
            letterSpacing: '0.02em',
          }}
        >
          {chatNotice}
        </div>
      )}

      {/* Input o afford­ance para abrirlo */}
      {open ? (
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onInputKey}
          onBlur={() => setOpen(false)}
          maxLength={240}
          placeholder="escribí y Enter — Esc para cerrar"
          aria-label="mensaje de chat"
          style={{
            pointerEvents: 'auto',
            width: '100%',
            boxSizing: 'border-box',
            padding: '8px 12px',
            borderRadius: 10,
            border: '1px solid rgba(203,184,154,0.4)',
            background: 'rgba(12,11,9,0.86)',
            color: '#f0e7d6',
            font: '400 14px/1.3 Jost, system-ui, sans-serif',
            outline: 'none',
          }}
        />
      ) : (
        status === 'connected' && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            style={{
              pointerEvents: 'auto',
              alignSelf: 'flex-start',
              padding: '4px 10px',
              borderRadius: 8,
              border: '1px solid rgba(203,184,154,0.22)',
              background: 'rgba(20,18,15,0.45)',
              color: '#8c7b66',
              font: '500 11px/1 Jost, system-ui, sans-serif',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              cursor: 'pointer',
            }}
          >
            ↵ hablar
          </button>
        )
      )}
    </div>
  );
}
