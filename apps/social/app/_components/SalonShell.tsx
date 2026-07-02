'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import {
  AppShell,
  Avatar,
  Badge,
  Button,
  Menu,
  IconBookmark,
  IconComment,
  IconHome,
  IconUser,
  IconCompass,
  IconUsers,
  IconBell,
  IconPlus,
  IconDoor,
  IconGlobe,
  IconLogout,
  IconChevronDown,
  type ShellNavItem,
  type MenuItem,
} from '@osia/ui';
import { useOsiaSession } from '@osia/identity';
import { identity } from '../../lib/identity';
import { getConversations, getNotifications } from '../../lib/api';
import { queryKeys } from '../../lib/query-keys';
import { routes } from '../../lib/routes';
import { vestibuleBaseUrl, worldBaseUrl, vestibuleLoginUrl } from '../../lib/vestibule';
import { SearchPeople } from './SearchPeople';
import { ComposerModal } from './ComposerModal';
import { RailPresence } from './RailPresence';
import { RailRequests } from './RailRequests';
import { RailSuggestions } from './RailSuggestions';

/**
 * SalonShell (R2) — el marco del Salón de 3 columnas: navegación refinada + CTA «Publicar»
 * (composer modal global) a la izquierda, contenido al centro, y el rail VIVO a la derecha
 * (quién de tu red está en El Mundo, solicitudes, sugerencias). Header con buscador, campana
 * (badge por polling 30 s) y menú de perfil. Todo el cromo vive en @osia/ui (§2.1); aquí solo
 * se cablean datos. Sustituye a SocialShell (S3.7).
 */
export function SalonShell({ children }: { children: ReactNode }) {
  const t = useTranslations('social');
  const pathname = usePathname();
  const [composerOpen, setComposerOpen] = useState(false);
  const passport = useOsiaSession(identity).data?.passport ?? null;
  const profile = passport?.profile;
  const handle = profile?.handle ?? '';
  const myProfileHref = handle ? routes.perfil(handle) : routes.home;

  const notif = useQuery({
    queryKey: queryKeys.notifications,
    queryFn: getNotifications,
    refetchInterval: 30_000,
  });
  const unread = notif.data?.unreadCount ?? 0;
  // Badge de mensajes (R5): la bandeja es su propio aviso (fuera de la campana social).
  const dm = useQuery({
    queryKey: queryKeys.dmConversations,
    queryFn: () => getConversations(),
    refetchInterval: 60_000,
  });
  const dmUnread = dm.data?.unreadTotal ?? 0;

  const activeKey =
    pathname === routes.home
      ? 'home'
      : pathname.startsWith('/perfil')
        ? 'profile'
        : pathname.startsWith(routes.descubrir)
          ? 'discover'
          : pathname.startsWith(routes.amigos)
            ? 'friends'
            : pathname.startsWith(routes.guardados)
              ? 'bookmarks'
              : pathname.startsWith(routes.mensajes)
                ? 'messages'
              : pathname.startsWith(routes.notificaciones)
                ? 'notifications'
                : pathname.startsWith(routes.crear)
                  ? 'compose'
                  : '';

  const nav: ShellNavItem[] = [
    { key: 'home', href: routes.home, label: t('nav.home'), icon: <IconHome /> },
    { key: 'profile', href: myProfileHref, label: t('nav.profile'), icon: <IconUser /> },
    { key: 'discover', href: routes.descubrir, label: t('nav.discover'), icon: <IconCompass /> },
    { key: 'friends', href: routes.amigos, label: t('nav.friends'), icon: <IconUsers /> },
    { key: 'bookmarks', href: routes.guardados, label: t('nav.bookmarks'), icon: <IconBookmark /> },
    { key: 'messages', href: routes.mensajes, label: t('nav.messages'), icon: <IconComment />, badge: dmUnread },
    {
      key: 'notifications',
      href: routes.notificaciones,
      label: t('nav.notifications'),
      icon: <IconBell />,
      badge: unread,
    },
  ];
  const mobileNav: ShellNavItem[] = [
    { key: 'home', href: routes.home, label: t('nav.home'), icon: <IconHome /> },
    { key: 'messages', href: routes.mensajes, label: t('nav.messages'), icon: <IconComment />, badge: dmUnread },
    { key: 'compose', href: routes.crear, label: t('compose.open'), icon: <IconPlus /> },
    { key: 'notifications', href: routes.notificaciones, label: t('nav.notifications'), icon: <IconBell />, badge: unread },
    { key: 'profile', href: myProfileHref, label: t('nav.profile'), icon: <IconUser /> },
  ];

  async function logout(): Promise<void> {
    try {
      await identity.logout();
    } catch {
      // aun si el POST falla, mandamos al Vestíbulo: la sesión local se limpia igual.
    }
    window.location.href = vestibuleLoginUrl(vestibuleBaseUrl());
  }

  const menuItems: MenuItem[] = [
    { key: 'profile', label: t('menu.myProfile'), icon: <IconUser />, href: myProfileHref },
    { key: 'vestibule', label: t('menu.vestibule'), icon: <IconDoor />, href: vestibuleBaseUrl() },
    { key: 'world', label: t('menu.world'), icon: <IconGlobe />, href: worldBaseUrl() },
    { key: 'logout', label: t('menu.logout'), icon: <IconLogout />, onClick: logout, danger: true, separatorBefore: true },
  ];

  const headerActions = (
    <>
      <Link href={routes.notificaciones} className="osia-iconbtn" aria-label={t('nav.notifications')}>
        <IconBell />
        {unread > 0 && (
          <span className="osia-iconbtn__badge">
            <Badge count={unread} label={t('notif.unread', { count: unread })} />
          </span>
        )}
      </Link>
      <Menu label={t('menu.label')} items={menuItems}>
        <Avatar src={profile?.avatarUrl ?? undefined} name={profile?.displayName ?? 'OSIA'} size={30} />
        <span className="osia-menu__name">{profile?.displayName ?? ''}</span>
        <IconChevronDown />
      </Menu>
    </>
  );

  return (
    <>
      <AppShell
        brand={{ href: routes.home, label: 'OSIA', logoSrc: '/brand/osia-horizontal.svg' }}
        nav={nav}
        mobileNav={mobileNav}
        activeKey={activeKey}
        searchSlot={<SearchPeople />}
        headerActions={headerActions}
        sidebarFooter={
          <Button variant="primary" onClick={() => setComposerOpen(true)}>
            {t('compose.open')}
          </Button>
        }
        rail={
          <>
            <RailPresence />
            <RailRequests />
            <RailSuggestions />
          </>
        }
        LinkComponent={Link}
      >
        {children}
      </AppShell>
      <ComposerModal open={composerOpen} onClose={() => setComposerOpen(false)} />
    </>
  );
}
