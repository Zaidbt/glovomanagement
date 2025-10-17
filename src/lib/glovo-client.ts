/**
 * Glovo API Client
 * Supports both OAuth and Shared Token authentication
 */

export interface GlovoClientConfig {
  mode: 'oauth' | 'shared-token';
  baseUrl?: string;

  // For OAuth mode
  clientId?: string;
  clientSecret?: string;
  accessToken?: string;
  refreshToken?: string;

  // For Shared Token mode
  sharedToken?: string;
  storeId?: string;
}

export class GlovoClient {
  private config: GlovoClientConfig;
  private baseUrl: string;

  constructor(config: GlovoClientConfig) {
    this.config = config;
    this.baseUrl = config.baseUrl || 'https://stageapi.glovoapp.com';
  }

  /**
   * Create a client from environment variables (test mode)
   */
  static fromEnv(): GlovoClient {
    const testMode = process.env.GLOVO_TEST_MODE === 'true';

    if (testMode) {
      return new GlovoClient({
        mode: 'shared-token',
        baseUrl: process.env.GLOVO_API_BASE_URL || 'https://stageapi.glovoapp.com',
        sharedToken: process.env.GLOVO_SHARED_TOKEN,
        storeId: process.env.GLOVO_STORE_ID,
      });
    }

    // Production OAuth mode
    return new GlovoClient({
      mode: 'oauth',
      baseUrl: 'https://api.glovoapp.com',
      clientId: process.env.GLOVO_CLIENT_ID,
      clientSecret: process.env.GLOVO_CLIENT_SECRET,
    });
  }

  /**
   * Make an authenticated request to Glovo API
   */
  async request(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const url = `${this.baseUrl}${endpoint}`;

    // Build headers based on auth mode
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    // Add authentication
    if (this.config.mode === 'shared-token') {
      if (!this.config.sharedToken) {
        throw new Error('Shared token not configured');
      }
      headers['Authorization'] = this.config.sharedToken;
    } else {
      // OAuth mode
      if (!this.config.accessToken) {
        throw new Error('Access token not available');
      }
      headers['Authorization'] = `Bearer ${this.config.accessToken}`;
    }

    console.log(`🔍 Glovo API Request: ${options.method || 'GET'} ${endpoint}`);

    const response = await fetch(url, {
      ...options,
      headers,
    });

    console.log(`✅ Glovo API Response: ${response.status} ${response.statusText}`);

    return response;
  }

  /**
   * Get stores information
   */
  async getStores(): Promise<{ stores: Array<{ id: string; name: string; address: string }> }> {
    const response = await this.request('/webhook/stores');

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get stores: ${response.status} - ${error}`);
    }

    return response.json();
  }

  /**
   * Get specific store information
   */
  async getStore(storeId: string): Promise<{ id: string; name: string; address: string; status: string }> {
    const response = await this.request(`/webhook/stores/${storeId}`);

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get store: ${response.status} - ${error}`);
    }

    return response.json();
  }

  /**
   * Update order status
   */
  async updateOrderStatus(
    storeId: string,
    orderId: string,
    status: 'ACCEPTED' | 'REJECTED'
  ): Promise<{ success: boolean; message: string }> {
    const response = await this.request(
      `/webhook/stores/${storeId}/orders/${orderId}/${status.toLowerCase()}`,
      {
        method: 'POST',
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to update order: ${response.status} - ${error}`);
    }

    return response.json();
  }

  /**
   * Accept an order
   */
  async acceptOrder(storeId: string, orderId: string): Promise<{ success: boolean; message: string }> {
    return this.updateOrderStatus(storeId, orderId, 'ACCEPTED');
  }

  /**
   * Reject an order
   */
  async rejectOrder(storeId: string, orderId: string): Promise<{ success: boolean; message: string }> {
    return this.updateOrderStatus(storeId, orderId, 'REJECTED');
  }

  /**
   * Mark order as ready for pickup
   */
  async markOrderReady(storeId: string, orderId: string): Promise<{ success: boolean; message: string }> {
    const response = await this.request(
      `/webhook/stores/${storeId}/orders/${orderId}/ready`,
      {
        method: 'POST',
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to mark order ready: ${response.status} - ${error}`);
    }

    return response.json();
  }

  /**
   * Test authentication
   * Note: Glovo webhook API is push-based only (no GET endpoints for data)
   * We test auth by checking if we get 401/403 or other responses
   */
  async testConnection(): Promise<{
    success: boolean;
    message: string;
    mode: string;
  }> {
    try {
      // Test with the closing endpoint - it exists in the API
      const storeId = this.config.storeId || 'store-01';
      const response = await this.request(`/webhook/stores/${storeId}/closing`);

      // If we get 401 or 403, authentication failed
      if (response.status === 401 || response.status === 403) {
        return {
          success: false,
          message: `Authentication failed: ${response.status} ${response.statusText}`,
          mode: this.config.mode,
        };
      }

      // Any other response means auth worked (404 means endpoint doesn't exist but auth is valid)
      return {
        success: true,
        message: `✅ Authentication successful in ${this.config.mode} mode with store ID: ${storeId}`,
        mode: this.config.mode,
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
        mode: this.config.mode,
      };
    }
  }

  /**
   * Get the configured store ID (for test mode)
   */
  getStoreId(): string | undefined {
    return this.config.storeId;
  }

  /**
   * Check if in test mode
   */
  isTestMode(): boolean {
    return this.config.mode === 'shared-token';
  }
}

// Export a singleton instance
export const glovoClient = GlovoClient.fromEnv();
