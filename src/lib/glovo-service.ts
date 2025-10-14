import { prisma } from "@/lib/prisma";

export interface GlovoCredentials {
  id: string;
  clientId: string;
  clientSecret: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: Date;
  isActive: boolean;
  instanceName: string;
}

export interface GlovoTokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
  scope?: string;
}

export interface GlovoOrder {
  orderId: string;
  storeId: string;
  status: string;
  customerInfo: Record<string, unknown>;
  items: Record<string, unknown>[];
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
}

export class GlovoService {
  private credentials: GlovoCredentials | null = null;
  private tokenCache: Map<string, { token: string; expiresAt: Date }> =
    new Map();

  constructor(credentialId?: string) {
    if (credentialId) {
      this.loadCredentials(credentialId);
    }
  }

  /**
   * Charger les credentials Glovo depuis la base de données
   */
  async loadCredentials(credentialId: string): Promise<void> {
    try {
      const credential = await prisma.credential.findUnique({
        where: { id: credentialId },
      });

      if (!credential || credential.type !== "GLOVO") {
        throw new Error("Credentials Glovo non trouvés");
      }

      this.credentials = {
        id: credential.id,
        clientId: credential.apiKey || "",
        clientSecret: credential.apiSecret || "",
        accessToken: credential.accessToken || undefined,
        refreshToken: credential.refreshToken || undefined,
        expiresAt: credential.expiresAt || undefined,
        isActive: credential.isActive,
        instanceName: credential.instanceName || "Glovo API",
      };
    } catch (error) {
      console.error("Erreur lors du chargement des credentials Glovo:", error);
      throw error;
    }
  }

  /**
   * Obtenir un token d'accès valide (nouveau ou renouvelé si nécessaire)
   */
  async getValidToken(): Promise<string> {
    if (!this.credentials) {
      throw new Error("Credentials Glovo non chargés");
    }

    // Vérifier si on a un token valide en cache
    const cached = this.tokenCache.get(this.credentials.id);
    if (cached && cached.expiresAt > new Date()) {
      return cached.token;
    }

    // Vérifier si on peut utiliser le token stocké
    if (
      this.credentials.accessToken &&
      this.credentials.expiresAt &&
      this.credentials.expiresAt > new Date()
    ) {
      // Mettre en cache
      this.tokenCache.set(this.credentials.id, {
        token: this.credentials.accessToken,
        expiresAt: this.credentials.expiresAt,
      });
      return this.credentials.accessToken;
    }

    // Obtenir un nouveau token
    return await this.refreshToken();
  }

  /**
   * Obtenir un nouveau token OAuth
   */
  async getNewToken(): Promise<GlovoTokenResponse> {
    if (!this.credentials) {
      throw new Error("Credentials Glovo non chargés");
    }

    try {
      const response = await fetch(
        "https://stageapi.glovoapp.com/oauth/token",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            grantType: "client_credentials",
            clientId: this.credentials.clientId,
            clientSecret: this.credentials.clientSecret,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(
          `Erreur OAuth Glovo: ${response.status} ${response.statusText}`
        );
      }

      const tokenData = await response.json();
      return {
        accessToken: tokenData.accessToken,
        refreshToken: tokenData.refreshToken,
        expiresIn: tokenData.expiresIn,
        tokenType: tokenData.tokenType,
        scope: tokenData.scope,
      };
    } catch (error) {
      console.error("Erreur lors de l'obtention du token Glovo:", error);
      throw error;
    }
  }

  /**
   * Renouveler le token (utilise refreshToken si disponible, sinon nouveau token)
   */
  async refreshToken(): Promise<string> {
    if (!this.credentials) {
      throw new Error("Credentials Glovo non chargés");
    }

    let tokenData: GlovoTokenResponse;

    // Essayer d'abord avec le refreshToken si disponible
    if (this.credentials.refreshToken) {
      try {
        tokenData = await this.refreshWithRefreshToken();
      } catch (error) {
        console.warn(
          "Échec du refresh avec refreshToken, obtention d'un nouveau token:",
          error
        );
        tokenData = await this.getNewToken();
      }
    } else {
      tokenData = await this.getNewToken();
    }

    // Calculer la date d'expiration
    const expiresAt = new Date(Date.now() + tokenData.expiresIn * 1000);

    // Sauvegarder en base de données
    await this.saveTokenToDatabase(tokenData, expiresAt);

    // Mettre à jour les credentials en mémoire
    this.credentials.accessToken = tokenData.accessToken;
    this.credentials.refreshToken = tokenData.refreshToken;
    this.credentials.expiresAt = expiresAt;

    // Mettre en cache
    this.tokenCache.set(this.credentials.id, {
      token: tokenData.accessToken,
      expiresAt: expiresAt,
    });

    return tokenData.accessToken;
  }

