"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ShoppingCart,
  Clock,
  CheckCircle,
  XCircle,
  Truck,
  User,
  Phone,
  Euro,
  Search,
  Filter,
  RefreshCw,
  Eye,
  Package,
  Info,
  Trash2,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { clientEventTracker } from "@/lib/client-event-tracker";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

interface Order {
  id: string;
  orderId: string;
  storeId: string;
  orderCode?: string;
  source: string;
  status: string;
  orderTime?: string;
  estimatedPickupTime?: string;
  paymentMethod?: string;
  currency?: string;
  estimatedTotalPrice?: number;
  customerName?: string;
  customerPhone?: string;
  courierName?: string;
  courierPhone?: string;
  products?: Record<string, unknown>[];
  allergyInfo?: string;
  specialRequirements?: string;
  metadata?: Record<string, unknown>;
  notes?: string;
  createdAt: string;
  receivedAt: string;
  credential?: {
    id: string;
    name: string;
    type: string;
  };
  store?: {
    id: string;
    name: string;
    twilioCredentialId?: string;
    twilioCredential?: {
      id: string;
      name: string;
      instanceName?: string;
      customField1?: string;
    };
  };
}

interface OrderFilters {
  source: string;
  status: string;
  search: string;
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [filters, setFilters] = useState<OrderFilters>({
    source: "all",
    status: "all",
    search: "",
  });
  const { toast } = useToast();

