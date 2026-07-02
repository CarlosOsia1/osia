/**
 * Claves de TanStack Query de La Red Social (R1): UNA fuente de verdad para poder parchear e
 * invalidar caches sin literales dispersos. Todas cuelgan del prefijo `['social']` — el
 * parcheo optimista (`lib/mutations/patch.ts`) recorre ese prefijo completo.
 */
export const queryKeys = {
  all: ['social'] as const,
  feed: ['social', 'feed'] as const,
  post: (postId: string) => ['social', 'post', postId] as const,
  comments: (postId: string) => ['social', 'comments', postId] as const,
  reactions: (postId: string) => ['social', 'reactions', postId] as const,
  profile: (handle: string) => ['social', 'profile', handle] as const,
  profilePosts: (handle: string) => ['social', 'profile', handle, 'posts'] as const,
  presence: (accountId: string | undefined) => ['social', 'presence', accountId] as const,
  followers: (handle: string) => ['social', 'followers', handle] as const,
  following: (handle: string) => ['social', 'following', handle] as const,
  requests: ['social', 'requests'] as const,
  notifications: ['social', 'notifications'] as const,
  bookmarks: ['social', 'bookmarks'] as const,
  dmConversations: ['social', 'dm', 'conversations'] as const,
  dmThread: (conversationId: string) => ['social', 'dm', 'thread', conversationId] as const,
  search: (q: string) => ['social', 'search', q] as const,
  discover: ['social', 'discover'] as const,
  /** Prefijos que embeben posts (para invalidar tras mutar un post sin barrer notificaciones). */
  postBearing: [
    ['social', 'feed'],
    ['social', 'post'],
    ['social', 'profile'],
  ] as const,
} as const;
