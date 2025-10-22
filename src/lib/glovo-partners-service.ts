/**
 * Glovo Partners API Service
 * Handles menu and product updates using the Partners API with shared token
 */

const GLOVO_API_BASE_URL = process.env.GLOVO_API_BASE_URL || "https://stageapi.glovoapp.com";
const GLOVO_SHARED_TOKEN = process.env.GLOVO_SHARED_TOKEN || "8b979af6-8e38-4bdb-aa07-26408928052a";
const GLOVO_STORE_ID = process.env.GLOVO_STORE_ID || "store-01";

export interface GlovoProduct {
  id: string;
  name?: string;
  price?: number;
  available?: boolean;
  image_url?: string;
  description?: string;
  attribute_groups?: Array<{
    id: string;
    name: string;
    min?: number;
    max?: number;
    attributes: string[];
  }>;
}

export interface GlovoAttribute {
  id: string;
  name?: string;
  price?: number;
  available?: boolean;
}

export interface BulkUpdateRequest {
  products?: GlovoProduct[];
  attributes?: GlovoAttribute[];
}

export interface BulkUpdateResponse {
  transaction_id: string;
  error_message: string | null;
}

export interface BulkUpdateStatus {
  transaction_id: string;
  status: "SUCCESS" | "PROCESSING" | "PARTIALLY_PROCESSED" | "NOT_PROCESSED" | "GLOVO_ERROR";
  last_updated_at: string;
  details?: string[];
  promotion_statuses?: unknown[];
}

export class GlovoPartnersService {
  private readonly apiBaseUrl: string;
  private readonly sharedToken: string;
  private readonly storeId: string;

  constructor(storeId?: string, sharedToken?: string) {
    this.apiBaseUrl = GLOVO_API_BASE_URL;
    this.sharedToken = sharedToken || GLOVO_SHARED_TOKEN;
    this.storeId = storeId || GLOVO_STORE_ID;
  }

  /**
   * Make authenticated request to Glovo Partners API
   */
  private async makeRequest(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const url = `${this.apiBaseUrl}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: this.sharedToken,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    return response;
  }

  /**
   * Bulk update products and/or attributes
   * Returns a transaction ID to track the update status
   */
  async bulkUpdateItems(data: BulkUpdateRequest): Promise<BulkUpdateResponse> {
    const endpoint = `/webhook/stores/${this.storeId}/menu/updates`;

    const response = await this.makeRequest(endpoint, {
      method: "POST",
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Bulk update failed: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`
      );
    }

    return await response.json();
  }

  /**
   * Check the status of a bulk update transaction
   */
  async getBulkUpdateStatus(transactionId: string): Promise<BulkUpdateStatus> {
    const endpoint = `/webhook/stores/${this.storeId}/menu/updates/${transactionId}`;

    const response = await this.makeRequest(endpoint, {
      method: "GET",
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Failed to get status: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`
      );
    }

    return await response.json();
  }

  /**
   * Update a single product
   */
  async updateProduct(product: GlovoProduct): Promise<BulkUpdateResponse> {
    return this.bulkUpdateItems({ products: [product] });
  }

  /**
   * Update multiple products
   */
  async updateProducts(products: GlovoProduct[]): Promise<BulkUpdateResponse> {
    return this.bulkUpdateItems({ products });
  }

  /**
   * Update product availability (in stock / out of stock)
   */
  async updateProductAvailability(
    productId: string,
    available: boolean
  ): Promise<BulkUpdateResponse> {
    return this.updateProduct({ id: productId, available });
  }

  /**
   * Update product price
   */
  async updateProductPrice(
    productId: string,
    price: number
  ): Promise<BulkUpdateResponse> {
    return this.updateProduct({ id: productId, price });
  }

  /**
   * Update multiple product availabilities at once
   */
  async updateMultipleAvailabilities(
    updates: Array<{ id: string; available: boolean }>
  ): Promise<BulkUpdateResponse> {
    const products = updates.map(({ id, available }) => ({ id, available }));
    return this.updateProducts(products);
  }

  /**
   * Update multiple product prices at once
   */
  async updateMultiplePrices(
    updates: Array<{ id: string; price: number }>
  ): Promise<BulkUpdateResponse> {
    const products = updates.map(({ id, price }) => ({ id, price }));
    return this.updateProducts(products);
  }

  /**
   * Wait for bulk update to complete and return final status
   * Polls the status endpoint until the update is complete
   */
  async waitForBulkUpdate(
    transactionId: string,
    options: {
      maxAttempts?: number;
      delayMs?: number;
    } = {}
  ): Promise<BulkUpdateStatus> {
    const { maxAttempts = 30, delayMs = 2000 } = options;

    for (let i = 0; i < maxAttempts; i++) {
      const status = await this.getBulkUpdateStatus(transactionId);

      // Check if processing is complete
      if (
        status.status === "SUCCESS" ||
        status.status === "PARTIALLY_PROCESSED" ||
        status.status === "NOT_PROCESSED" ||
        status.status === "GLOVO_ERROR"
      ) {
        return status;
      }

      // Wait before next check
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    throw new Error(
      `Bulk update timed out after ${maxAttempts} attempts (${(maxAttempts * delayMs) / 1000}s)`
    );
  }

  /**
   * Update products and wait for completion
   */
  async updateProductsAndWait(
    products: GlovoProduct[]
  ): Promise<BulkUpdateStatus> {
    const response = await this.updateProducts(products);
    return this.waitForBulkUpdate(response.transaction_id);
  }

  /**
   * Test the API connection
   */
  async testConnection(): Promise<{
    success: boolean;
    message: string;
    storeId: string;
  }> {
    try {
      // Try a simple bulk update with no changes (should return transaction_id)
      await this.bulkUpdateItems({ products: [] });

      return {
        success: true,
        message: "Connection successful",
        storeId: this.storeId,
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : "Unknown error",
        storeId: this.storeId,
      };
    }
  }
}

// Singleton instance
export const glovoPartnersService = new GlovoPartnersService();
