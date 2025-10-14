"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Truck,
  Key,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  ExternalLink,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface GlovoCredential {
  id: string;
  name: string;
  instanceName: string;
  isActive: boolean;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: Date;
  lastUpdated?: Date;
}

interface GlovoCredentialsManagerProps {
  credentials: GlovoCredential[];
  onRefresh: () => void;
}

export function GlovoCredentialsManager({
  credentials,
  onRefresh,
}: GlovoCredentialsManagerProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [tokenStatus, setTokenStatus] = useState<
    Record<string, Record<string, unknown>>
  >({});
  const { toast } = useToast();

  // Charger le statut des tokens
  useEffect(() => {
    credentials.forEach(async (cred) => {
      if (cred.id) {
        try {
          const response = await fetch("/api/glovo/token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ credentialId: cred.id }),
          });

          if (response.ok) {
            const data = await response.json();
            setTokenStatus((prev) => ({
              ...prev,
              [cred.id]: data.status,
            }));
          } else {
            // Si l'API n'est pas disponible, utiliser les données locales
            setTokenStatus((prev) => ({
              ...prev,
              [cred.id]: {
                hasValidToken: false,
                message: "Service non disponible",
              },
            }));
          }
        } catch (error) {
          console.error("Erreur chargement statut token:", error);
          setTokenStatus((prev) => ({
            ...prev,
            [cred.id]: {
              hasValidToken: false,
              message: "Erreur de connexion",
            },
          }));
        }
      }
    });
  }, [credentials]);

  const handleRefreshToken = async (credentialId: string) => {
    setLoading(credentialId);
    try {
      const response = await fetch("/api/glovo/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credentialId }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Token renouvelé",
          description: "Le token Glovo a été renouvelé avec succès",
        });

        // Mettre à jour le statut
        setTokenStatus((prev) => ({
          ...prev,
          [credentialId]: data.status,
        }));

        onRefresh();
      } else {
        toast({
          title: "Erreur",
          description: data.message,
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Erreur",
        description: "Erreur lors du renouvellement du token",
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  const handleTestConnection = async (credentialId: string) => {
    setLoading(credentialId);
    try {
      const response = await fetch("/api/glovo/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credentialId }),
      });

      const data = await response.json();

      toast({
        title: data.success ? "Test réussi" : "Test échoué",
        description: data.message,
        variant: data.success ? "default" : "destructive",
      });
    } catch {
      toast({
        title: "Erreur",
        description: "Erreur lors du test de connexion",
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  const getTokenStatus = (credential: GlovoCredential) => {
    const status = tokenStatus[credential.id];
    if (!status) return { valid: false, message: "Chargement..." };

    if (status.hasValidToken) {
      const expiresAt = new Date(status.expiresAt as string);
      const timeLeft = Math.max(0, expiresAt.getTime() - Date.now());
      const minutesLeft = Math.floor(timeLeft / (1000 * 60));

      return {
        valid: true,
        message: `Valide (${minutesLeft}min restantes)`,
        expiresAt: expiresAt,
      };
    }

    return { valid: false, message: "Token expiré ou invalide" };
  };

  if (credentials.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Truck className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-600 mb-2">
            Aucune configuration Glovo
          </h3>
          <p className="text-gray-500">
            Configurez vos credentials Glovo pour commencer à recevoir les
            commandes
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {credentials.map((credential) => {
        const tokenStatus = getTokenStatus(credential);

        return (
          <Card key={credential.id} className="border-l-4 border-l-blue-500">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Truck className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{credential.name}</CardTitle>
                    <p className="text-sm text-gray-600">
                      {credential.instanceName}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge
                    variant={credential.isActive ? "default" : "secondary"}
                    className={
                      credential.isActive ? "bg-green-100 text-green-800" : ""
                    }
                  >
                    {credential.isActive ? "Actif" : "Inactif"}
                  </Badge>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Statut du Token */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  {tokenStatus.valid ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                  <span className="text-sm font-medium">
                    Token OAuth: {tokenStatus.message}
                  </span>
                </div>

                {tokenStatus.expiresAt && (
                  <div className="flex items-center space-x-1 text-xs text-gray-500">
                    <Clock className="h-3 w-3" />
                    <span>
                      Expire: {tokenStatus.expiresAt.toLocaleString()}
                    </span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex space-x-2">
                <Button
                  onClick={() => handleTestConnection(credential.id)}
                  disabled={loading === credential.id}
                  variant="outline"
                  size="sm"
                  className="flex-1"
                >
                  {loading === credential.id ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Key className="h-4 w-4 mr-2" />
                  )}
                  Tester
                </Button>

                <Button
                  onClick={() => handleRefreshToken(credential.id)}
                  disabled={loading === credential.id}
                  variant="outline"
                  size="sm"
                  className="flex-1"
                >
                  {loading === credential.id ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Renouveler
                </Button>
              </div>

              {/* Informations supplémentaires */}
              {credential.lastUpdated && (
                <div className="text-xs text-gray-500">
                  Dernière mise à jour:{" "}
                  {new Date(credential.lastUpdated).toLocaleString()}
                </div>
              )}

              {/* Webhook URL */}
              <div className="flex items-center space-x-2 text-xs text-gray-600">
                <ExternalLink className="h-3 w-3" />
                <span>Webhook: /api/webhooks/glovo/orders</span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
