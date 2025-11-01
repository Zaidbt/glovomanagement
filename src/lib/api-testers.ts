export interface ApiTestResult {
  success: boolean;
  message: string;
  statusCode?: number;
  responseTime?: number;
  error?: string;
}

export interface ApiCredentials {
  apiKey?: string;
  apiSecret?: string;
  webhookUrl?: string;
  customField1?: string;
  customField2?: string;
}

export class ApiTester {
  /**
   * Test Twilio API credentials
   */
  static async testTwilio(credentials: ApiCredentials): Promise<ApiTestResult> {
    const startTime = Date.now();

    try {
      // Use server-side proxy to avoid CORS issues
      const response = await fetch("/api/twilio/test-credentials", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          accountSid: credentials.apiKey,
          authToken: credentials.apiSecret,
        }),
      });

      const responseTime = Date.now() - startTime;
      const data = await response.json();

      if (response.ok && data.success) {
        return {
          success: true,
          message: data.message || "Connexion Twilio WhatsApp réussie",
          statusCode: response.status,
          responseTime,
        };
      } else {
        return {
          success: false,
          message: data.message || `Erreur Twilio - ${response.status}: ${response.statusText}`,
          statusCode: response.status,
          responseTime,
          error: data.error,
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `Erreur de connexion Twilio: ${
          error instanceof Error ? error.message : "Erreur inconnue"
        }`,
        error: error instanceof Error ? error.message : "Erreur inconnue",
        responseTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Test Glovo API credentials
   */
  static async testGlovo(credentials: ApiCredentials): Promise<ApiTestResult> {
    const startTime = Date.now();

    try {
      // Déterminer quel type d'API tester
      // Si apiSecret est un token (commence par un UUID-like pattern), c'est un Shared Token
      // Sinon, c'est l'OAuth API avec clientId/clientSecret
      const isSharedToken = credentials.apiSecret && credentials.apiSecret.length === 36;

      const requestBody = isSharedToken
        ? {
            // Partners API (ancienne API avec Shared Token)
            sharedToken: credentials.apiSecret,
            storeId: credentials.customField1 || "store-01",
          }
        : {
            // OAuth API (nouvelle API)
            clientId: credentials.apiKey,
            clientSecret: credentials.apiSecret,
          };

      // Use server-side proxy to avoid CORS issues
      const response = await fetch("/api/glovo/test-credentials", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const responseTime = Date.now() - startTime;
      const data = await response.json();

      if (response.ok && data.success) {
        return {
          success: true,
          message: data.message || "Connexion Glovo réussie",
          statusCode: response.status,
          responseTime,
        };
      } else {
        return {
          success: false,
          message: data.message || `Erreur Glovo - ${response.status}: ${response.statusText}`,
          statusCode: response.status,
          responseTime,
          error: data.error,
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `Erreur de connexion Glovo: ${
          error instanceof Error ? error.message : "Erreur inconnue"
        }`,
        error: error instanceof Error ? error.message : "Erreur inconnue",
        responseTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Test Gmail SMTP credentials
   */
  static async testGmail(credentials: ApiCredentials): Promise<ApiTestResult> {
    const startTime = Date.now();

    try {
      // Test Gmail SMTP connection (simulation)
      // In real implementation, you would use nodemailer or similar
      const response = await fetch("/api/test-smtp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: credentials.apiKey,
          password: credentials.apiSecret,
          host: credentials.customField1 || "smtp.gmail.com",
          port: credentials.customField2 || "587",
        }),
      });

      const responseTime = Date.now() - startTime;

      if (response.ok) {
        return {
          success: true,
          message: `Connexion Gmail SMTP réussie - ${credentials.apiKey}`,
          statusCode: response.status,
          responseTime,
        };
      } else {
        return {
          success: false,
          message: `Erreur Gmail SMTP - ${response.status}: ${response.statusText}`,
          statusCode: response.status,
          responseTime,
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `Erreur de connexion Gmail: ${
          error instanceof Error ? error.message : "Erreur inconnue"
        }`,
        error: error instanceof Error ? error.message : "Erreur inconnue",
        responseTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Test N8N Webhook
   */
  static async testN8n(credentials: ApiCredentials): Promise<ApiTestResult> {
    const startTime = Date.now();

    try {
      // Test N8N webhook with a test payload
      const testPayload = {
        test: true,
        timestamp: new Date().toISOString(),
        source: "natura-beldi-test",
      };

      const response = await fetch(credentials.webhookUrl || "", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(credentials.apiKey && {
            Authorization: `Bearer ${credentials.apiKey}`,
          }),
        },
        body: JSON.stringify(testPayload),
      });

      const responseTime = Date.now() - startTime;

      if (response.ok) {
        return {
          success: true,
          message: `Webhook N8N accessible - ${response.status}`,
          statusCode: response.status,
          responseTime,
        };
      } else {
        return {
          success: false,
          message: `Erreur N8N Webhook - ${response.status}: ${response.statusText}`,
          statusCode: response.status,
          responseTime,
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `Erreur de connexion N8N: ${
          error instanceof Error ? error.message : "Erreur inconnue"
        }`,
        error: error instanceof Error ? error.message : "Erreur inconnue",
        responseTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Test Custom API
   */
  static async testCustom(credentials: ApiCredentials): Promise<ApiTestResult> {
    const startTime = Date.now();

    try {
      // Test custom API endpoint
      const response = await fetch(credentials.webhookUrl || "", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...(credentials.apiKey && {
            Authorization: `Bearer ${credentials.apiKey}`,
          }),
          ...(credentials.apiSecret && {
            "X-API-Secret": credentials.apiSecret,
          }),
        },
      });

      const responseTime = Date.now() - startTime;

      if (response.ok) {
        return {
          success: true,
          message: `API personnalisée accessible - ${response.status}`,
          statusCode: response.status,
          responseTime,
        };
      } else {
        return {
          success: false,
          message: `Erreur API personnalisée - ${response.status}: ${response.statusText}`,
          statusCode: response.status,
          responseTime,
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `Erreur de connexion API personnalisée: ${
          error instanceof Error ? error.message : "Erreur inconnue"
        }`,
        error: error instanceof Error ? error.message : "Erreur inconnue",
        responseTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Test API based on type
   */
  static async testApi(
    type: string,
    credentials: ApiCredentials
  ): Promise<ApiTestResult> {
    switch (type) {
      case "TWILIO":
        return this.testTwilio(credentials);
      case "GLOVO":
        return this.testGlovo(credentials);
      case "GMAIL":
        return this.testGmail(credentials);
      case "N8N":
        return this.testN8n(credentials);
      case "CUSTOM":
        return this.testCustom(credentials);
      default:
        return {
          success: false,
          message: `Type d'API non supporté: ${type}`,
          error: "Unsupported API type",
        };
    }
  }
}
