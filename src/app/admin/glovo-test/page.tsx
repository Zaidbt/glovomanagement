"use client";

import { useState } from "react";

export default function GlovoTestPage() {
  const [productId, setProductId] = useState("NAT001");
  const [price, setPrice] = useState("25.20");
  const [available, setAvailable] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);

  const handleBulkUpdate = async () => {
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/glovo/menu/bulk-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          products: [
            {
              id: productId,
              price: parseFloat(price),
              available: available,
            },
          ],
          waitForCompletion: true,
        }),
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({ error: error instanceof Error ? error.message : "Unknown error" });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateAvailability = async () => {
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/glovo/menu/update-availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: productId,
          available: available,
        }),
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({ error: error instanceof Error ? error.message : "Unknown error" });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePrice = async () => {
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/glovo/menu/update-price", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: productId,
          price: parseFloat(price),
        }),
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({ error: error instanceof Error ? error.message : "Unknown error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Glovo Products - Test Interface</h1>
        <p className="text-gray-600">
          ⚠️ This is a TEST interface for the Glovo Stage environment only.
        </p>
        <p className="text-sm text-gray-500 mt-2">
          Using: Store ID: <code className="bg-gray-100 px-2 py-1 rounded">store-01</code> |
          Token: <code className="bg-gray-100 px-2 py-1 rounded">8b97...052a</code> (Stage)
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Product Details</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Product ID</label>
            <input
              type="text"
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              className="w-full border rounded-md px-3 py-2"
              placeholder="e.g., NAT001"
            />
            <p className="text-xs text-gray-500 mt-1">
              Use your actual product IDs (NAT001, NAT002, etc.)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Price (€)</label>
            <input
              type="number"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full border rounded-md px-3 py-2"
              placeholder="25.20"
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="available"
              checked={available}
              onChange={(e) => setAvailable(e.target.checked)}
              className="mr-2"
            />
            <label htmlFor="available" className="text-sm font-medium">
              Available (In Stock)
            </label>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Actions</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={handleBulkUpdate}
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading ? "Loading..." : "Bulk Update (Price + Availability)"}
          </button>

          <button
            onClick={handleUpdateAvailability}
            disabled={loading}
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:bg-gray-400"
          >
            {loading ? "Loading..." : "Update Availability Only"}
          </button>

          <button
            onClick={handleUpdatePrice}
            disabled={loading}
            className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 disabled:bg-gray-400"
          >
            {loading ? "Loading..." : "Update Price Only"}
          </button>
        </div>

        <div className="mt-4 text-sm text-gray-600">
          <p className="font-semibold mb-2">What each button does:</p>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Bulk Update</strong>: Updates both price and availability at once</li>
            <li><strong>Update Availability</strong>: Only updates if product is in stock or not</li>
            <li><strong>Update Price</strong>: Only updates the price</li>
          </ul>
        </div>
      </div>

      {result && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">
            {result.success ? "✅ Success" : "❌ Error"}
          </h2>

          <div className="bg-gray-50 rounded-md p-4 overflow-auto">
            <pre className="text-sm">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>

          {(result.success && result.status === "SUCCESS") ? (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
              <p className="text-green-800 font-medium">
                ✅ Product updated successfully in Glovo!
              </p>
              {result.details && Array.isArray(result.details) ? (
                <p className="text-sm text-green-700 mt-1">
                  {(result.details as string[]).join(", ")}
                </p>
              ) : null}
            </div>
          ) : null}

          {result.success === false ? (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-800 font-medium">❌ Update failed</p>
              <p className="text-sm text-red-700 mt-1">
                {String(result.message || result.error || "Unknown error")}
              </p>
            </div>
          ) : null}
        </div>
      )}

      <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <h3 className="font-semibold text-yellow-800 mb-2">⚠️ Important Notes</h3>
        <ul className="text-sm text-yellow-700 space-y-1 list-disc list-inside">
          <li>This interface uses hardcoded Stage credentials (test only)</li>
          <li>Product IDs must already exist in Glovo (e.g., from your Excel upload)</li>
          <li>You can only UPDATE products, not create new ones via API</li>
          <li>Check https://testglovo.com/es/en/barcelona/natura-beldi-ma-test/ to verify changes</li>
          <li>For production, credentials should come from database, not hardcoded</li>
        </ul>
      </div>

      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-blue-800 mb-2">📚 API Documentation</h3>
        <p className="text-sm text-blue-700 mb-2">
          For more details, see the full API documentation:
        </p>
        <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
          <li>GLOVO_PARTNERS_API.md - Complete API guide</li>
          <li>DEPLOYMENT_CHECKLIST.md - Setup and deployment info</li>
        </ul>
      </div>
    </div>
  );
}
