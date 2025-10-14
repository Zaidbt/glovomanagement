/**
 * Rate Limiter pour éviter le spam et surcharger l'API Twilio
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

export class RateLimiter {
  private static instance: RateLimiter;
  private limits: Map<string, RateLimitEntry> = new Map();

  // Limites par défaut
  private readonly DEFAULT_LIMITS = {
    messages: { max: 10, window: 60 * 1000 }, // 10 messages/minute
    api: { max: 100, window: 60 * 1000 }, // 100 requêtes API/minute
    media: { max: 20, window: 60 * 1000 }, // 20 médias/minute
  };

  static getInstance(): RateLimiter {
    if (!RateLimiter.instance) {
      RateLimiter.instance = new RateLimiter();
    }
    return RateLimiter.instance;
  }

  /**
   * Vérifier si une action est autorisée
   */
  isAllowed(
    key: string,
    type: "messages" | "api" | "media" = "api",
    customLimit?: { max: number; window: number }
  ): { allowed: boolean; remaining: number; resetTime: number } {
    const limit = customLimit || this.DEFAULT_LIMITS[type];
    const now = Date.now();

    // Nettoyer les entrées expirées
    this.cleanup();

    const entry = this.limits.get(key);

    if (!entry || now > entry.resetTime) {
      // Nouvelle fenêtre ou première requête
      this.limits.set(key, {
        count: 1,
        resetTime: now + limit.window,
      });

      return {
        allowed: true,
        remaining: limit.max - 1,
        resetTime: now + limit.window,
      };
    }

    if (entry.count >= limit.max) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: entry.resetTime,
      };
    }

    // Incrémenter le compteur
    entry.count++;
    this.limits.set(key, entry);

    return {
      allowed: true,
      remaining: limit.max - entry.count,
      resetTime: entry.resetTime,
    };
  }

  /**
   * Nettoyer les entrées expirées
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.limits.entries()) {
      if (now > entry.resetTime) {
        this.limits.delete(key);
      }
    }
  }

  /**
   * Obtenir les statistiques de rate limiting
   */
  getStats(): {
    totalKeys: number;
    activeLimits: Array<{
      key: string;
      count: number;
      resetTime: number;
      remaining: number;
    }>;
  } {
    this.cleanup();

    const activeLimits = Array.from(this.limits.entries()).map(
      ([key, entry]) => ({
        key,
        count: entry.count,
        resetTime: entry.resetTime,
        remaining: Math.max(0, this.DEFAULT_LIMITS.api.max - entry.count),
      })
    );

    return {
      totalKeys: this.limits.size,
      activeLimits,
    };
  }

  /**
   * Réinitialiser les limites pour une clé
   */
  reset(key: string): void {
    this.limits.delete(key);
  }

  /**
   * Réinitialiser toutes les limites
   */
  resetAll(): void {
    this.limits.clear();
  }
}
