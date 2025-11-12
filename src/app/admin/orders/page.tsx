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
import { OrderStatus, getStatusLabel, getStatusColor } from "@/types/order-status";
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
        // API returns { success: true, orders: [...], count: ... }
        setOrders(Array.isArray(data) ? data : (data.orders || []));
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

  // Use the centralized status color function
  const getBadgeColor = (status: string) => {
    return getStatusColor(status as OrderStatus);
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case OrderStatus.CREATED:
        return <Clock className="w-4 h-4" />;
      case OrderStatus.ACCEPTED:
        return <CheckCircle className="w-4 h-4" />;
      case OrderStatus.PREPARING:
        return <Package className="w-4 h-4" />;
      case OrderStatus.READY:
        return <CheckCircle className="w-4 h-4" />;
      case OrderStatus.DISPATCHED:
        return <Truck className="w-4 h-4" />;
      case OrderStatus.DELIVERED:
        return <CheckCircle className="w-4 h-4" />;
      case OrderStatus.CANCELLED:
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
            <Badge className={getBadgeColor(order.status)}>
              {getStatusLabel(order.status as OrderStatus)}
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
                <Badge className={getBadgeColor(order.status)}>
                  <span className="flex items-center space-x-1">
                    {getStatusIcon(order.status)}
                    <span>{getStatusLabel(order.status as OrderStatus)}</span>
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
                        sku?: string;
                        imageUrl?: string;
                        price?: number | { value?: number; currencyCode?: string };
                      };

                      // Handle both old and new price formats
                      const price = typeof productData.price === 'number'
                        ? productData.price
                        : (productData.price?.value || 0) * 100;

                      const currency = typeof productData.price === 'object'
                        ? productData.price?.currencyCode || "MAD"
                        : "MAD";

                      return (
                        <div
                          key={index}
                          className="flex items-center gap-3 p-3 border rounded-lg"
                        >
                          {/* Product Image */}
                          {productData.imageUrl && (
                            <img
                              src={productData.imageUrl}
                              alt={productData.name || "Produit"}
                              className="w-16 h-16 object-cover rounded-md"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          )}

                          {/* Product Info */}
                          <div className="flex-1">
                            <div className="font-medium text-sm">
                              {productData.name || "Produit inconnu"}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Quantité: {productData.quantity || 0}
                              {productData.sku && ` | SKU: ${productData.sku}`}
                            </div>
                          </div>

                          {/* Price */}
                          <div className="text-right">
                            <div className="font-semibold text-sm">
                              {formatPrice(price, currency)}
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
                <p className="text-sm font-medium">Prêtes</p>
                <p className="text-2xl font-bold">
                  {orders.filter((o) => o.status === OrderStatus.READY).length}
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
                  {orders.filter((o) => o.status === OrderStatus.DISPATCHED).length}
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
                  <SelectItem value={OrderStatus.CREATED}>Créée</SelectItem>
                  <SelectItem value={OrderStatus.ACCEPTED}>Acceptée</SelectItem>
                  <SelectItem value={OrderStatus.PREPARING}>En préparation</SelectItem>
                  <SelectItem value={OrderStatus.READY}>Prête</SelectItem>
                  <SelectItem value={OrderStatus.DISPATCHED}>En livraison</SelectItem>
                  <SelectItem value={OrderStatus.DELIVERED}>Livrée</SelectItem>
                  <SelectItem value={OrderStatus.CANCELLED}>Annulée</SelectItem>
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
                        <Badge className={getBadgeColor(order.status)}>
                          <span className="flex items-center space-x-1">
                            {getStatusIcon(order.status)}
                            <span>{getStatusLabel(order.status as OrderStatus)}</span>
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
