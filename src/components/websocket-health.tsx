"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wifi, WifiOff, AlertTriangle, Users } from "lucide-react";

interface WebSocketHealth {
  status: string;
  healthy: boolean;
  connections?: number;
  rooms?: Record<string, number>;
  timestamp?: string;
  message?: string;
}

export default function WebSocketHealthWidget() {
  const [health, setHealth] = useState<WebSocketHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastCheck, setLastCheck] = useState<Date>(new Date());

  const checkHealth = async () => {
    try {
      const response = await fetch("/api/websocket/health");
      const data = await response.json();
      setHealth(data);
      setLastCheck(new Date());
    } catch (error) {
      console.error("WebSocket health check failed:", error);
      setHealth({
        status: "error",
        healthy: false,
        message: "Cannot connect to health endpoint",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Check immediately
    checkHealth();

    // Check every 10 seconds
    const interval = setInterval(checkHealth, 10000);

    return () => clearInterval(interval);
  }, []);

  const getStatusColor = () => {
    if (!health) return "text-gray-400";
    if (health.healthy) return "text-green-600";
    return "text-red-600";
  };

  const getStatusBg = () => {
    if (!health) return "bg-gray-100";
    if (health.healthy) return "bg-green-50";
    return "bg-red-50";
  };

  const getStatusIcon = () => {
    if (!health) return <WifiOff className="w-6 h-6 text-gray-400" />;
    if (health.healthy)
      return <Wifi className="w-6 h-6 text-green-600" />;
    return <AlertTriangle className="w-6 h-6 text-red-600" />;
  };

  return (
    <Card className="border-2">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            {getStatusIcon()}
            WebSocket Status
          </CardTitle>
          {health?.healthy ? (
            <Badge className="bg-green-600">Live</Badge>
          ) : (
            <Badge variant="destructive">Offline</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Status */}
            <div className={`p-3 rounded-lg ${getStatusBg()}`}>
              <p className={`font-semibold ${getStatusColor()}`}>
                {health?.healthy
                  ? "✅ WebSocket server running"
                  : "❌ WebSocket server offline"}
              </p>
              {health?.message && (
                <p className="text-sm text-gray-600 mt-1">{health.message}</p>
              )}
            </div>

            {/* Connections */}
            {health?.healthy && (
              <>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-gray-600" />
                    <span className="text-sm font-medium">
                      Active Connections
                    </span>
                  </div>
                  <span className="text-lg font-bold text-green-600">
                    {health.connections || 0}
                  </span>
                </div>

                {/* Rooms */}
                {health.rooms && Object.keys(health.rooms).length > 0 && (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm font-medium mb-2">Active Rooms:</p>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {Object.entries(health.rooms).map(([room, count]) => (
                        <div
                          key={room}
                          className="flex justify-between text-xs"
                        >
                          <span className="text-gray-600 truncate">
                            {room}
                          </span>
                          <span className="font-semibold text-gray-900">
                            {count}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Critical Warning */}
            {!health?.healthy && (
              <div className="p-3 bg-red-50 border-2 border-red-300 rounded-lg">
                <p className="text-sm font-bold text-red-900 mb-1">
                  ⚠️ CRITIQUE
                </p>
                <p className="text-xs text-red-700">
                  Les notifications en temps réel ne fonctionnent pas. Les
                  fournisseurs et collaborateurs ne recevront pas les mises à
                  jour instantanées. Vérifiez les logs serveur.
                </p>
              </div>
            )}

            {/* Last Check */}
            <div className="text-xs text-gray-500 text-center">
              Dernière vérification:{" "}
              {lastCheck.toLocaleTimeString("fr-FR")}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