  /**
   * Renouveler le token avec le refreshToken
   */
  private async refreshWithRefreshToken(): Promise<GlovoTokenResponse> {
    if (!this.credentials?.refreshToken) {
      throw new Error("RefreshToken non disponible");
    }

    const response = await fetch("https://stageapi.glovoapp.com/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        grantType: "refresh_token",
        refreshToken: this.credentials.refreshToken,
      }),
    });

    if (!response.ok) {
      throw new Error(
        `Erreur refresh token: ${response.status} ${response.statusText}`
      );
    }

    return await response.json();
  }

  /**
   * Sauvegarder le token en base de données
   */
  private async saveTokenToDatabase(
    tokenData: GlovoTokenResponse,
    expiresAt: Date
  ): Promise<void> {
    if (!this.credentials) return;

    try {
      await prisma.credential.update({
        where: { id: this.credentials.id },
        data: {
          accessToken: tokenData.accessToken,
          refreshToken: tokenData.refreshToken,
          expiresAt: expiresAt,
          lastUpdated: new Date(),
        },
      });
    } catch (error) {
      console.error("Erreur lors de la sauvegarde du token:", error);
      throw error;
    }
  }

  /**
   * Faire un appel API authentifié à Glovo
   */
  async makeAuthenticatedRequest(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const token = await this.getValidToken();

    const response = await fetch(`https://stageapi.glovoapp.com${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    // Si 401, essayer de renouveler le token et refaire l'appel
    if (response.status === 401) {
      console.log("Token expiré, renouvellement en cours...");
      const newToken = await this.refreshToken();

      return fetch(`https://stageapi.glovoapp.com${endpoint}`, {
        ...options,
        headers: {
          Authorization: `Bearer ${newToken}`,
          "Content-Type": "application/json",
          ...options.headers,
        },
      });
    }

    return response;
  }

  /**
   * Tester la connexion Glovo
   */
  async testConnection(): Promise<{
    success: boolean;
    message: string;
    responseTime: number;
  }> {
    const startTime = Date.now();

    try {
      await this.getValidToken();
      const responseTime = Date.now() - startTime;

      return {
        success: true,
        message: `Connexion Glovo réussie - Token OAuth valide (${this.credentials?.instanceName})`,
        responseTime,
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      return {
        success: false,
        message: `Erreur de connexion Glovo: ${
          error instanceof Error ? error.message : "Erreur inconnue"
        }`,
        responseTime,
      };
    }
  }

  /**
   * Obtenir les informations des stores (si l'endpoint existe)
   */
  async getStores(): Promise<Record<string, unknown>[]> {
    try {
      const response = await this.makeAuthenticatedRequest("/webhook/stores");
      if (!response.ok) {
        throw new Error(
          `Erreur API Glovo: ${response.status} ${response.statusText}`
        );
      }
      return await response.json();
    } catch (error) {
      console.error("Erreur lors de la récupération des stores:", error);
      throw error;
    }
  }

  /**
   * Nettoyer le cache des tokens
   */
  clearTokenCache(): void {
    this.tokenCache.clear();
  }

  /**
   * Vérifier l'état du token (valide, expire bientôt, etc.)
   */
  async getTokenStatus(): Promise<{
    isValid: boolean;
    expiresAt?: Date;
    timeUntilExpiry?: number;
    needsRefresh: boolean;
  }> {
    try {
      if (!this.credentials || !this.credentials.expiresAt) {
        return {
          isValid: false,
          needsRefresh: true,
        };
      }

      const now = new Date();
      const expiresAt = new Date(this.credentials.expiresAt);
      const timeUntilExpiry = expiresAt.getTime() - now.getTime();
      const needsRefresh = timeUntilExpiry < 30 * 60 * 1000; // 30 minutes

      return {
        isValid: timeUntilExpiry > 0,
        expiresAt,
        timeUntilExpiry,
        needsRefresh,
      };
    } catch (error) {
      console.error("Error checking token status:", error);
      return {
        isValid: false,
        needsRefresh: true,
      };
    }
  }

  /**
   * Obtenir le statut des credentials
   */
  getCredentialsStatus(): {
    isLoaded: boolean;
    hasValidToken: boolean;
    expiresAt?: Date;
    instanceName?: string;
  } {
    if (!this.credentials) {
      return { isLoaded: false, hasValidToken: false };
    }

    const hasValidToken =
      this.credentials.accessToken &&
      this.credentials.expiresAt &&
      this.credentials.expiresAt > new Date();

    return {
      isLoaded: true,
      hasValidToken: !!hasValidToken,
      expiresAt: this.credentials.expiresAt,
      instanceName: this.credentials.instanceName,
    };
  }
}

// Instance singleton pour l'utilisation globale
export const glovoService = new GlovoService();
