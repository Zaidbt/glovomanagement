"use client";

import { useState } from "react";

export default function TestN8NPage() {
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);

  const testN8N = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/test-n8n", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orderCode: "FLOW-224205",
          phone: "+212642310581",
          complaint: "My order is late, where is it?",
        }),
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({ error: error instanceof Error ? error.message : "Unknown error" });
    }
    setLoading(false);
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Test N8N Workflow</h1>

      <div className="bg-gray-100 p-4 rounded-lg mb-6">
        <h2 className="font-semibold mb-2">Test Data:</h2>
        <pre className="text-sm">
          {`{
  "orderCode": "FLOW-224205",
  "phone": "+212642310581",
  "complaint": "My order is late, where is it?"
}`}
        </pre>
      </div>

      <button
        onClick={testN8N}
        disabled={loading}
        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
      >
        {loading ? "Testing..." : "Test N8N Workflow"}
      </button>

      {result && (
        <div className="mt-6">
          <h3 className="font-semibold mb-2">Result:</h3>
          <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
