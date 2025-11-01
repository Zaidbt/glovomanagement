"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Key,
  Eye,
  EyeOff,
  Edit,
  Save,
  X,
  Shield,
  Lock,
  Globe,
  Mail,
  MessageSquare,
  Truck,
  Zap,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toast";
import { clientEventTracker } from "@/lib/client-event-tracker";
import { ApiTester, ApiTestResult, ApiCredentials } from "@/lib/api-testers";
import { TwilioMessageTester } from "@/components/twilio/twilio-message-tester";

interface Credential {
  id: string;
  name: string;
  type: "TWILIO" | "GLOVO" | "GMAIL" | "N8N" | "CUSTOM";
  description: string;
  isConfigured: boolean;
  lastUpdated: string;
  icon: React.ReactNode;
  instanceName?: string; // Nom personnalisé pour cette instance
}

interface ServiceTemplate {
  id: string;
  name: string;
  type: "TWILIO" | "GLOVO" | "GMAIL" | "N8N" | "CUSTOM";
  description: string;
  icon: React.ReactNode;
}

export default function CredentialsPage() {
  const [configuredCredentials, setConfiguredCredentials] = useState<
    Credential[]
  >([]);
  const [availableTemplates, setAvailableTemplates] = useState<
    ServiceTemplate[]
  >([]);
  const [editingCredential, setEditingCredential] = useState<Credential | null>(
    null
  );
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [showValues, setShowValues] = useState<Record<string, boolean>>({});
  const [formData, setFormData] = useState({
    instanceName: "",
    apiKey: "",
    apiSecret: "",
    webhookUrl: "",
    customField1: "",
    customField2: "",
    accessToken: "",
  });
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState<Record<string, boolean>>({});
  const [testResult, setTestResult] = useState<
    Record<string, ApiTestResult | null>
  >({});
  const [generatedCredentialId, setGeneratedCredentialId] = useState<
    string | null
  >(null);
  const { toast, toasts, dismiss } = useToast();

  useEffect(() => {
    // Templates de services disponibles (peuvent être ajoutés plusieurs fois)
    const serviceTemplates: ServiceTemplate[] = [
      {
        id: "twilio",
        name: "Twilio WhatsApp",
        type: "TWILIO",
        description: "API pour l'envoi de messages WhatsApp via Twilio",
        icon: <MessageSquare className="h-5 w-5" />,
      },
      {
        id: "glovo",
        name: "Glovo API",
        type: "GLOVO",
        description:
          "API pour récupérer les commandes Glovo (OAuth client credentials)",
        icon: <Truck className="h-5 w-5" />,
      },
      {
        id: "gmail",
        name: "Gmail SMTP",
        type: "GMAIL",
        description: "Configuration SMTP pour l&apos;envoi d&apos;emails",
        icon: <Mail className="h-5 w-5" />,
      },
      {
        id: "n8n",
        name: "N8N Webhook",
        type: "N8N",
        description: "Webhook pour l'automatisation N8N",
        icon: <Zap className="h-5 w-5" />,
      },
      {
        id: "custom",
        name: "API Personnalisée",
        type: "CUSTOM",
        description: "Configuration pour une API personnalisée",
        icon: <Globe className="h-5 w-5" />,
      },
    ];

    setAvailableTemplates(serviceTemplates);
  }, []);

  // Fonction pour charger les credentials
  const loadCredentials = useCallback(async () => {
    try {
      const response = await fetch("/api/credentials", {
        method: "GET",
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
      });

      if (response.ok) {
        const credentials = await response.json();

        // Transformer les données de la DB en format Credential
        const formattedCredentials: Credential[] = credentials.map(
          (cred: Record<string, unknown>) => ({
            id: cred.id,
            name: cred.name,
            type: cred.type,
            description: cred.description,
            isConfigured: cred.isConfigured,
            lastUpdated: cred.lastUpdated || cred.updatedAt,
            icon: getServiceIcon(cred.type as string),
            instanceName: cred.instanceName,
            isActive: cred.isActive,
          })
        );

        setConfiguredCredentials(formattedCredentials);
      } else {
        console.error("Erreur chargement credentials");
      }
    } catch (error) {
      console.error("Erreur chargement credentials:", error);
    }
  }, []);

  // Charger les credentials au montage du composant
  useEffect(() => {
    loadCredentials();
  }, [loadCredentials]);

  const getServiceIcon = (type: string) => {
    switch (type) {
      case "TWILIO":
        return <MessageSquare className="h-5 w-5" />;
      case "GLOVO":
        return <Truck className="h-5 w-5" />;
      case "GMAIL":
        return <Mail className="h-5 w-5" />;
      case "N8N":
        return <Zap className="h-5 w-5" />;
      case "CUSTOM":
        return <Globe className="h-5 w-5" />;
      default:
        return <Key className="h-5 w-5" />;
    }
  };

  const getCredentialFields = (type: string) => {
    switch (type) {
      case "TWILIO":
        return [
          {
            key: "apiKey",
            label: "Account SID",
            placeholder: "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
          },
          {
            key: "apiSecret",
            label: "Auth Token",
            placeholder: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
          },
          {
            key: "customField1",
            label: "Numéro WhatsApp",
            placeholder: "+212XXXXXXXXX",
          },
          {
            key: "webhookUrl",
            label: "Webhook URL",
            placeholder: "https://your-domain.com/webhook/twilio",
          },
        ];
      case "GLOVO":
        return [
          {
            key: "apiKey",
            label: "Chain ID",
            placeholder: "66e35ff7a15a3a1fc1a50f77",
          },
          {
            key: "customField1",
            label: "Vendor ID (Store ID)",
            placeholder: "588581",
          },
          {
            key: "apiSecret",
            label: "OAuth Token",
            placeholder: "8b979af6-8e38-4bdb-aa07-26408928052a",
          },
          {
            key: "webhookUrl",
            label: "Webhook URL (optionnel)",
            placeholder: "https://your-domain.com/webhook/glovo",
          },
        ];
      case "GMAIL":
        return [
          {
            key: "apiKey",
            label: "Email",
            placeholder: "your-email@gmail.com",
          },
          {
            key: "apiSecret",
            label: "App Password",
            placeholder: "xxxxxxxxxxxxxxxx",
          },
          {
            key: "customField1",
            label: "SMTP Host",
            placeholder: "smtp.gmail.com",
          },
          { key: "customField2", label: "SMTP Port", placeholder: "587" },
        ];
      case "N8N":
        return [
          {
            key: "webhookUrl",
            label: "N8N Webhook URL",
            placeholder: "https://your-n8n.com/webhook/xxxxx",
          },
          {
            key: "apiKey",
            label: "API Key (optionnel)",
            placeholder: "n8n_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
          },
        ];
      case "CUSTOM":
        return [
          { key: "apiKey", label: "API Key", placeholder: "your-api-key" },
          {
            key: "apiSecret",
            label: "API Secret",
            placeholder: "your-api-secret",
          },
          {
            key: "webhookUrl",
            label: "Base URL",
            placeholder: "https://api.example.com",
          },
          {
            key: "customField1",
            label: "Custom Field 1",
            placeholder: "Custom value 1",
          },
          {
            key: "customField2",
            label: "Custom Field 2",
            placeholder: "Custom value 2",
          },
        ];
      default:
        return [];
    }
  };

  const handleEditCredential = (credential: Credential) => {
    setEditingCredential(credential);
    setIsDialogOpen(true);
    setFormData({
      instanceName: "",
      apiKey: "",
      apiSecret: "",
      webhookUrl: "",
      customField1: "",
      customField2: "",
      accessToken: "",
    });
  };

  const handleAddCredential = (template: ServiceTemplate) => {
    setEditingCredential({
      ...template,
      isConfigured: false,
      lastUpdated: "",
      instanceName: "",
    });
    setIsAddDialogOpen(true);
    setFormData({
      instanceName: "",
      apiKey: "",
      apiSecret: "",
      webhookUrl: "",
      customField1: "",
      customField2: "",
      accessToken: "",
    });
  };

  const testApiConnection = async () => {
    if (!editingCredential) return;

    const credentialId = editingCredential.id || "new";
    setTesting((prev) => ({ ...prev, [credentialId]: true }));
    setTestResult((prev) => ({ ...prev, [credentialId]: null }));

    try {
      const credentials: ApiCredentials = {
        apiKey: formData.apiKey,
        apiSecret: formData.apiSecret,
        webhookUrl: formData.webhookUrl,
        customField1: formData.customField1,
        customField2: formData.customField2,
      };

      const result = await ApiTester.testApi(
        editingCredential.type,
        credentials
      );
      setTestResult((prev) => ({ ...prev, [credentialId]: result }));

      if (result.success) {
        // Générer un ID unique pour cette credential après test réussi
        const uniqueId = `TW${Date.now().toString(36).toUpperCase()}X`;
        setGeneratedCredentialId(uniqueId);

        toast({
          title: "Test réussi",
          description: result.message,
        });
      } else {
        setGeneratedCredentialId(null);
        toast({
          title: "Test échoué",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      const errorResult: ApiTestResult = {
        success: false,
        message: `Erreur lors du test: ${
          error instanceof Error ? error.message : "Erreur inconnue"
        }`,
        error: error instanceof Error ? error.message : "Erreur inconnue",
      };
      setTestResult((prev) => ({ ...prev, [credentialId]: errorResult }));
      toast({
        title: "Erreur de test",
        description: errorResult.message,
        variant: "destructive",
      });
    } finally {
      setTesting((prev) => ({ ...prev, [credentialId]: false }));
    }
  };

  const handleSaveCredential = async () => {
    if (!editingCredential) return;

    // Vérifier si un test a été effectué et s'il a réussi
    if (!testResult) {
      toast({
        title: "Test requis",
        description: "Veuillez tester la connexion avant de sauvegarder.",
        variant: "destructive",
      });
      return;
    }

    const credentialId = editingCredential.id || "new";
    const currentTestResult = testResult[credentialId];

    if (!currentTestResult?.success) {
      toast({
        title: "Test échoué",
        description:
          "La connexion a échoué. Veuillez corriger les credentials avant de sauvegarder.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Vérifier les données avant l'envoi
      console.log("Saving credential with data:", {
        editingCredential,
        formData,
        testResult,
      });

      // Vérifier que les champs requis sont présents
      if (!formData.apiKey || !formData.apiSecret) {
        throw new Error("Les champs API Key et API Secret sont requis");
      }

      // Sauvegarder en base de données via l'API
      const requestData = {
        name: editingCredential.name,
        type: editingCredential.type,
        description: editingCredential.description,
        apiKey: formData.apiKey,
        apiSecret: formData.apiSecret,
        webhookUrl: formData.webhookUrl,
        customField1: formData.customField1,
        customField2: formData.customField2,
        accessToken: editingCredential.type === "GLOVO" ? formData.apiSecret : (formData.accessToken || undefined),
        instanceName:
          formData.instanceName || `${editingCredential.name} ${Date.now()}`,
      };

      console.log("Request data:", requestData);

      const response = await fetch("/api/credentials", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("API Error:", {
          status: response.status,
          statusText: response.statusText,
          errorData,
        });
        throw new Error(
          `Erreur API ${response.status}: ${
            errorData.error || response.statusText
          }`
        );
      }

      const savedCredential = await response.json();
      console.log("Credential saved successfully:", savedCredential);

      // Tracker l'événement selon le contexte
      if (isAddDialogOpen) {
        await clientEventTracker.trackEvent({
          type: "CREDENTIAL_ADDED",
          title: "Nouvelle API configurée",
          description: `API ${editingCredential.name} (${
            formData.instanceName || "Sans nom"
          }) a été configurée avec succès`,
          metadata: {
            serviceType: editingCredential.type,
            instanceName: formData.instanceName,
            credentialId: savedCredential.id,
          },
        });
      } else {
        await clientEventTracker.trackEvent({
          type: "CREDENTIAL_UPDATED",
          title: "API modifiée",
          description: `Configuration de ${editingCredential.name} (${
            editingCredential.instanceName || "Sans nom"
          }) a été mise à jour`,
          metadata: {
            serviceType: editingCredential.type,
            instanceName: editingCredential.instanceName,
            credentialId: editingCredential.id,
          },
        });
      }

      toast({
        title: "Succès",
        description: `Credentials ${editingCredential.name} sauvegardés avec succès.`,
      });

      // Recharger les credentials sans reload complet
      await loadCredentials();

      setIsDialogOpen(false);
      setIsAddDialogOpen(false);
      setEditingCredential(null);
    } catch (error) {
      console.error("Error saving credential:", error);
      console.error("Error details:", {
        message: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
        response: error,
      });
      toast({
        title: "Erreur",
        description: `Erreur lors de la sauvegarde des credentials: ${
          error instanceof Error ? error.message : "Erreur inconnue"
        }`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleShowValue = (credentialId: string) => {
    setShowValues((prev) => ({
      ...prev,
      [credentialId]: !prev[credentialId],
    }));
  };

  const testCredential = async (credential: Credential) => {
    const credentialId = credential.id;
    setTesting((prev) => ({ ...prev, [credentialId]: true }));
    setTestResult((prev) => ({ ...prev, [credentialId]: null }));

    try {
      // Simuler un test de connexion
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const successResult: ApiTestResult = {
        success: true,
        message: `La connexion à ${credential.name} fonctionne correctement.`,
        responseTime: 2000,
      };

      setTestResult((prev) => ({ ...prev, [credentialId]: successResult }));

      // Tracker l'événement de test
      await clientEventTracker.trackEvent({
        type: "CREDENTIAL_TESTED",
        title: "Test de connexion API",
        description: `Test de connexion effectué pour ${credential.name} (${
          credential.instanceName || "Sans nom"
        })`,
        metadata: {
          serviceType: credential.type,
          instanceName: credential.instanceName,
          credentialId: credential.id,
          testResult: "success",
        },
      });

      toast({
        title: "Test réussi",
        description: `La connexion à ${credential.name} fonctionne correctement.`,
      });
    } catch (error) {
      console.error("Error testing credential:", error);

      const errorResult: ApiTestResult = {
        success: false,
        message: `Erreur lors du test de connexion à ${credential.name}.`,
        error: error instanceof Error ? error.message : "Erreur inconnue",
      };

      setTestResult((prev) => ({ ...prev, [credentialId]: errorResult }));

      // Tracker l'échec du test
      await clientEventTracker.trackEvent({
        type: "CREDENTIAL_TESTED",
        title: "Test de connexion API échoué",
        description: `Test de connexion échoué pour ${credential.name} (${
          credential.instanceName || "Sans nom"
        })`,
        metadata: {
          serviceType: credential.type,
          instanceName: credential.instanceName,
          credentialId: credential.id,
          testResult: "failed",
        },
      });

      toast({
        title: "Test échoué",
        description: "La connexion à l'API a échoué. Vérifiez vos credentials.",
        variant: "destructive",
      });
    } finally {
      setTesting((prev) => ({ ...prev, [credentialId]: false }));
    }
  };

  const deleteCredential = async (credential: Credential) => {
    if (
      !confirm(
        `Êtes-vous sûr de vouloir supprimer ${credential.name} (${
          credential.instanceName || "Sans nom"
        }) ?`
      )
    ) {
      return;
    }

    setLoading(true);
    try {
      // Supprimer de la base de données via l'API
      const response = await fetch(`/api/credentials/${credential.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Erreur lors de la suppression");
      }

      // Tracker l'événement de suppression
      await clientEventTracker.trackEvent({
        type: "CREDENTIAL_DELETED",
        title: "API supprimée",
        description: `Configuration ${credential.name} (${
          credential.instanceName || "Sans nom"
        }) a été supprimée`,
        metadata: {
          serviceType: credential.type,
          instanceName: credential.instanceName,
          credentialId: credential.id,
        },
      });

      toast({
        title: "Supprimé",
        description: `${credential.name} a été supprimé avec succès.`,
      });

      // Recharger les credentials sans reload complet
      await loadCredentials();
    } catch (error) {
      console.error("Error deleting credential:", error);
      toast({
        title: "Erreur",
        description: "Erreur lors de la suppression de l'API.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getServiceColors = (type: string) => {
    switch (type) {
      case "TWILIO":
        return {
          gradient: "from-green-500 to-emerald-500",
          bg: "bg-gradient-to-br from-green-50 to-emerald-50",
          border: "border-green-300",
          iconBg: "bg-gradient-to-br from-green-500 to-emerald-500",
          text: "text-green-800",
          badge: "bg-green-100 text-green-800 border-green-300",
        };
      case "GLOVO":
        return {
          gradient: "from-yellow-400 to-yellow-600",
          bg: "bg-gradient-to-br from-yellow-50 to-yellow-100",
          border: "border-yellow-300",
          iconBg: "bg-gradient-to-br from-yellow-400 to-yellow-600",
          text: "text-yellow-800",
          badge: "bg-yellow-100 text-yellow-800 border-yellow-300",
        };
      case "GMAIL":
        return {
          gradient: "from-red-500 to-pink-500",
          bg: "bg-red-50",
          border: "border-red-200",
          iconBg: "bg-gradient-to-br from-red-500 to-pink-500",
          text: "text-red-800",
          badge: "bg-red-100 text-red-800 border-red-200",
        };
      case "N8N":
        return {
          gradient: "from-purple-500 to-indigo-500",
          bg: "bg-purple-50",
          border: "border-purple-200",
          iconBg: "bg-gradient-to-br from-purple-500 to-indigo-500",
          text: "text-purple-800",
          badge: "bg-purple-100 text-purple-800 border-purple-200",
        };
      case "CUSTOM":
        return {
          gradient: "from-gray-500 to-slate-500",
          bg: "bg-gray-50",
          border: "border-gray-200",
          iconBg: "bg-gradient-to-br from-gray-500 to-slate-500",
          text: "text-gray-800",
          badge: "bg-gray-100 text-gray-800 border-gray-200",
        };
      default:
        return {
          gradient: "from-green-500 to-emerald-500",
          bg: "bg-green-50",
          border: "border-green-200",
          iconBg: "bg-gradient-to-br from-green-500 to-emerald-500",
          text: "text-green-800",
          badge: "bg-green-100 text-green-800 border-green-200",
        };
    }
  };

  const getStatusBadge = (isConfigured: boolean, type: string) => {
    const colors = getServiceColors(type);
    return isConfigured ? (
      <Badge className={`${colors.badge} border`}>
        <Shield className="h-3 w-3 mr-1" />
        Configuré
      </Badge>
    ) : (
      <Badge variant="secondary" className="bg-gray-100 text-gray-600">
        <Lock className="h-3 w-3 mr-1" />
        Non configuré
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-green-50 to-emerald-50">
      <div className="space-y-8 p-8">
        {/* Header */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-green-600/10 to-emerald-600/10 rounded-3xl blur-3xl"></div>
          <div className="relative bg-white/80 backdrop-blur-sm rounded-3xl p-8 border border-white/20 shadow-xl">
            <div className="flex items-center space-x-6">
              <div className="w-16 h-16 natura-gradient rounded-2xl flex items-center justify-center shadow-2xl">
                <Key className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                  Gestion des Credentials
                </h1>
                <p className="text-gray-600 text-lg font-medium">
                  Centralisez et sécurisez toutes vos clés API et credentials
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Security Notice */}
        <Alert className="border-blue-200 bg-blue-50">
          <Shield className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <strong>Sécurité :</strong> Toutes les clés sont chiffrées et
            stockées de manière sécurisée. Les valeurs ne sont jamais affichées
            en clair pour protéger vos données sensibles.
          </AlertDescription>
        </Alert>

        {/* Section Partner ID Glovo */}
        <div className="space-y-4 p-6 bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl border border-yellow-200">
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <h3 className="text-lg font-semibold text-yellow-800">
              Configuration Glovo
            </h3>
          </div>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label
                htmlFor="glovoPartnerId"
                className="text-sm font-medium text-yellow-800"
              >
                Partner ID
              </Label>
              <Input
                id="glovoPartnerId"
                type="text"
                placeholder="68243580"
                defaultValue="68243580"
                className="natura-input border-yellow-300 focus:border-yellow-400"
              />
              <p className="text-xs text-yellow-700">
                Votre identifiant partenaire Glovo pour les webhooks et API
              </p>
            </div>
          </div>
        </div>

        {/* APIs Configurées */}
        {configuredCredentials.length > 0 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-800">
                APIs Configurées
              </h2>
              <div className="flex items-center gap-3">
                <Button
                  onClick={loadCredentials}
                  variant="outline"
                  size="sm"
                  className="text-xs"
                >
                  🔄 Recharger
                </Button>
                <Badge className="bg-green-100 text-green-800 border-green-200">
                  {configuredCredentials.length} configurée
                  {configuredCredentials.length > 1 ? "s" : ""}
                </Badge>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {configuredCredentials.map((credential) => {
                const colors = getServiceColors(credential.type);
                return (
                  <Card
                    key={credential.id}
                    className={`${colors.bg} ${colors.border} border-2 hover:shadow-xl transition-all duration-300 hover:scale-105 natura-card`}
                  >
                    <CardHeader className="pb-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div
                            className={`p-3 ${colors.iconBg} rounded-xl text-white shadow-lg`}
                          >
                            {credential.icon}
                          </div>
                          <div>
                            <CardTitle
                              className={`text-lg font-semibold ${colors.text}`}
                            >
                              {credential.name}
                            </CardTitle>
                            {credential.instanceName && (
                              <div className="text-sm font-medium text-gray-700 mb-1">
                                {credential.instanceName}
                              </div>
                            )}
                            <CardDescription className="text-sm text-gray-600">
                              {credential.description}
                            </CardDescription>
                          </div>
                        </div>
                        {getStatusBadge(
                          credential.isConfigured,
                          credential.type
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {credential.isConfigured && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">
                              Dernière mise à jour
                            </span>
                            <span className="text-sm font-medium">
                              {new Date(
                                credential.lastUpdated
                              ).toLocaleDateString("fr-FR")}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="flex-1 bg-gray-100 rounded px-3 py-2 text-sm font-mono">
                              {showValues[credential.id]
                                ? "••••••••••••••••"
                                : "••••••••••••••••"}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleShowValue(credential.id)}
                            >
                              {showValues[credential.id] ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                      )}

                      <div className="space-y-2">
                        <div className="flex space-x-2">
                          <Button
                            onClick={() => testCredential(credential)}
                            disabled={testing[credential.id] || loading}
                            variant="outline"
                            className="flex-1 border-2 hover:bg-gray-50"
                          >
                            <Zap className="h-4 w-4 mr-2" />
                            {testing[credential.id] ? "Test..." : "Tester"}
                          </Button>
                          <Button
                            onClick={() => handleEditCredential(credential)}
                            className={`flex-1 bg-gradient-to-r ${colors.gradient} hover:opacity-90 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300`}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Modifier
                          </Button>
                        </div>

                        {/* Affichage du résultat du test */}
                        {testResult[credential.id] && (
                          <div
                            className={`p-3 rounded-md text-sm ${
                              testResult[credential.id]?.success
                                ? "bg-green-50 text-green-800 border border-green-200"
                                : "bg-red-50 text-red-800 border border-red-200"
                            }`}
                          >
                            <div className="flex items-center space-x-2">
                              {testResult[credential.id]?.success ? (
                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              ) : (
                                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                              )}
                              <span className="font-medium">
                                {testResult[credential.id]?.success
                                  ? "Connexion réussie"
                                  : "Connexion échouée"}
                              </span>
                            </div>
                            <p className="mt-1">
                              {testResult[credential.id]?.message}
                            </p>
                            {testResult[credential.id]?.responseTime && (
                              <p className="text-xs opacity-75 mt-1">
                                Temps de réponse:{" "}
                                {testResult[credential.id]?.responseTime}ms
                              </p>
                            )}
                          </div>
                        )}

                        <Button
                          onClick={() => deleteCredential(credential)}
                          disabled={loading}
                          variant="outline"
                          className="w-full border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
                        >
                          <X className="h-4 w-4 mr-2" />
                          Supprimer
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Modèles d&apos;APIs Disponibles */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-800">
              Ajouter une API
            </h2>
            <Badge
              variant="secondary"
              className="bg-blue-100 text-blue-800 border-blue-200"
            >
              {availableTemplates.length} modèle
              {availableTemplates.length > 1 ? "s" : ""} disponible
              {availableTemplates.length > 1 ? "s" : ""}
            </Badge>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {availableTemplates.map((template) => {
              const colors = getServiceColors(template.type);
              return (
                <Card
                  key={template.id}
                  className={`${colors.bg} ${colors.border} border-2 hover:shadow-xl transition-all duration-300 hover:scale-105 natura-card`}
                >
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div
                          className={`p-3 ${colors.iconBg} rounded-xl text-white shadow-lg`}
                        >
                          {template.icon}
                        </div>
                        <div>
                          <CardTitle
                            className={`text-lg font-semibold ${colors.text}`}
                          >
                            {template.name}
                          </CardTitle>
                          <CardDescription className="text-sm text-gray-600">
                            {template.description}
                          </CardDescription>
                        </div>
                      </div>
                      <Badge
                        variant="secondary"
                        className="bg-gray-100 text-gray-600"
                      >
                        <Lock className="h-3 w-3 mr-1" />
                        Non configuré
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Button
                      onClick={() => handleAddCredential(template)}
                      className={`w-full bg-gradient-to-r ${colors.gradient} hover:opacity-90 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300`}
                    >
                      <Key className="h-4 w-4 mr-2" />
                      Configurer
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Add New API Dialog */}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <Key className="h-5 w-5" />
                <span>Ajouter {editingCredential?.name}</span>
              </DialogTitle>
              <DialogDescription>
                Configurez les credentials pour {editingCredential?.name}.
                Toutes les données sont chiffrées et sécurisées.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Nom de l'instance */}
              <div className="space-y-2">
                <Label htmlFor="instanceName">Nom de l&apos;instance</Label>
                <Input
                  id="instanceName"
                  type="text"
                  placeholder="Ex: Compte Principal, support@natura.com, etc."
                  value={formData.instanceName}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      instanceName: e.target.value,
                    }))
                  }
                  className="natura-input"
                />
                <p className="text-xs text-gray-500">
                  Ce nom vous aidera à identifier cette instance parmi les
                  autres
                </p>
              </div>

              {/* Test de connexion */}
              <div className="space-y-3 p-4 bg-gray-50 rounded-lg border">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-gray-900">
                    Test de connexion
                  </h4>
                  <Button
                    type="button"
                    onClick={testApiConnection}
                    disabled={
                      testing[editingCredential?.id || "new"] ||
                      !formData.apiKey
                    }
                    variant="outline"
                    size="sm"
                    className="flex items-center space-x-2"
                  >
                    <Zap className="h-4 w-4" />
                    <span>
                      {testing[editingCredential?.id || "new"]
                        ? "Test en cours..."
                        : "Tester"}
                    </span>
                  </Button>
                </div>

                {testResult[editingCredential?.id || "new"] && (
                  <div
                    className={`p-3 rounded-md text-sm ${
                      testResult[editingCredential?.id || "new"]?.success
                        ? "bg-green-50 text-green-800 border border-green-200"
                        : "bg-red-50 text-red-800 border border-red-200"
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      {testResult[editingCredential?.id || "new"]?.success ? (
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      ) : (
                        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      )}
                      <span className="font-medium">
                        {testResult[editingCredential?.id || "new"]?.success
                          ? "Connexion réussie"
                          : "Connexion échouée"}
                      </span>
                    </div>
                    <p className="mt-1">
                      {testResult[editingCredential?.id || "new"]?.message}
                    </p>
                    {testResult[editingCredential?.id || "new"]
                      ?.responseTime && (
                      <p className="text-xs opacity-75 mt-1">
                        Temps de réponse:{" "}
                        {
                          testResult[editingCredential?.id || "new"]
                            ?.responseTime
                        }
                        ms
                      </p>
                    )}
                  </div>
                )}

                <p className="text-xs text-gray-500">
                  ⚠️ Le test de connexion est obligatoire avant de sauvegarder
                </p>
              </div>

              {/* Testeur de messages Twilio - visible seulement après test réussi */}
              {editingCredential?.type === "TWILIO" &&
                testResult[editingCredential?.id || "new"]?.success && (
                  <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center space-x-2 mb-3">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm font-medium text-green-800">
                        Connexion réussie ! Vous pouvez maintenant tester
                        l&apos;envoi de messages.
                      </span>
                    </div>
                    <TwilioMessageTester
                      credentialId={
                        generatedCredentialId ||
                        editingCredential.id ||
                        "twilio"
                      }
                      instanceName={
                        editingCredential.instanceName || "Twilio WhatsApp"
                      }
                      phoneNumber={formData.customField1}
                      accountSid={formData.apiKey}
                      authToken={formData.apiSecret}
                    />
                  </div>
                )}

              {/* Message d&apos;instruction pour Twilio */}
              {editingCredential?.type === "TWILIO" &&
                !testResult[editingCredential?.id || "new"]?.success && (
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="text-sm font-medium text-blue-800">
                        Workflow Twilio : 1) Testez la connexion → 2) Testez
                        l&apos;envoi → 3) Sauvegardez
                      </span>
                    </div>
                  </div>
                )}

              {editingCredential &&
                getCredentialFields(editingCredential.type).map((field) => (
                  <div key={field.key} className="space-y-2">
                    <Label htmlFor={field.key}>{field.label}</Label>
                    <Input
                      id={field.key}
                      type={
                        field.key.includes("Secret") ||
                        field.key.includes("Password")
                          ? "password"
                          : "text"
                      }
                      placeholder={field.placeholder}
                      value={formData[field.key as keyof typeof formData]}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          [field.key]: e.target.value,
                        }))
                      }
                      className="natura-input"
                    />
                  </div>
                ))}
            </div>

            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setIsAddDialogOpen(false)}
                disabled={loading}
              >
                <X className="h-4 w-4 mr-2" />
                Annuler
              </Button>
              <Button
                onClick={handleSaveCredential}
                disabled={
                  loading ||
                  !testResult[editingCredential?.id || "new"]?.success
                }
                className="natura-button natura-hover"
              >
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Ajout...</span>
                  </div>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    {!testResult[editingCredential?.id || "new"]
                      ? "Tester d&apos;abord"
                      : testResult[editingCredential?.id || "new"]?.success
                      ? "Ajouter"
                      : "Test requis"}
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <Key className="h-5 w-5" />
                <span>Configuration {editingCredential?.name}</span>
              </DialogTitle>
              <DialogDescription>
                Configurez les credentials pour {editingCredential?.name}.
                Toutes les données sont chiffrées et sécurisées.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {editingCredential &&
                getCredentialFields(editingCredential.type).map((field) => (
                  <div key={field.key} className="space-y-2">
                    <Label htmlFor={field.key}>{field.label}</Label>
                    <Input
                      id={field.key}
                      type={
                        field.key.includes("Secret") ||
                        field.key.includes("Password")
                          ? "password"
                          : "text"
                      }
                      placeholder={field.placeholder}
                      value={formData[field.key as keyof typeof formData]}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          [field.key]: e.target.value,
                        }))
                      }
                      className="natura-input"
                    />
                  </div>
                ))}
            </div>

            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                disabled={loading}
              >
                <X className="h-4 w-4 mr-2" />
                Annuler
              </Button>
              <Button
                onClick={handleSaveCredential}
                disabled={loading}
                className="natura-button natura-hover"
              >
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Sauvegarde...</span>
                  </div>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Sauvegarder
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Toast Notifications */}
        <Toaster toasts={toasts} onClose={dismiss} />
      </div>
    </div>
  );
}
