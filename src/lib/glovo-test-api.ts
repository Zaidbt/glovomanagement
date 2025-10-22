/**
 * Glovo Test API Client
 *
 * This service provides access to Glovo test environment API endpoints.
 * The shared token has READ-ONLY permissions.
 *
 * Working endpoints:
 * - GET /webhook/stores/{storeId}/closing
 * - GET /webhook/stores/{storeId}/packagings/types
 * - GET /webhook/stores/{storeId}/menu/updates
 *
 * Note: Auto-accept is enabled for test orders.
 */

const GLOVO_TEST_TOKEN = "8b979af6-8e38-4bdb-aa07-26408928052a";
const GLOVO_TEST_STORE_ID = "store-01";
const GLOVO_TEST_BASE_URL = "https://stageapi.glovoapp.com";

export interface GlovoClosingStatus {
  until: string | null; // ISO date-time or null if no temporary closure
}

export interface GlovoPackagingType {
  id: number;
  type_name: string;
  is_eco: boolean;
  is_returnable: boolean;
  min_price: number;
  max_price: number;
  currency: string;
}

export interface GlovoPackagingTypesResponse {
  packaging_types: GlovoPackagingType[];
}

export class GlovoTestAPI {
  private token: string;
  private storeId: string;
  private baseUrl: string;

  constructor(
    token: string = GLOVO_TEST_TOKEN,
    storeId: string = GLOVO_TEST_STORE_ID,
    baseUrl: string = GLOVO_TEST_BASE_URL
  ) {
    this.token = token;
    this.storeId = storeId;
    this.baseUrl = baseUrl;
  }

  /**
   * Get temporary closure status for the store
   * Returns null if no temporary closure is active
   */
  async getClosingStatus(): Promise<GlovoClosingStatus> {
    const response = await fetch(
      `${this.baseUrl}/webhook/stores/${this.storeId}/closing`,
      {
        method: "GET",
        headers: {
          Authorization: this.token, // NOTE: No "Bearer" prefix!
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(
        `Failed to get closing status: ${error.error?.message || response.statusText}`
      );
    }

    return response.json();
  }

  /**
   * Get available packaging types for the store
   */
  async getPackagingTypes(): Promise<GlovoPackagingTypesResponse> {
    const response = await fetch(
      `${this.baseUrl}/webhook/stores/${this.storeId}/packagings/types`,
      {
        method: "GET",
        headers: {
          Authorization: this.token,
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(
        `Failed to get packaging types: ${error.error?.message || response.statusText}`
      );
    }

    return response.json();
  }

  /**
   * Get menu update status
   * Returns list of recent menu updates with their status
   */
  async getMenuUpdates(): Promise<unknown> {
    const response = await fetch(
      `${this.baseUrl}/webhook/stores/${this.storeId}/menu/updates`,
      {
        method: "GET",
        headers: {
          Authorization: this.token,
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(
        `Failed to get menu updates: ${error.error?.message || response.statusText}`
      );
    }

    // May return empty response if no updates
    const text = await response.text();
    return text ? JSON.parse(text) : null;
  }

  /**
   * Check if the store is currently closed temporarily
   */
  async isStoreClosed(): Promise<boolean> {
    const status = await this.getClosingStatus();
    if (!status.until) return false;

    const closedUntil = new Date(status.until);
    return closedUntil > new Date();
  }

  /**
   * Get the deposit packaging price range
   * Useful for displaying packaging fees to customers
   */
  async getDepositPackagingInfo(): Promise<GlovoPackagingType | null> {
    const response = await this.getPackagingTypes();
    return (
      response.packaging_types.find((p) => p.type_name === "Deposit") || null
    );
  }
}

// Export singleton instance
export const glovoTestAPI = new GlovoTestAPI();

// Example usage:
// const closingStatus = await glovoTestAPI.getClosingStatus();
// const packagingTypes = await glovoTestAPI.getPackagingTypes();
// const isClosed = await glovoTestAPI.isStoreClosed();
