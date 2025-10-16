"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Trash2, CheckCircle, XCircle } from "lucide-react";

export default function CleanupPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const runCleanup = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/admin/cleanup-stores", {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to cleanup stores");
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trash2 className="h-6 w-6" />
            Store Cleanup Tool
          </CardTitle>
          <CardDescription>
            Consolidate all orders to the main store and remove duplicate/test stores
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertDescription>
              <strong>⚠️ Warning:</strong> This will:
              <ul className="list-disc ml-6 mt-2 space-y-1">
                <li>Move all orders from test stores to your main store</li>
                <li>Delete all duplicate and test stores</li>
                <li>Update your main store's Glovo Store ID to "store-01"</li>
              </ul>
            </AlertDescription>
          </Alert>

          <Button
            onClick={runCleanup}
            disabled={loading}
            size="lg"
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Running Cleanup...
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                Run Store Cleanup
              </>
            )}
          </Button>

          {error && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Error:</strong> {error}
              </AlertDescription>
            </Alert>
          )}

          {result && result.success && (
            <Alert className="border-green-500 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-semibold text-green-800">
                    ✅ Cleanup completed successfully!
                  </p>
                  <div className="text-sm space-y-1">
                    <p>
                      <strong>Main Store:</strong> {result.operations.mainStore.name}
                    </p>
                    <p>
                      <strong>Orders Before:</strong> {result.operations.mainStore.ordersBefore}
                    </p>
                    <p>
                      <strong>Orders After:</strong> {result.operations.mainStore.ordersAfter}
                    </p>
                    <p>
                      <strong>Orders Moved:</strong> {result.operations.totalOrdersMoved}
                    </p>
                    <p>
                      <strong>Stores Removed:</strong> {result.operations.testStoresRemoved.length}
                    </p>
                  </div>
                  {result.operations.testStoresRemoved.length > 0 && (
                    <div className="mt-3">
                      <p className="font-medium mb-1">Removed Stores:</p>
                      <ul className="list-disc ml-6 text-sm">
                        {result.operations.testStoresRemoved.map((store: any) => (
                          <li key={store.id}>
                            {store.name} ({store.ordersMoved} orders moved)
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