  // Charger les commandes
  const loadOrders = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/orders");
      if (response.ok) {
        const data = await response.json();
        setOrders(data);
      } else {
        throw new Error("Erreur lors du chargement des commandes");
      }
    } catch (error) {
      console.error("Error loading orders:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les commandes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Simuler des commandes Glovo réelles
  const simulateGlovoOrders = async () => {
    try {
      setSyncing(true);

      const response = await fetch("/api/orders/simulate-glovo", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        toast({
          title: "Commandes simulées",
          description: data.message,
        });
        // Recharger les commandes
        await loadOrders();
      } else {
        throw new Error("Erreur de simulation");
      }
    } catch (error) {
      console.error("Error simulating Glovo orders:", error);
      toast({
        title: "Erreur",
        description: "Erreur lors de la simulation des commandes",
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

  // Synchroniser avec l'API officielle Glovo Business
  const syncGlovoBusiness = async () => {
    try {
      setSyncing(true);

      const response = await fetch("/api/glovo/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        toast({
          title: "Synchronisation réussie",
          description: `${data.syncedCount} nouvelles commandes synchronisées`,
        });
        // Recharger les commandes
        await loadOrders();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erreur de synchronisation");
      }
    } catch (error) {
      console.error("Error syncing Glovo Business:", error);
      toast({
        title: "Erreur de synchronisation",
        description:
          error instanceof Error
            ? error.message
            : "Erreur lors de la synchronisation",
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

  // Envoyer un message au client
  const sendMessageToCustomer = async (order: Order) => {
    try {
      // Vérifier que le client a un numéro de téléphone
      if (!order.customerPhone || order.customerPhone === "N/A") {
        toast({
          title: "Impossible d&apos;envoyer",
          description: "Aucun numéro de téléphone disponible pour ce client",
          variant: "destructive",
        });
        return;
      }

      // Préparer les variables du template
      const templateVariables = {
        "1": order.customerName || "Client", // Nom du client
        "2": order.orderCode || order.orderId, // Code/N° de commande
        "3": "Natura Beldi", // Nom de l'établissement
        "4": formatPrice(order.estimatedTotalPrice, order.currency), // Total
        "5": formatDate(order.estimatedPickupTime) || "En cours", // Heure de collecte
      };

      // Récupérer la credential Twilio spécifique au store ou fallback
      let twilioCredential = null;

      // 1. Essayer d&apos;utiliser la credential spécifique du store
      if (order.store?.twilioCredentialId) {
        const credentialsResponse = await fetch("/api/credentials");
        const credentials = await credentialsResponse.json();
        const twilioCredentialId = order.store.twilioCredentialId;
        twilioCredential = credentials.find(
          (c: Record<string, unknown>) =>
            c.id === twilioCredentialId && c.type === "TWILIO"
        );
      }

      // 2. Fallback: utiliser la première credential Twilio disponible
      if (!twilioCredential) {
        const credentialsResponse = await fetch("/api/credentials");
        const credentials = await credentialsResponse.json();
        twilioCredential = credentials.find(
          (c: Record<string, unknown>) => c.type === "TWILIO" && c.isActive
        );
      }

      if (!twilioCredential) {
        toast({
          title: "Erreur",
          description: "Aucune credential Twilio configurée",
          variant: "destructive",
        });
        return;
      }

      const response = await fetch("/api/twilio/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          credentialId: twilioCredential.id,
          to: order.customerPhone,
          type: "whatsapp",
          templateSid: "HX22e0cbee729d0f6a6d038640573b4d2d",
          templateParams: templateVariables,
        }),
      });

      if (response.ok) {
        await response.json();
        toast({
          title: "Message envoyé",
          description: `Message WhatsApp envoyé à ${order.customerName}`,
        });

        // Tracker l'événement
        await clientEventTracker.trackEvent({
          type: "MESSAGING_MESSAGE_SENT",
          title: "Message client envoyé",
          description: `Message WhatsApp envoyé au client ${order.customerName} pour la commande ${order.orderCode}`,
          metadata: {
            orderId: order.id,
            customerPhone: order.customerPhone,
            templateSid: "HX22e0cbee729d0f6a6d038640573b4d2d",
          },
        });
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erreur lors de l'envoi");
      }
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Erreur d&apos;envoi",
        description:
          error instanceof Error
            ? error.message
            : "Erreur lors de l'envoi du message",
        variant: "destructive",
      });
    }
  };

  // Supprimer une commande
  const deleteOrder = async (orderId: string) => {
    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast({
          title: "Commande supprimée",
          description: "La commande a été supprimée avec succès",
        });
        // Recharger les commandes
        await loadOrders();

        // Tracker l'événement
        await clientEventTracker.trackEvent({
          type: "ORDER_CANCELLED",
          title: "Commande supprimée",
          description: `Commande ${orderId} supprimée`,
          metadata: { orderId },
        });
      } else {
        throw new Error("Erreur lors de la suppression");
      }
    } catch (error) {
      console.error("Error deleting order:", error);
      toast({
        title: "Erreur",
        description: "Erreur lors de la suppression de la commande",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  // Filtrer les commandes
  const filteredOrders = orders.filter((order) => {
    const matchesSource =
      filters.source === "all" || order.source === filters.source;
    const matchesStatus =
      filters.status === "all" || order.status === filters.status;
    const matchesSearch =
      filters.search === "" ||
      order.orderId.toLowerCase().includes(filters.search.toLowerCase()) ||
      order.orderCode?.toLowerCase().includes(filters.search.toLowerCase()) ||
      order.customerName?.toLowerCase().includes(filters.search.toLowerCase());

    return matchesSource && matchesStatus && matchesSearch;
  });

  // Obtenir la couleur du statut
  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACCEPTED":
        return "bg-blue-100 text-blue-800 border-blue-300";
      case "READY_FOR_PICKUP":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "OUT_FOR_DELIVERY":
        return "bg-purple-100 text-purple-800 border-purple-300";
      case "PICKED_UP_BY_CUSTOMER":
        return "bg-green-100 text-green-800 border-green-300";
      case "CANCELLED":
        return "bg-red-100 text-red-800 border-red-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  // Obtenir l'icône du statut
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "ACCEPTED":
        return <CheckCircle className="w-4 h-4" />;
      case "READY_FOR_PICKUP":
        return <Clock className="w-4 h-4" />;
      case "OUT_FOR_DELIVERY":
        return <Truck className="w-4 h-4" />;
      case "PICKED_UP_BY_CUSTOMER":
        return <User className="w-4 h-4" />;
      case "CANCELLED":
        return <XCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  // Formater le prix
  const formatPrice = (priceInCents?: number, currency?: string) => {
    if (!priceInCents) return "N/A";
    const price = priceInCents / 100;
    return `${price.toFixed(2)} ${currency || "EUR"}`;
  };

  // Formater la date
  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleString("fr-FR");
    } catch {
      return dateString;
    }
  };

  // Composant pour les détails de commande
  const OrderDetailsModal = ({ order }: { order: Order }) => (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Eye className="w-4 h-4 mr-1" />
          Voir détails
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2 text-xl">
            <Package className="w-6 h-6 text-blue-600" />
            <span>Commande {order.orderId}</span>
            <Badge className={getStatusColor(order.status)}>
              {order.status}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Header simple */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-6">
              <div>
                <div className="text-sm text-muted-foreground">Total</div>
                <div className="text-2xl font-bold text-green-600">
                  {formatPrice(order.estimatedTotalPrice, order.currency)}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Client</div>
                <div className="font-semibold">
                  {order.customerName || "N/A"}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Source</div>
                <div className="font-semibold">{order.source}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground">Date</div>
              <div className="text-sm">{formatDate(order.orderTime)}</div>
            </div>
          </div>

          {/* Informations principales */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">
                  ID Commande
                </div>
                <div className="font-mono text-sm">{order.orderId}</div>
              </div>
              {order.orderCode && (
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Code
                  </div>
                  <div className="font-mono text-sm">{order.orderCode}</div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">
                  Statut
                </div>
                <Badge className={getStatusColor(order.status)}>
                  <span className="flex items-center space-x-1">
                    {getStatusIcon(order.status)}
                    <span>{order.status}</span>
                  </span>
                </Badge>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">
                  Paiement
                </div>
                <div className="text-sm">{order.paymentMethod || "N/A"}</div>
              </div>
            </div>

            {order.estimatedPickupTime && (
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">
                  Pickup estimé
                </div>
                <div className="text-sm">
                  {formatDate(order.estimatedPickupTime)}
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Client */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold flex items-center space-x-2">
              <User className="w-5 h-5" />
              <span>Client</span>
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">
                  Nom
                </div>
                <div className="text-sm">{order.customerName || "N/A"}</div>
              </div>
              {order.customerPhone && (
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Téléphone
                  </div>
                  <div className="text-sm flex items-center">
                    <Phone className="w-4 h-4 mr-2" />
                    {order.customerPhone}
                  </div>
                </div>
              )}
            </div>
            {(order.courierName || order.courierPhone) && (
              <div className="grid grid-cols-2 gap-4">
                {order.courierName && (
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-1">
                      Livreur
                    </div>
                    <div className="text-sm">{order.courierName}</div>
                  </div>
                )}
                {order.courierPhone && (
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-1">
                      Tél. Livreur
                    </div>
                    <div className="text-sm flex items-center">
                      <Phone className="w-4 h-4 mr-2" />
                      {order.courierPhone}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Produits */}
          {order.products && order.products.length > 0 && (
            <>
              <Separator />
              <div className="space-y-3">
                <h3 className="text-lg font-semibold flex items-center space-x-2">
                  <ShoppingCart className="w-5 h-5" />
                  <span>Produits ({order.products.length})</span>
                </h3>
                <div className="space-y-2">
                  {order.products.map(
                    (product: Record<string, unknown>, index: number) => {
                      const productData = product as {
                        name?: string;
                        quantity?: number;
                        externalId?: string;
                        price?: { value?: number; currencyCode?: string };
                      };
                      return (
                        <div
                          key={index}
                          className="flex justify-between items-center p-3 border rounded-lg"
                        >
                          <div className="flex-1">
                            <div className="font-medium text-sm">
                              {productData.name || "Produit inconnu"}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Quantité: {productData.quantity || 0} | ID:{" "}
                              {productData.externalId || "N/A"}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold text-sm">
                              {formatPrice(
                                (productData.price?.value || 0) * 100,
                                productData.price?.currencyCode || "MAD"
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>
              </div>
            </>
          )}

          {/* Informations spéciales */}
          {(order.allergyInfo || order.specialRequirements) && (
            <>
              <Separator />
              <div className="space-y-3">
                <h3 className="text-lg font-semibold flex items-center space-x-2">
                  <Info className="w-5 h-5" />
                  <span>Informations spéciales</span>
                </h3>
                {order.allergyInfo && (
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-2">
                      ⚠️ Allergies
                    </div>
                    <div className="text-sm p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      {order.allergyInfo}
                    </div>
                  </div>
                )}
                {order.specialRequirements && (
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-2">
                      📝 Exigences spéciales
                    </div>
                    <div className="text-sm p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      {order.specialRequirements}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Commandes</h1>
          <p className="text-muted-foreground">
            Gestion des commandes reçues via les APIs configurées
          </p>
        </div>
        <div className="flex space-x-2">
          <Button onClick={loadOrders} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualiser
          </Button>
          <Button
            onClick={syncGlovoBusiness}
            variant="default"
            size="sm"
            disabled={syncing}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <RefreshCw
              className={`w-4 h-4 mr-2 ${syncing ? "animate-spin" : ""}`}
            />
            {syncing ? "Sync..." : "Sync Glovo Business"}
          </Button>
          <Button
            onClick={simulateGlovoOrders}
            variant="outline"
            size="sm"
            disabled={syncing}
          >
            <RefreshCw
              className={`w-4 h-4 mr-2 ${syncing ? "animate-spin" : ""}`}
            />
            {syncing ? "Simulation..." : "Simuler Glovo"}
          </Button>
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <ShoppingCart className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium">Total Commandes</p>
                <p className="text-2xl font-bold">{orders.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-sm font-medium">Acceptées</p>
                <p className="text-2xl font-bold">
                  {orders.filter((o) => o.status === "ACCEPTED").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Truck className="w-5 h-5 text-purple-600" />
              <div>
                <p className="text-sm font-medium">En Livraison</p>
                <p className="text-2xl font-bold">
                  {orders.filter((o) => o.status === "OUT_FOR_DELIVERY").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Euro className="w-5 h-5 text-yellow-600" />
              <div>
                <p className="text-sm font-medium">Chiffre d&apos;Affaires</p>
                <p className="text-2xl font-bold">
                  {formatPrice(
                    orders.reduce(
                      (sum, o) => sum + (o.estimatedTotalPrice || 0),
                      0
                    ),
                    "EUR"
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtres */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="w-5 h-5" />
            <span>Filtres</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="search">Recherche</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="ID commande, code, client..."
                  value={filters.search}
                  onChange={(e) =>
                    setFilters({ ...filters, search: e.target.value })
                  }
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="source">Source</Label>
              <Select
                value={filters.source}
                onValueChange={(value) =>
                  setFilters({ ...filters, source: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Toutes les sources" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les sources</SelectItem>
                  <SelectItem value="GLOVO">Glovo</SelectItem>
                  <SelectItem value="TWILIO">Twilio</SelectItem>
                  <SelectItem value="CUSTOM">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="status">Statut</Label>
              <Select
                value={filters.status}
                onValueChange={(value) =>
                  setFilters({ ...filters, status: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Tous les statuts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="ACCEPTED">Acceptée</SelectItem>
                  <SelectItem value="READY_FOR_PICKUP">Prête</SelectItem>
                  <SelectItem value="OUT_FOR_DELIVERY">En livraison</SelectItem>
                  <SelectItem value="PICKED_UP_BY_CUSTOMER">
                    Récupérée
                  </SelectItem>
                  <SelectItem value="CANCELLED">Annulée</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Liste des commandes */}
      <Card>
        <CardHeader>
          <CardTitle>Commandes ({filteredOrders.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin" />
              <span className="ml-2">Chargement des commandes...</span>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-8">
              <ShoppingCart className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Aucune commande trouvée</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Commande</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Montant</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{order.orderId}</p>
                          {order.orderCode && (
                            <p className="text-sm text-muted-foreground">
                              Code: {order.orderCode}
                            </p>
                          )}
                        </div>
                      </TableCell>

                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {order.customerName || "N/A"}
                          </p>
                          {order.customerPhone && (
                            <p className="text-sm text-muted-foreground flex items-center">
                              <Phone className="w-3 h-3 mr-1" />
                              {order.customerPhone}
                            </p>
                          )}
                        </div>
                      </TableCell>

                      <TableCell>
                        <Badge className={getStatusColor(order.status)}>
                          <span className="flex items-center space-x-1">
                            {getStatusIcon(order.status)}
                            <span>{order.status}</span>
                          </span>
                        </Badge>
                      </TableCell>

                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {formatPrice(
                              order.estimatedTotalPrice,
                              order.currency
                            )}
                          </p>
                          {order.paymentMethod && (
                            <p className="text-sm text-muted-foreground">
                              {order.paymentMethod}
                            </p>
                          )}
                        </div>
                      </TableCell>

                      <TableCell>
                        <Badge variant="outline">{order.source}</Badge>
                      </TableCell>

                      <TableCell>
                        <div>
                          <p className="text-sm">
                            {formatDate(order.orderTime)}
                          </p>
                          {order.estimatedPickupTime && (
                            <p className="text-xs text-muted-foreground">
                              Pickup: {formatDate(order.estimatedPickupTime)}
                            </p>
                          )}
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="flex space-x-2">
                          <OrderDetailsModal order={order} />
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => sendMessageToCustomer(order)}
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            <Phone className="w-4 h-4 mr-1" />
                            Envoyer message
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => deleteOrder(order.id)}
                            className="bg-red-600 hover:bg-red-700 text-white"
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
                            Supprimer
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
