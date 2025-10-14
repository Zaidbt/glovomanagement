// import { PrismaClient } from "@prisma/client";

// const prisma = new PrismaClient();

export interface CachedMedia {
  id: string;
  twilioSid: string;
  mediaUrl: string;
  mediaType: string;
  cachedAt: Date;
  expiresAt: Date;
  fileSize?: number;
}

export class MediaCacheService {
  private static instance: MediaCacheService;
  private cache: Map<string, CachedMedia> = new Map();
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 heures
  private readonly MAX_CACHE_SIZE = 100; // Max 100 médias en cache

  static getInstance(): MediaCacheService {
    if (!MediaCacheService.instance) {
      MediaCacheService.instance = new MediaCacheService();
    }
    return MediaCacheService.instance;
  }

  /**
   * Vérifier si un média est en cache et valide
   */
  async getCachedMedia(twilioSid: string): Promise<string | null> {
    const cached = this.cache.get(twilioSid);

    if (cached && cached.expiresAt > new Date()) {
      return cached.mediaUrl;
    }

    // Nettoyer le cache expiré
    if (cached) {
      this.cache.delete(twilioSid);
    }

    return null;
  }

  /**
   * Mettre en cache un média
   */
  async cacheMedia(
    twilioSid: string,
    mediaUrl: string,
    mediaType: string,
    fileSize?: number
  ): Promise<void> {
    // Nettoyer le cache si trop plein
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      this.cleanupExpiredCache();
    }

    const cachedMedia: CachedMedia = {
      id: `cache_${twilioSid}`,
      twilioSid,
      mediaUrl,
      mediaType,
      cachedAt: new Date(),
      expiresAt: new Date(Date.now() + this.CACHE_DURATION),
      fileSize,
    };

    this.cache.set(twilioSid, cachedMedia);
  }

  /**
   * Nettoyer le cache expiré
   */
  private cleanupExpiredCache(): void {
    const now = new Date();
    const expiredKeys: string[] = [];

    for (const [key, media] of this.cache.entries()) {
      if (media.expiresAt <= now) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach((key) => this.cache.delete(key));
  }

  /**
   * Obtenir les statistiques du cache
   */
  getCacheStats(): {
    size: number;
    maxSize: number;
    oldestEntry?: Date;
    newestEntry?: Date;
  } {
    const entries = Array.from(this.cache.values());
    return {
      size: this.cache.size,
      maxSize: this.MAX_CACHE_SIZE,
      oldestEntry:
        entries.length > 0
          ? new Date(Math.min(...entries.map((e) => e.cachedAt.getTime())))
          : undefined,
      newestEntry:
        entries.length > 0
          ? new Date(Math.max(...entries.map((e) => e.cachedAt.getTime())))
          : undefined,
    };
  }

  /**
   * Vider complètement le cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}
