'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { getNetClient, useNetState } from '../net/useNet';
import { setChatTyping, setChatNotice } from '../net/store';

/**
 * ChatPanel (S0.6-H1) — chat de texto in-world estilo "Minecraft".
 * - CERRADO: los últimos mensajes aparecen abajo-izquierda y se desvanecen solos.
 * - ENTER: abre el input y el HISTORIAL completo con scroll; Enter envía, Esc cierra.
 * Mientras el input está abierto se bloquea el movimiento. Texto plano (React escapa).
 */

const FADE_MS = 9000; // tiempo que un mensaje queda visible con el chat cerrado
const FADE_OUT = 1200; // duración del fundido final
const RECENT_MAX = 8; // máximo de líneas visibles con el chat cerrado

export default function ChatPanel() {
  const { chatLog, chatNotice, status } = useNetState();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');
  const [, force] = useState(0); // re-render periódico para el fundido
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Enter abre el chat (si está conectado y no se escribe ya en un campo).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' || open || status !== 'connected') return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      e.preventDefault();
      setOpen(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, status]);

  // Bloquear el movimiento mientras el input está abierto.
  useEffect(() => {
    setChatTyping(open);
    if (open) inputRef.current?.focus();
    return () => setChatTyping(false);
  }, [open]);

  // Mientras está cerrado, re-render cada 500 ms para progresar el fundido y soltar viejos.
  useEffect(() => {
    if (open) return;
    const t = setInterval(() => force((n) => n + 1), 500);
    return () => clearInterval(t);
  }, [open]);

  // Auto-scroll al fondo al abrir o al llegar un mensaje con el chat abierto.
  useLayoutEffect(() => {
    if (open && scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [open, chatLog.length]);

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
    e.stopPropagation();
    if (e.key === 'Enter') {
      e.preventDefault();
      submit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setValue('');
      setOpen(false);
    }
  };

  if (status !== 'connected' && chatLog.length === 0) return null;

  const now = Date.now();
  const visible = open ? chatLog : chatLog.filter((l) => now - l.at < FADE_MS).slice(-RECENT_MAX);

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 58,
        left: 28,
        width: 380,
        maxWidth: '62vw',
        pointerEvents: 'none',
        zIndex: 20,
      }}
      aria-label="chat del mundo"
    >
      <div
        ref={scrollRef}
        role="log"
        aria-live="polite"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 3,
          marginBottom: 6,
          maxHeight: open ? 300 : undefined,
          overflowY: open ? 'auto' : 'visible',
          pointerEvents: open ? 'auto' : 'none',
          padding: open ? '8px 10px' : 0,
          borderRadius: 10,
          background: open ? 'rgba(12,11,9,0.72)' : 'transparent',
          backdropFilter: open ? 'blur(6px)' : 'none',
        }}
      >
        {visible.map((l) => {
          const age = now - l.at;
          const opacity = open ? 1 : age > FADE_MS - FADE_OUT ? Math.max(0, (FADE_MS - age) / FADE_OUT) : 1;
          return (
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
                opacity,
                transition: 'opacity .3s linear',
              }}
            >
              <span style={{ color: '#cbb89a', fontWeight: 600, marginRight: 6 }}>{l.handle}</span>
              {l.text}
            </div>
          );
        })}
      </div>

      {chatNotice && (
        <div
          style={{
            alignSelf: 'flex-start',
            padding: '3px 9px',
            marginBottom: 6,
            borderRadius: 8,
            background: 'rgba(120,40,40,0.4)',
            color: '#f0cdc0',
            font: '400 11px/1.3 Jost, system-ui, sans-serif',
          }}
        >
          {chatNotice}
        </div>
      )}

      {open && (
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onInputKey}
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
      )}
    </div>
  );
}
