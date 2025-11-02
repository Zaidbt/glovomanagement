/**
 * Glovo Product Sync Service
 * Syncs product price and availability changes from our database to Glovo v2 API
 * Uses credentials from database (no hardcoding)
 */

import { prisma } from "@/lib/prisma";

interface GlovoProduct {
  id: string; // SKU
  name?: string;
  price?: number; // Price in store currency
  available?: boolean;
}

interface BulkUpdateRequest {
  products?: GlovoProduct[];
}

interface BulkUpdateResponse {
  transaction_id: string;
  error_message: string | null;
}

interface BulkUpdateStatus {
  transaction_id: string;
  status:
    | "SUCCESS"
    | "PROCESSING"
    | "PARTIALLY_PROCESSED"
    | "NOT_PROCESSED"
    | "GLOVO_ERROR";
  last_updated_at: string;
  details?: string[];
}

export class GlovoProductSyncService {
  /**
   * Get Glovo credentials for a store from database
   */
  private async getStoreCredentials(storeId: string) {
    const store = await prisma.store.findUnique({
      where: { id: storeId },
      include: {
        glovoCredential: true,
      },
    });

    if (!store) {
      throw new Error(`Store ${storeId} not found`);
    }

    if (!store.glovoCredential) {
      throw new Error(`Store ${storeId} has no Glovo credentials configured`);
    }

    const credential = store.glovoCredential;

    // Extract credentials
    const chainId = credential.apiKey; // Chain ID
    const vendorId = store.glovoStoreId || credential.customField1; // Vendor ID
    const accessToken = credential.accessToken; // Bearer token

    if (!chainId || !vendorId || !accessToken) {
      throw new Error(
        `Store ${storeId} is missing required Glovo credentials (chainId, vendorId, or accessToken)`
      );
    }

    // Determine API base URL (production or stage)
    const apiBaseUrl =
      credential.webhookUrl || "https://api.glovoapp.com";

    return {
      chainId,
      vendorId,
      accessToken,
      apiBaseUrl,
    };
  }

  /**
   * Make authenticated request to Glovo v2 API
   */
  private async makeRequest(
    url: string,
    accessToken: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    return response;
  }

