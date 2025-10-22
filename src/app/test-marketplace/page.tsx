"use client";

import { useState } from "react";

export default function TestMarketplacePage() {
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [orderId, setOrderId] = useState("WAERRTR3J");

  const testAcceptOrder = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/glovo/marketplace/accept-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orderId: orderId,
          chainId: "c37f3594-6c99-4447-b947-a438d946b0e3", // Your chain ID
          vendorId: "588581", // Your vendor ID
        }),
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
    setLoading(false);
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Test Glovo Marketplace API</h1>

      <div className="bg-blue-50 p-6 rounded-lg mb-6">
        <h2 className="text-xl font-semibold mb-4">Accept Order Test</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Order ID:</label>
            <input
              type="text"
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="WAERRTR3J"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <strong>Chain ID:</strong> c37f3594-6c99-4447-b947-a438d946b0e3
            </div>
            <div>
              <strong>Vendor ID:</strong> 588581
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={testAcceptOrder}
        disabled={loading}
        className="bg-green-500 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Accepting Order..." : "Accept Order"}
      </button>

      {result && (
        <div className="mt-8 p-6 bg-gray-50 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">API Response:</h2>
          <pre className="text-sm whitespace-pre-wrap bg-white p-4 rounded border overflow-auto max-h-96">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}

      <div className="mt-8 p-6 bg-yellow-50 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">📋 Instructions:</h2>
        <ol className="list-decimal list-inside space-y-2 text-sm">
          <li>
            Make sure you have configured your Glovo credentials in the admin
            panel
          </li>
          <li>Enter the order ID you want to accept</li>
          <li>Click &quot;Accept Order&quot; to test the Marketplace API</li>
          <li>
            Check the response to see if the order was accepted successfully
          </li>
        </ol>
      </div>
    </div>
  );
}
