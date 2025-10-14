import { prisma } from "./prisma";

export interface CredentialValue {
  [key: string]: string;
}

export interface CredentialConfig {
  id: string;
  name: string;
  type: string;
  description: string;
  isConfigured: boolean;
  values?: CredentialValue;
}

class CredentialsService {
  private static instance: CredentialsService;

  private constructor() {}

  public static getInstance(): CredentialsService {
    if (!CredentialsService.instance) {
      CredentialsService.instance = new CredentialsService();
    }
    return CredentialsService.instance;
  }

  /**
   * Récupère une credential par type (ex: TWILIO, GLOVO, etc.)
   */
  public async getCredentialByType(
    type: string
  ): Promise<CredentialConfig | null> {
    try {
      const credential = await prisma.credential.findFirst({
        where: {
          type: type.toUpperCase(),
          isConfigured: true,
        },
        select: {
          id: true,
          name: true,
          type: true,
          description: true,
          isConfigured: true,
          values: true,
          updatedAt: true,
        },
      });

      if (!credential) {
        return null;
      }

      // Décrypter les valeurs
      const decryptedValues = await this.decryptValues(
        credential.values as Record<string, string>
      );

      return {
        id: credential.id,
        name: credential.name,
        type: credential.type,
        description: credential.description,
        isConfigured: credential.isConfigured,
        values: decryptedValues,
      };
    } catch (error) {
      console.error(`Error fetching credential for type ${type}:`, error);
      return null;
    }
  }

  /**
   * Récupère toutes les credentials configurées
   */
  public async getAllCredentials(): Promise<CredentialConfig[]> {
    try {
      const credentials = await prisma.credential.findMany({
        where: { isConfigured: true },
        select: {
          id: true,
          name: true,
          type: true,
          description: true,
          isConfigured: true,
          values: true,
          updatedAt: true,
        },
        orderBy: { updatedAt: "desc" },
      });

      return Promise.all(
        credentials.map(async (credential) => ({
          id: credential.id,
          name: credential.name,
          type: credential.type,
          description: credential.description,
          isConfigured: credential.isConfigured,
          values: await this.decryptValues(
            credential.values as Record<string, string>
          ),
        }))
      );
    } catch (error) {
      console.error("Error fetching all credentials:", error);
      return [];
    }
  }

  /**
   * Vérifie si une credential est configurée
   */
  public async isCredentialConfigured(type: string): Promise<boolean> {
    try {
      const credential = await prisma.credential.findFirst({
        where: {
          type: type.toUpperCase(),
          isConfigured: true,
        },
        select: { id: true },
      });

      return !!credential;
    } catch (error) {
      console.error(`Error checking credential status for ${type}:`, error);
      return false;
    }
  }

  /**
   * Récupère une valeur spécifique d'une credential
   */
  public async getCredentialValue(
    type: string,
    key: string
  ): Promise<string | null> {
    try {
      const credential = await this.getCredentialByType(type);
      return credential?.values?.[key] || null;
    } catch (error) {
      console.error(
        `Error getting credential value for ${type}.${key}:`,
        error
      );
      return null;
    }
  }

  /**
   * Décrypte les valeurs d'une credential
   */
  private async decryptValues(
    encryptedValues: Record<string, string>
  ): Promise<CredentialValue> {
    const decryptedValues: CredentialValue = {};

    for (const [key] of Object.entries(encryptedValues)) {
      try {
        // Note: bcrypt ne peut pas être décrypté, c'est un hash unidirectionnel
        // Dans un vrai système, on utiliserait un chiffrement symétrique comme AES
        // Pour la démo, on retourne une valeur placeholder
        decryptedValues[key] = "[ENCRYPTED]";
      } catch (error) {
        console.error(`Error decrypting value for key ${key}:`, error);
        decryptedValues[key] = "[ERROR]";
      }
    }

    return decryptedValues;
  }

  /**
   * Méthodes spécifiques pour chaque type de credential
   */

  // Twilio
  public async getTwilioConfig(): Promise<{
    accountSid: string | null;
    authToken: string | null;
    webhookUrl: string | null;
  }> {
    const credential = await this.getCredentialByType("TWILIO");
    return {
      accountSid: credential?.values?.apiKey || null,
      authToken: credential?.values?.apiSecret || null,
      webhookUrl: credential?.values?.webhookUrl || null,
    };
  }

  // Glovo
  public async getGlovoConfig(): Promise<{
    apiKey: string | null;
    apiSecret: string | null;
    webhookUrl: string | null;
  }> {
    const credential = await this.getCredentialByType("GLOVO");
    return {
      apiKey: credential?.values?.apiKey || null,
      apiSecret: credential?.values?.apiSecret || null,
      webhookUrl: credential?.values?.webhookUrl || null,
    };
  }

  // Gmail
  public async getGmailConfig(): Promise<{
    email: string | null;
    password: string | null;
    smtpHost: string | null;
    smtpPort: string | null;
  }> {
    const credential = await this.getCredentialByType("GMAIL");
    return {
      email: credential?.values?.apiKey || null,
      password: credential?.values?.apiSecret || null,
      smtpHost: credential?.values?.customField1 || null,
      smtpPort: credential?.values?.customField2 || null,
    };
  }

  // N8N
  public async getN8NConfig(): Promise<{
    webhookUrl: string | null;
    apiKey: string | null;
  }> {
    const credential = await this.getCredentialByType("N8N");
    return {
      webhookUrl: credential?.values?.webhookUrl || null,
      apiKey: credential?.values?.apiKey || null,
    };
  }

  // Custom API
  public async getCustomConfig(): Promise<{
    apiKey: string | null;
    apiSecret: string | null;
    baseUrl: string | null;
    customField1: string | null;
    customField2: string | null;
  }> {
    const credential = await this.getCredentialByType("CUSTOM");
    return {
      apiKey: credential?.values?.apiKey || null,
      apiSecret: credential?.values?.apiSecret || null,
      baseUrl: credential?.values?.webhookUrl || null,
      customField1: credential?.values?.customField1 || null,
      customField2: credential?.values?.customField2 || null,
    };
  }
}

export const credentialsService = CredentialsService.getInstance();