  /**
   * Sync product price to Glovo
   * @param storeId - Store ID in our database
   * @param sku - Product SKU (Glovo product ID)
   * @param priceInCentimes - New price in centimes
   */
  async syncProductPrice(
    storeId: string,
    sku: string,
    priceInCentimes: number
  ): Promise<{ success: boolean; transactionId?: string; error?: string }> {
    try {
      console.log(`🔄 Syncing price for product ${sku} in store ${storeId}`, {
        priceInCentimes,
      });

      // Get credentials from database
      const { chainId, vendorId, accessToken, apiBaseUrl } =
        await this.getStoreCredentials(storeId);

      // Convert centimes to store currency (DH)
      const priceInDH = priceInCentimes / 100;

      // Build request
      const endpoint = `/v2/chains/${chainId}/vendors/${vendorId}/catalog`;
      const url = `${apiBaseUrl}${endpoint}`;

      const body: BulkUpdateRequest = {
        products: [
          {
            id: sku,
            price: priceInDH,
          },
        ],
      };

      console.log(`📤 Sending update to Glovo:`, { url, body });

      const response = await this.makeRequest(url, accessToken, {
        method: "PUT",
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error(`❌ Glovo API error:`, {
          status: response.status,
          error: errorData,
        });
        return {
          success: false,
          error: `Glovo API error: ${response.status} - ${JSON.stringify(errorData)}`,
        };
      }

      const result: BulkUpdateResponse = await response.json();

      // Update lastSyncedAt in database
      await prisma.product.update({
        where: {
          storeId_sku: {
            storeId,
            sku,
          },
        },
        data: {
          lastSyncedAt: new Date(),
        },
      });

      console.log(`✅ Price synced successfully:`, result);

      return {
        success: true,
        transactionId: result.transaction_id,
      };
    } catch (error) {
      console.error(`💥 Error syncing price:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Sync product availability to Glovo
   * @param storeId - Store ID in our database
   * @param sku - Product SKU (Glovo product ID)
   * @param isActive - Product availability (true = available, false = out of stock)
   */
  async syncProductAvailability(
    storeId: string,
    sku: string,
    isActive: boolean
  ): Promise<{ success: boolean; transactionId?: string; error?: string }> {
    try {
      console.log(
        `🔄 Syncing availability for product ${sku} in store ${storeId}`,
        { isActive }
      );

      // Get credentials from database
      const { chainId, vendorId, accessToken, apiBaseUrl } =
        await this.getStoreCredentials(storeId);

      // Build request
      const endpoint = `/v2/chains/${chainId}/vendors/${vendorId}/catalog`;
      const url = `${apiBaseUrl}${endpoint}`;

      const body: BulkUpdateRequest = {
        products: [
          {
            id: sku,
            available: isActive,
          },
        ],
      };

      console.log(`📤 Sending update to Glovo:`, { url, body });

      const response = await this.makeRequest(url, accessToken, {
        method: "PUT",
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error(`❌ Glovo API error:`, {
          status: response.status,
          error: errorData,
        });
        return {
          success: false,
          error: `Glovo API error: ${response.status} - ${JSON.stringify(errorData)}`,
        };
      }

      const result: BulkUpdateResponse = await response.json();

      // Update lastSyncedAt in database
      await prisma.product.update({
        where: {
          storeId_sku: {
            storeId,
            sku,
          },
        },
        data: {
          lastSyncedAt: new Date(),
        },
      });

      console.log(`✅ Availability synced successfully:`, result);

      return {
        success: true,
        transactionId: result.transaction_id,
      };
    } catch (error) {
      console.error(`💥 Error syncing availability:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Sync both price and availability for a product
   * @param storeId - Store ID in our database
   * @param sku - Product SKU (Glovo product ID)
   * @param priceInCentimes - New price in centimes
   * @param isActive - Product availability
   */
  async syncProduct(
    storeId: string,
    sku: string,
    priceInCentimes: number,
    isActive: boolean
  ): Promise<{ success: boolean; transactionId?: string; error?: string }> {
    try {
      console.log(`🔄 Syncing product ${sku} in store ${storeId}`, {
        priceInCentimes,
        isActive,
      });

      // Get credentials from database
      const { chainId, vendorId, accessToken, apiBaseUrl } =
        await this.getStoreCredentials(storeId);

      // Convert centimes to store currency (DH)
      const priceInDH = priceInCentimes / 100;

      // Build request
      const endpoint = `/v2/chains/${chainId}/vendors/${vendorId}/catalog`;
      const url = `${apiBaseUrl}${endpoint}`;

      const body: BulkUpdateRequest = {
        products: [
          {
            id: sku,
            price: priceInDH,
            available: isActive,
          },
        ],
      };

      console.log(`📤 Sending update to Glovo:`, { url, body });

      const response = await this.makeRequest(url, accessToken, {
        method: "PUT",
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error(`❌ Glovo API error:`, {
          status: response.status,
          error: errorData,
        });
        return {
          success: false,
          error: `Glovo API error: ${response.status} - ${JSON.stringify(errorData)}`,
        };
      }

      const result: BulkUpdateResponse = await response.json();

      // Update lastSyncedAt in database
      await prisma.product.update({
        where: {
          storeId_sku: {
            storeId,
            sku,
          },
        },
        data: {
          lastSyncedAt: new Date(),
        },
      });

      console.log(`✅ Product synced successfully:`, result);

      return {
        success: true,
        transactionId: result.transaction_id,
      };
    } catch (error) {
      console.error(`💥 Error syncing product:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Sync multiple products at once (bulk update)
   * @param storeId - Store ID in our database
   * @param products - Array of products to sync
   */
  async syncProducts(
    storeId: string,
    products: Array<{
      sku: string;
      priceInCentimes?: number;
      isActive?: boolean;
    }>
  ): Promise<{ success: boolean; transactionId?: string; error?: string }> {
    try {
      console.log(`🔄 Syncing ${products.length} products in store ${storeId}`);

      // Get credentials from database
      const { chainId, vendorId, accessToken, apiBaseUrl } =
        await this.getStoreCredentials(storeId);

      // Build request
      const endpoint = `/v2/chains/${chainId}/vendors/${vendorId}/catalog`;
      const url = `${apiBaseUrl}${endpoint}`;

      const glovoProducts: GlovoProduct[] = products.map((p) => {
        const glovoProduct: GlovoProduct = { id: p.sku };

        if (p.priceInCentimes !== undefined) {
          glovoProduct.price = p.priceInCentimes / 100; // Convert to DH
        }

        if (p.isActive !== undefined) {
          glovoProduct.available = p.isActive;
        }

        return glovoProduct;
      });

      const body: BulkUpdateRequest = {
        products: glovoProducts,
      };

      console.log(`📤 Sending bulk update to Glovo:`, {
        url,
        productCount: glovoProducts.length,
      });

      const response = await this.makeRequest(url, accessToken, {
        method: "PUT",
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error(`❌ Glovo API error:`, {
          status: response.status,
          error: errorData,
        });
        return {
          success: false,
          error: `Glovo API error: ${response.status} - ${JSON.stringify(errorData)}`,
        };
      }

      const result: BulkUpdateResponse = await response.json();

      // Update lastSyncedAt for all products in database
      await Promise.all(
        products.map((p) =>
          prisma.product.update({
            where: {
              storeId_sku: {
                storeId,
                sku: p.sku,
              },
            },
            data: {
              lastSyncedAt: new Date(),
            },
          })
        )
      );

      console.log(`✅ ${products.length} products synced successfully:`, result);

      return {
        success: true,
        transactionId: result.transaction_id,
      };
    } catch (error) {
      console.error(`💥 Error syncing products:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Check the status of a bulk update transaction
   * @param storeId - Store ID in our database
   * @param transactionId - Transaction ID from Glovo
   */
  async checkSyncStatus(
    storeId: string,
    transactionId: string
  ): Promise<{ success: boolean; status?: BulkUpdateStatus; error?: string }> {
    try {
      // Get credentials from database
      const { chainId, vendorId, accessToken, apiBaseUrl } =
        await this.getStoreCredentials(storeId);

      // Build request
      const endpoint = `/v2/chains/${chainId}/vendors/${vendorId}/catalog/updates/${transactionId}`;
      const url = `${apiBaseUrl}${endpoint}`;

      console.log(`🔍 Checking sync status:`, { transactionId, url });

      const response = await this.makeRequest(url, accessToken, {
        method: "GET",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error(`❌ Glovo API error:`, {
          status: response.status,
          error: errorData,
        });
        return {
          success: false,
          error: `Glovo API error: ${response.status} - ${JSON.stringify(errorData)}`,
        };
      }

      const status: BulkUpdateStatus = await response.json();

      console.log(`✅ Sync status retrieved:`, status);

      return {
        success: true,
        status,
      };
    } catch (error) {
      console.error(`💥 Error checking sync status:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}

// Export singleton instance
export const glovoProductSyncService = new GlovoProductSyncService();
