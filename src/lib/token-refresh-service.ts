import { prisma } from "@/lib/prisma";
import { GlovoService } from "./glovo-service";

export interface TokenRefreshResult {
  success: boolean;
  credentialId: string;
  serviceType: string;
  instanceName: string;
  message: string;
  newExpiresAt?: Date;
}

export class TokenRefreshService {
  /**
   * Vérifier et renouveler tous les tokens expirés ou sur le point d'expirer
   */
  static async refreshAllTokens(): Promise<TokenRefreshResult[]> {
    const results: TokenRefreshResult[] = [];

    try {
      // Récupérer tous les credentials avec des tokens OAuth
      const credentials = await prisma.credential.findMany({
        where: {
          AND: [
            { isActive: true },
            { isConfigured: true },
            {
              OR: [{ type: "GLOVO" }, { type: "TWILIO" }, { type: "GMAIL" }],
            },
            {
              OR: [
                { accessToken: { not: null } },
                { refreshToken: { not: null } },
              ],
            },
          ],
        },
      });

      console.log(
        `🔄 Token Refresh Service: Found ${credentials.length} credentials to check`
      );

      for (const credential of credentials) {
        try {
          const result = await this.refreshTokenForCredential(credential);
          results.push(result);
        } catch (error) {
          console.error(
            `❌ Error refreshing token for ${credential.id}:`,
            error
          );
          results.push({
            success: false,
            credentialId: credential.id as string,
            serviceType: credential.type as string,
            instanceName: (credential.instanceName as string) || "Unknown",
            message: `Error: ${
              error instanceof Error ? error.message : "Unknown error"
            }`,
          });
        }
      }

      return results;
    } catch (error) {
      console.error("💥 Token Refresh Service Error:", error);
      return results;
    }
  }

  /**
   * Renouveler le token pour un credential spécifique
   */
  private static async refreshTokenForCredential(
    credential: Record<string, unknown>
  ): Promise<TokenRefreshResult> {
    const now = new Date();
    const expiresAt = credential.expiresAt
      ? new Date(credential.expiresAt as string)
      : null;

    // Vérifier si le token expire dans les 30 prochaines minutes
    const shouldRefresh =
      !expiresAt || expiresAt.getTime() - now.getTime() < 30 * 60 * 1000;

    if (!shouldRefresh) {
      return {
        success: true,
        credentialId: credential.id as string,
        serviceType: credential.type as string,
        instanceName: (credential.instanceName as string) || "Unknown",
        message: "Token still valid, no refresh needed",
      };
    }

    console.log(
      `🔄 Refreshing token for ${credential.type} credential: ${credential.instanceName}`
    );

    switch (credential.type) {
      case "GLOVO":
        return await this.refreshGlovoToken(credential);
      case "TWILIO":
        return await this.refreshTwilioToken(credential);
      case "GMAIL":
        return await this.refreshGmailToken(credential);
      default:
        return {
          success: false,
          credentialId: credential.id as string,
          serviceType: credential.type as string,
          instanceName: (credential.instanceName as string) || "Unknown",
          message: "Unsupported service type for auto-refresh",
        };
    }
  }

  /**
   * Renouveler le token Glovo
   */
  private static async refreshGlovoToken(
    credential: Record<string, unknown>
  ): Promise<TokenRefreshResult> {
    try {
      const glovoService = new GlovoService();
      await glovoService.loadCredentials(credential.id as string);

      // Obtenir un nouveau token (getValidToken gère le refresh automatiquement)
      const accessToken = await glovoService.getValidToken();

      if (accessToken) {
        // Le token a été rafraîchi avec succès (si nécessaire)
        return {
          success: true,
          credentialId: credential.id as string,
          serviceType: "GLOVO",
          instanceName: (credential.instanceName as string) || "Unknown",
          message: "Token refreshed successfully",
        };
      } else {
        return {
          success: false,
          credentialId: credential.id as string,
          serviceType: "GLOVO",
          instanceName: (credential.instanceName as string) || "Unknown",
          message: "Failed to obtain new token",
        };
      }
    } catch (error) {
      return {
        success: false,
        credentialId: credential.id as string,
        serviceType: "GLOVO",
        instanceName: (credential.instanceName as string) || "Unknown",
        message: `Glovo refresh error: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      };
    }
  }

  /**
   * Renouveler le token Twilio (si applicable)
   */
  private static async refreshTwilioToken(
    credential: Record<string, unknown>
  ): Promise<TokenRefreshResult> {
    // Twilio utilise généralement des tokens statiques, pas de renouvellement nécessaire
    return {
      success: true,
      credentialId: credential.id as string,
      serviceType: "TWILIO",
      instanceName: (credential.instanceName as string) || "Unknown",
      message: "Twilio tokens are static, no refresh needed",
    };
  }

  /**
   * Renouveler le token Gmail (si applicable)
   */
  private static async refreshGmailToken(
    credential: Record<string, unknown>
  ): Promise<TokenRefreshResult> {
    // Gmail OAuth refresh logic would go here
    return {
      success: true,
      credentialId: credential.id as string,
      serviceType: "GMAIL",
      instanceName: (credential.instanceName as string) || "Unknown",
      message: "Gmail token refresh not implemented yet",
    };
  }

  /**
   * Vérifier l'état des tokens pour un credential spécifique
   */
  static async checkTokenStatus(credentialId: string): Promise<{
    isValid: boolean;
    expiresAt?: Date;
    timeUntilExpiry?: number;
    needsRefresh: boolean;
  }> {
    try {
      const credential = await prisma.credential.findUnique({
        where: { id: credentialId },
      });

      if (!credential || !credential.expiresAt) {
        return {
          isValid: false,
          needsRefresh: true,
        };
      }

      const now = new Date();
      const expiresAt = new Date(credential.expiresAt);
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
}
