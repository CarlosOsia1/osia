import { Inject, Injectable } from '@nestjs/common';
import type { PostDto } from '@osia/shared';
import { STORAGE_PORT, type StoragePort } from './ports/out/storage.port';

/**
 * Firma la media de post al momento de leer (Ola 1D). Con los buckets de post en PRIVADO, la URL guardada
 * en `posts.media` no sirve directo: hay que firmarla (URL prefirmada con TTL) para servirla — y solo se
 * firma para quien YA pasó la visibilidad del post (el API es quien construye el DTO). Cubre la media
 * DIRECTA del post y la del original embebido de un eco (`referencedPost.media`). Firma en LOTE: junta
 * todas las URLs de la página en una sola pasada por bucket. Fuente única para las 7 rutas de lectura.
 */
@Injectable()
export class PostMediaSigner {
  constructor(@Inject(STORAGE_PORT) private readonly storage: StoragePort) {}

  /** Firma un post (y su original embebido) in-place. No-op si es `null`. */
  async signPost(post: PostDto | null): Promise<void> {
    if (post) await this.signPosts([post]);
  }

  /** Firma una página de posts in-place con UNA firma en lote (junta todas las URLs). */
  async signPosts(posts: PostDto[]): Promise<void> {
    const urls = new Set<string>();
    for (const post of posts) this.collect(post, urls);
    if (urls.size === 0) return;
    const signed = await this.storage.signMediaUrls([...urls]);
    if (signed.size === 0) return;
    for (const post of posts) this.apply(post, signed);
  }

  private collect(post: PostDto, acc: Set<string>): void {
    for (const m of post.media) acc.add(m.url);
    if (post.referencedPost) for (const m of post.referencedPost.media) acc.add(m.url);
  }

  private apply(post: PostDto, signed: Map<string, string>): void {
    for (const m of post.media) m.url = signed.get(m.url) ?? m.url;
    if (post.referencedPost) for (const m of post.referencedPost.media) m.url = signed.get(m.url) ?? m.url;
  }
}
