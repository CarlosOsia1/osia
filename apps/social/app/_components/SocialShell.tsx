'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import {
  AppShell,
  Avatar,
  Badge,
  Menu,
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
import { getNotifications } from '../../lib/social-api';
import { vestibuleBaseUrl, worldBaseUrl, vestibuleLoginUrl } from '../../lib/vestibule';
import { SearchPeople } from './SearchPeople';

const NOTIF_KEY = ['social', 'notifications'] as const;

/**
 * SocialShell (S3.7) — compone el marco de lujo `AppShell` de @osia/ui con los datos de sesión de La Red
 * Social: navegación, campana con badge de no-leídas (polling 30 s) y menú de perfil (Mi perfil ·
 * Vestíbulo · Viajar al mundo · Cerrar sesión). La navegación usa `next/link` (href real). Todo el
 * cromo y los estilos viven en @osia/ui (§2.1); aquí solo se cablean datos.
 */
export function SocialShell({ children }: { children: ReactNode }) {
  const t = useTranslations('social');
  const pathname = usePathname();
  const passport = useOsiaSession(identity).data?.passport ?? null;
  const profile = passport?.profile;
  const handle = profile?.handle ?? '';
  const myProfileHref = handle ? `/profile/${handle}` : '/';

  const notif = useQuery({ queryKey: NOTIF_KEY, queryFn: getNotifications, refetchInterval: 30_000 });
  const unread = notif.data?.unreadCount ?? 0;

  const activeKey = pathname === '/'
    ? 'home'
    : pathname.startsWith('/profile')
      ? 'profile'
      : pathname.startsWith('/descubrir')
        ? 'discover'
        : pathname.startsWith('/amigos')
          ? 'friends'
          : pathname.startsWith('/notificaciones')
            ? 'notifications'
            : '';

  const nav: ShellNavItem[] = [
    { key: 'home', href: '/', label: t('nav.home'), icon: <IconHome /> },
    { key: 'profile', href: myProfileHref, label: t('nav.profile'), icon: <IconUser /> },
    { key: 'discover', href: '/descubrir', label: t('nav.discover'), icon: <IconCompass /> },
    { key: 'friends', href: '/amigos', label: t('nav.friends'), icon: <IconUsers /> },
  ];
  const mobileNav: ShellNavItem[] = [
    { key: 'home', href: '/', label: t('nav.home'), icon: <IconHome /> },
    { key: 'discover', href: '/descubrir', label: t('nav.discover'), icon: <IconCompass /> },
    { key: 'compose', href: '/compose', label: t('compose.open'), icon: <IconPlus /> },
    { key: 'notifications', href: '/notificaciones', label: t('nav.notifications'), icon: <IconBell />, badge: unread },
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
      <Link href="/notificaciones" className="osia-iconbtn" aria-label={t('nav.notifications')}>
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
    <AppShell
      brand={{ href: '/', label: 'OSIA', logoSrc: '/brand/osia-horizontal.svg' }}
      nav={nav}
      mobileNav={mobileNav}
      activeKey={activeKey}
      searchSlot={<SearchPeople />}
      headerActions={headerActions}
      LinkComponent={Link}
    >
      {children}
    </AppShell>
  );
}
