"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, CheckCircle, XCircle, Clock } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface TokenRefreshButtonProps {
  credentialId: string;
  serviceType: string;
  instanceName: string;
  onRefresh?: () => void;
}

export function TokenRefreshButton({
  credentialId,
  serviceType,
  instanceName,
  onRefresh,
}: TokenRefreshButtonProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const { toast } = useToast();

  const handleRefresh = async () => {
    setIsRefreshing(true);

    try {
      const response = await fetch("/api/tokens/refresh", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          credentialId,
          serviceType,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setLastRefresh(new Date());
        toast({
          title: "Token rafraîchi",
          description: `Token ${instanceName} renouvelé avec succès`,
        });

        if (onRefresh) {
          onRefresh();
        }
      } else {
        throw new Error(result.message || "Erreur lors du rafraîchissement");
      }
    } catch (error) {
      console.error("Error refreshing token:", error);
      toast({
        title: "Erreur",
        description: `Impossible de rafraîchir le token ${instanceName}`,
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        onClick={handleRefresh}
        disabled={isRefreshing}
        variant="outline"
        size="sm"
        className="text-xs"
      >
        {isRefreshing ? (
          <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
        ) : (
          <RefreshCw className="h-3 w-3 mr-1" />
        )}
        {isRefreshing ? "Rafraîchissement..." : "Rafraîchir"}
      </Button>

      {lastRefresh && (
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <CheckCircle className="h-3 w-3" />
          <span>Renouvelé {lastRefresh.toLocaleTimeString()}</span>
        </div>
      )}
    </div>
  );
}

interface TokenStatusIndicatorProps {
  credentialId: string;
  serviceType: string;
  instanceName: string;
}

export function TokenStatusIndicator({
  credentialId,
}: TokenStatusIndicatorProps) {
  const [status, setStatus] = useState<{
    isValid: boolean;
    expiresAt?: Date;
    needsRefresh: boolean;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkStatus = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/tokens/status/${credentialId}`);
      const result = await response.json();
      setStatus(result);
    } catch (error) {
      console.error("Error checking token status:", error);
    } finally {
      setIsLoading(false);
    }
  }, [credentialId]);

  // Vérifier le statut au montage
  useEffect(() => {
    checkStatus();
  }, [credentialId, checkStatus]);

  if (isLoading) {
    return (
      <div className="flex items-center gap-1 text-xs text-gray-500">
        <Clock className="h-3 w-3 animate-pulse" />
        <span>Vérification...</span>
      </div>
    );
  }

  if (!status) {
    return (
      <div className="flex items-center gap-1 text-xs text-gray-500">
        <XCircle className="h-3 w-3" />
        <span>Statut inconnu</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 text-xs">
      {status.isValid ? (
        <>
          <CheckCircle className="h-3 w-3 text-green-500" />
          <span className="text-green-600">
            Valide
            {status.expiresAt && (
              <span className="text-gray-500 ml-1">
                (expire {status.expiresAt.toLocaleDateString()})
              </span>
            )}
          </span>
        </>
      ) : (
        <>
          <XCircle className="h-3 w-3 text-red-500" />
          <span className="text-red-600">
            {status.needsRefresh ? "Expire bientôt" : "Expiré"}
          </span>
        </>
      )}
    </div>
  );
}
