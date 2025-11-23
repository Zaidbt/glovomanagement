"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ShoppingCart,
  Clock,
  CheckCircle,
  Package,
  User,
  Phone,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface OrderProduct {
  id: string;
  name: string;
  quantity: number;
  price: number;
  sku?: string;
  // Enriched from database
  imageUrl?: string;
  isMyProduct?: boolean;
}

interface Order {
  id: string;
  orderId: string;
  orderCode?: string;
  status: string;
  orderTime?: string;
  estimatedPickupTime?: string;
  customerName?: string;
  customerPhone?: string;
  courierName?: string;
  courierPhone?: string;
  products: OrderProduct[];
  allergyInfo?: string;
  specialRequirements?: string;
  metadata?: {
    pickupCode?: string;
    supplierStatuses?: Record<string, {
      status: string;
      basket?: number;
      markedReadyAt?: string;
      pickedUp?: boolean;
    }>;
    [key: string]: unknown;
  };
  myProductsCount: number;
  totalProductsCount: number;
  myProductsReady?: boolean;
  myBasketNumber?: number;
}

export default function FournisseurOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const { toast } = useToast();

  // Settings for alert timing
  const [preparationAlertMinutes, setPreparationAlertMinutes] = useState(5);
  const [pickupAlertMinutes, setPickupAlertMinutes] = useState(5);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/supplier/my-orders");

      if (response.ok) {
        const data = await response.json();
        setOrders(data.orders || []);
      } else {
        toast({
          title: "Erreur",
          description: "Impossible de charger les commandes",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error fetching orders:", error);
      toast({
        title: "Erreur",
        description: "Erreur lors du chargement des commandes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch settings
  const fetchSettings = async () => {
    try {
      const response = await fetch("/api/settings");
      if (response.ok) {
        const data = await response.json();
        const prepAlert = data.settings.find((s: { key: string; value: string }) => s.key === "preparation_alert_minutes");
        const pickAlert = data.settings.find((s: { key: string; value: string }) => s.key === "pickup_alert_minutes");

        if (prepAlert) setPreparationAlertMinutes(parseInt(prepAlert.value));
        if (pickAlert) setPickupAlertMinutes(parseInt(pickAlert.value));
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
    }
  };

  useEffect(() => {
    fetchSettings();
    fetchOrders();
  }, []);

  const handleMarkReady = async (orderId: string) => {
    try {
      const response = await fetch(`/api/supplier/orders/${orderId}/mark-ready`, {
        method: "POST",
      });

      if (response.ok) {
        const result = await response.json();
        toast({
          title: "✅ Produits marqués comme prêts",
          description: result.basket ? `Panier ${result.basket} assigné` : "Le collaborateur sera notifié",
        });
        fetchOrders(); // Refresh
      } else {
        toast({
          title: "Erreur",
          description: "Impossible de marquer comme prêt",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error marking ready:", error);
      toast({
        title: "Erreur",
        description: "Erreur lors de la mise à jour",
        variant: "destructive",
      });
    }
  };

  const handleProductUnavailable = async (orderId: string, productSku: string, productName: string) => {
    try {
      const response = await fetch(`/api/supplier/orders/${orderId}/product-unavailable`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productSku }),
      });

      if (response.ok) {
        // Immediately update selectedOrder to show visual feedback
        if (selectedOrder) {
          const updatedMetadata = {
            ...selectedOrder.metadata,
            unavailableProducts: {
              ...(selectedOrder.metadata?.unavailableProducts || {}),
              [productSku]: [
                ...((selectedOrder.metadata?.unavailableProducts as Record<string, string[]>)?.[productSku] || []),
                // Add current user ID to the list
              ]
            }
          };
          setSelectedOrder({
            ...selectedOrder,
            metadata: updatedMetadata
          });
        }

        toast({
          title: "✅ Produit marqué indisponible",
          description: `${productName} - Un autre fournisseur sera contacté`,
        });

        // Refresh orders list in background
        fetchOrders();
      } else {
        toast({
          title: "Erreur",
          description: "Impossible de marquer comme indisponible",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error marking unavailable:", error);
      toast({
        title: "Erreur",
        description: "Erreur lors de la mise à jour",
        variant: "destructive",
      });
    }
  };

  const formatPrice = (price: number) => {
    return `${(price / 100).toFixed(2)} DH`;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleString("fr-MA", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Determine order alert color based on FOURNISSEUR perspective
  const getOrderAlertClass = (order: Order): { bgClass: string; borderClass: string } => {
    const now = new Date();
    const supplierStatuses = order.metadata?.supplierStatuses;

    // Find my supplier status
    const myStatus = supplierStatuses ? Object.values(supplierStatuses).find((s) => s.markedReadyAt || s.pickedUp) : null;

    // If I marked ready - BLUE (my job is done!)
    // Stays BLUE even if collaborateur is late - that's their problem, not mine
    if (order.myProductsReady) {
      return { bgClass: "bg-blue-50", borderClass: "border-l-4 border-l-blue-500" };
    }

    // Not ready yet (WHITE state) - check MY preparation performance
    if (!order.myProductsReady && order.orderTime) {
      const orderTime = new Date(order.orderTime);
      const minutesSinceOrder = (now.getTime() - orderTime.getTime()) / (1000 * 60);

      // RED if I'm late preparing
      if (minutesSinceOrder > preparationAlertMinutes) {
        return { bgClass: "bg-red-50", borderClass: "border-l-4 border-l-red-500" };
      }
    }

    // WHITE (normal - just received, need to prepare)
    return { bgClass: "", borderClass: "" };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement des commandes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Mes Commandes</h1>
          <p className="text-gray-600">
            Commandes contenant vos produits
          </p>
        </div>
        <Button onClick={fetchOrders} variant="outline">
          <ShoppingCart className="w-4 h-4 mr-2" />
          Actualiser
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Commandes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{orders.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              En attente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {orders.filter((o) => !o.myProductsReady).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Prêtes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {orders.filter((o) => o.myProductsReady).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>Liste des Commandes</CardTitle>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <ShoppingCart className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>Aucune commande trouvée</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Heure</TableHead>
                  <TableHead>Mes Produits</TableHead>
                  <TableHead>Total Produits</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => {
                  const alertClass = getOrderAlertClass(order);
                  return (
                  <TableRow key={order.id} className={`${alertClass.bgClass} ${alertClass.borderClass}`}>
                    <TableCell className="font-mono font-bold">
                      {order.orderCode || order.orderId.substring(0, 8)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatDate(order.orderTime)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="default" className="bg-blue-600">
                        {order.myProductsCount}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {order.totalProductsCount}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {order.myProductsReady ? (
                        <div className="flex items-center gap-2">
                          <Badge variant="default" className="bg-green-600">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Prêt
                          </Badge>
                          {order.myBasketNumber && (
                            <Badge variant="outline" className="bg-purple-50 border-purple-300">
                              Panier {order.myBasketNumber}
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <Badge variant="secondary">
                          <Clock className="w-3 h-3 mr-1" />
                          En attente
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedOrder(order);
                            setDetailsOpen(true);
                          }}
                        >
                          Voir Détails
                        </Button>
                        {!order.myProductsReady && (
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handleMarkReady(order.id)}
                          >
                            Marquer Prêt
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Order Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Détails Commande: {selectedOrder?.orderCode || selectedOrder?.orderId}
            </DialogTitle>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-6">
              {/* Order Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Code Commande</p>
                  <p className="font-mono font-bold">
                    {selectedOrder.orderCode || selectedOrder.orderId}
                  </p>
                </div>
                {(selectedOrder.metadata?.pick_up_code || selectedOrder.metadata?.pickupCode) && (
                  <div>
                    <p className="text-sm text-gray-600">Code Récupération Livreur</p>
                    <p className="font-mono font-bold text-2xl text-green-600">
                      {(selectedOrder.metadata.pick_up_code as string) || (selectedOrder.metadata.pickupCode as string)}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-600">Heure Commande</p>
                  <p className="font-medium">{formatDate(selectedOrder.orderTime)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Heure Récupération Prévue</p>
                  <p className="font-medium">
                    {formatDate(selectedOrder.estimatedPickupTime)}
                  </p>
                </div>
              </div>

              {/* Allergy Info & Special Requirements */}
              {(selectedOrder.allergyInfo || selectedOrder.specialRequirements) && (
                <div className="border-2 border-yellow-300 bg-yellow-50 rounded-lg p-4">
                  <h3 className="font-bold text-yellow-900 mb-2 flex items-center">
                    <span className="mr-2">⚠️</span>
                    Informations Importantes
                  </h3>
                  {selectedOrder.allergyInfo && (
                    <div className="mb-2">
                      <p className="text-sm font-semibold text-yellow-800">Allergies:</p>
                      <p className="text-sm text-yellow-900">{selectedOrder.allergyInfo}</p>
                    </div>
                  )}
                  {selectedOrder.specialRequirements && (
                    <div>
                      <p className="text-sm font-semibold text-yellow-800">Exigences Spéciales:</p>
                      <p className="text-sm text-yellow-900">{selectedOrder.specialRequirements}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Customer & Courier Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-600">Client</p>
                    <p className="font-medium text-gray-400">Confidentiel</p>
                  </div>
                </div>
                {selectedOrder.courierName && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-600">Livreur</p>
                      <p className="font-medium">{selectedOrder.courierName}</p>
                      {selectedOrder.courierPhone && (
                        <p className="text-sm text-gray-500">
                          {selectedOrder.courierPhone}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Basket Info if ready */}
              {selectedOrder.myProductsReady && selectedOrder.myBasketNumber && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <div className="bg-purple-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold">
                      {selectedOrder.myBasketNumber}
                    </div>
                    <div>
                      <p className="font-semibold text-purple-900">
                        Vos produits sont dans le Panier {selectedOrder.myBasketNumber}
                      </p>
                      <p className="text-sm text-purple-700">
                        Le collaborateur viendra récupérer ce panier
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Products */}
              <div>
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Produits de la Commande
                </h3>
                <div className="space-y-3">
                  {selectedOrder.products
                    .sort((a, b) => {
                      // Sort: my products first, then others
                      if (a.isMyProduct && !b.isMyProduct) return -1;
                      if (!a.isMyProduct && b.isMyProduct) return 1;
                      return 0;
                    })
                    .map((product, idx) => {
                      const productSku = product.sku || product.id;
                      const isUnavailable = selectedOrder.metadata?.unavailableProducts &&
                        Object.keys(selectedOrder.metadata.unavailableProducts).includes(productSku);

                      return (
                    <div
                      key={idx}
                      className={`flex items-center gap-4 p-4 rounded-lg border-2 ${
                        isUnavailable
                          ? "border-red-300 bg-red-50 opacity-60"
                          : product.isMyProduct
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 bg-gray-50"
                      }`}
                    >
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="w-16 h-16 object-cover rounded"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center">
                          <Package className="w-8 h-8 text-gray-400" />
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className={`font-medium ${isUnavailable ? 'line-through text-gray-500' : ''}`}>
                            {product.name}
                          </p>
                          {isUnavailable ? (
                            <Badge variant="destructive">
                              Indisponible
                            </Badge>
                          ) : product.isMyProduct ? (
                            <Badge variant="default" className="bg-blue-600">
                              Votre Produit
                            </Badge>
                          ) : (
                            <Badge variant="outline">
                              Pas votre produit
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">
                          Quantité: {product.quantity} × {formatPrice(product.price)}
                        </p>
                        {product.sku && (
                          <p className="text-xs text-gray-400 font-mono mt-1">
                            SKU: {product.sku}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <p className="font-bold">
                          {formatPrice(product.price * product.quantity)}
                        </p>
                        {product.isMyProduct && !selectedOrder.myProductsReady && !isUnavailable && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleProductUnavailable(
                              selectedOrder.id,
                              product.sku || product.id,
                              product.name
                            )}
                          >
                            Je n&apos;ai pas
                          </Button>
                        )}
                      </div>
                    </div>
                      );
                    })}
                </div>
              </div>

              {/* Actions */}
              {!selectedOrder.myProductsReady && (
                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button
                    onClick={() => {
                      handleMarkReady(selectedOrder.id);
                      setDetailsOpen(false);
                    }}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Marquer Mes Produits Comme Prêts
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
