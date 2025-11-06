"use client";

import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Package, MessageSquare, Clock, CheckCircle, ShoppingCart, User, AlertCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface OrderProduct {
  id: string;
  name: string;
  quantity: number;
  price: number;
  sku?: string;
  imageUrl?: string;
}

interface SupplierStatus {
  status: string;
  basket?: number;
  markedReadyAt?: string;
  pickedUp?: boolean;
  supplierName?: string;
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
  totalAmount?: number;
  products: OrderProduct[];
  metadata?: {
    pickupCode?: string;
    supplierStatuses?: Record<string, SupplierStatus>;
    unavailableProducts?: Record<string, string[]>;
    [key: string]: unknown;
  };
}

interface Stats {
  todayOrders: number;
  pendingOrders: number;
  completedOrders: number;
  readyBaskets: number;
}

export default function CollaborateurDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<Stats>({
    todayOrders: 0,
    pendingOrders: 0,
    completedOrders: 0,
    readyBaskets: 0,
  });
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
      const response = await fetch("/api/orders");

      if (response.ok) {
        const data = await response.json();
        const ordersData = data.orders || [];
        setOrders(ordersData);

        // Calculate stats
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const todayOrders = ordersData.filter((o: Order) => {
          if (!o.orderTime) return false;
          const orderDate = new Date(o.orderTime);
          orderDate.setHours(0, 0, 0, 0);
          return orderDate.getTime() === today.getTime();
        });

        const pendingOrders = ordersData.filter(
          (o: Order) => o.status === "PENDING" || o.status === "ACCEPTED"
        );

        const completedOrders = ordersData.filter(
          (o: Order) => o.status === "COMPLETED" || o.status === "DELIVERED"
        );

        // Count ready baskets
        let readyBaskets = 0;
        ordersData.forEach((o: Order) => {
          if (o.metadata?.supplierStatuses) {
            Object.values(o.metadata.supplierStatuses).forEach((status) => {
              if (status.status === "READY" && !status.pickedUp) {
                readyBaskets++;
              }
            });
          }
        });

        setStats({
          todayOrders: todayOrders.length,
          pendingOrders: pendingOrders.length,
          completedOrders: completedOrders.length,
          readyBaskets,
        });
      }
    } catch (error) {
      console.error("Error fetching orders:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les commandes",
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

  const handlePickupBasket = async (orderId: string, supplierId: string, basketNumber: number) => {
    try {
      const response = await fetch(`/api/collaborateur/orders/${orderId}/pickup-basket`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ supplierId }),
      });

      if (response.ok) {
        toast({
          title: "✅ Panier récupéré",
          description: `Panier ${basketNumber} marqué comme récupéré`,
        });
        fetchOrders(); // Refresh
        setDetailsOpen(false);
      } else {
        toast({
          title: "Erreur",
          description: "Impossible de marquer le panier comme récupéré",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error picking up basket:", error);
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

  const getOrderStatus = (order: Order): { label: string; variant: "default" | "secondary" | "outline" | "destructive" } => {
    if (order.status === "COMPLETED" || order.status === "DELIVERED") {
      return { label: "Complétée", variant: "default" };
    }
    if (order.status === "ACCEPTED") {
      return { label: "En préparation", variant: "secondary" };
    }
    if (order.status === "PENDING") {
      return { label: "En attente", variant: "outline" };
    }
    if (order.status === "CANCELLED") {
      return { label: "Annulée", variant: "destructive" };
    }
    return { label: order.status, variant: "outline" };
  };

  // Determine order alert color based on COLLABORATEUR perspective
  const getOrderAlertClass = (order: Order): { bgClass: string; borderClass: string } => {
    const now = new Date();
    const supplierStatuses = order.metadata?.supplierStatuses;

    // If all baskets picked up - BLUE (done)
    if (supplierStatuses) {
      const allPickedUp = Object.values(supplierStatuses).every((status) => status.pickedUp === true);
      if (allPickedUp) {
        return { bgClass: "bg-blue-50", borderClass: "border-l-4 border-l-blue-500" };
      }

      // If any basket is ready to pick up
      const anyBasketReady = Object.values(supplierStatuses).some((s) => s.status === "READY" && !s.pickedUp);
      if (anyBasketReady) {
        // Check if I'm late picking up (MY performance)
        for (const status of Object.values(supplierStatuses)) {
          if (status.markedReadyAt && !status.pickedUp) {
            const markedReadyTime = new Date(status.markedReadyAt);
            const minutesSinceReady = (now.getTime() - markedReadyTime.getTime()) / (1000 * 60);

            // RED if I'm late picking up
            if (minutesSinceReady > pickupAlertMinutes) {
              return { bgClass: "bg-red-50", borderClass: "border-l-4 border-l-red-500" };
            }
          }
        }

        // BLUE if ready and I'm within time limit
        return { bgClass: "bg-blue-50", borderClass: "border-l-4 border-l-blue-500" };
      }
    }

    // WHITE (waiting for fournisseur) - NOT my responsibility yet
    // This stays WHITE even if fournisseur is late (that's their problem, not mine)
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

  const recentOrders = orders.slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Dashboard Collaborateur
          </h1>
          <p className="text-gray-600">
            Gestion des commandes et communication clients
          </p>
        </div>
        <Button onClick={fetchOrders} variant="outline">
          <ShoppingCart className="w-4 h-4 mr-2" />
          Actualiser
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Commandes Aujourd&apos;hui
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.todayOrders}</div>
            <p className="text-xs text-muted-foreground">
              {stats.pendingOrders} en attente
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Commandes Terminées
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.completedOrders}</div>
            <p className="text-xs text-muted-foreground">
              Aujourd&apos;hui
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Paniers Prêts
            </CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{stats.readyBaskets}</div>
            <p className="text-xs text-muted-foreground">À récupérer</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En Attente</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.pendingOrders}</div>
            <p className="text-xs text-muted-foreground">Commandes à traiter</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders with Baskets */}
      <Card>
        <CardHeader>
          <CardTitle>Commandes Récentes</CardTitle>
          <CardDescription>Dernières commandes avec statuts des paniers</CardDescription>
        </CardHeader>
        <CardContent>
          {recentOrders.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <ShoppingCart className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>Aucune commande trouvée</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Heure</TableHead>
                  <TableHead>Paniers</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentOrders.map((order) => {
                  const statusInfo = getOrderStatus(order);
                  const alertClass = getOrderAlertClass(order);
                  const readyBaskets: Array<{ supplierId: string; basket: number; supplierName?: string }> = [];

                  if (order.metadata?.supplierStatuses) {
                    Object.entries(order.metadata.supplierStatuses).forEach(([supplierId, status]) => {
                      if (status.status === "READY" && !status.pickedUp && status.basket) {
                        readyBaskets.push({
                          supplierId,
                          basket: status.basket,
                          supplierName: status.supplierName,
                        });
                      }
                    });
                  }

                  return (
                    <TableRow key={order.id} className={`${alertClass.bgClass} ${alertClass.borderClass}`}>
                      <TableCell className="font-mono font-bold">
                        {order.orderCode || order.orderId.substring(0, 8)}
                      </TableCell>
                      <TableCell>
                        {order.customerName || "Client"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDate(order.orderTime)}
                      </TableCell>
                      <TableCell>
                        {readyBaskets.length > 0 ? (
                          <div className="flex gap-1">
                            {readyBaskets.map((basket, idx) => (
                              <Badge
                                key={idx}
                                variant="outline"
                                className="bg-purple-50 border-purple-300"
                              >
                                Panier {basket.basket}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">Aucun</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusInfo.variant}>
                          {statusInfo.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedOrder(order);
                            setDetailsOpen(true);
                          }}
                        >
                          Détails
                        </Button>
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
                {selectedOrder.metadata?.pickupCode && (
                  <div>
                    <p className="text-sm text-gray-600">Code Récupération Livreur</p>
                    <p className="font-mono font-bold text-lg text-green-600">
                      {selectedOrder.metadata.pickupCode as string}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-600">Heure Commande</p>
                  <p className="font-medium">{formatDate(selectedOrder.orderTime)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Client</p>
                  <p className="font-medium text-gray-400">Confidentiel</p>
                </div>
              </div>

              {/* Baskets Ready for Pickup */}
              {selectedOrder.metadata?.supplierStatuses && (
                <div>
                  <h3 className="font-semibold mb-3">Paniers Prêts à Récupérer</h3>
                  <div className="space-y-3">
                    {Object.entries(selectedOrder.metadata.supplierStatuses).map(([supplierId, status]) => {
                      if (status.status === "READY" && !status.pickedUp && status.basket) {
                        return (
                          <div
                            key={supplierId}
                            className="flex items-center justify-between p-4 bg-purple-50 border border-purple-200 rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              <div className="bg-purple-600 text-white rounded-full w-10 h-10 flex items-center justify-center font-bold text-lg">
                                {status.basket}
                              </div>
                              <div>
                                <p className="font-semibold">
                                  Panier {status.basket}
                                  {status.supplierName && ` - ${status.supplierName}`}
                                </p>
                                <p className="text-sm text-gray-600">
                                  Prêt depuis: {formatDate(status.markedReadyAt)}
                                </p>
                              </div>
                            </div>
                            <Button
                              onClick={() => handlePickupBasket(selectedOrder.id, supplierId, status.basket!)}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Récupéré
                            </Button>
                          </div>
                        );
                      }
                      return null;
                    })}
                  </div>
                </div>
              )}

              {/* Products */}
              <div>
                <h3 className="font-semibold mb-3">Produits de la Commande</h3>
                <div className="space-y-2">
                  {selectedOrder.products && selectedOrder.products.length > 0 ? (
                    selectedOrder.products.map((product, idx) => {
                      const productSku = product.sku || product.id;
                      const isUnavailable = selectedOrder.metadata?.unavailableProducts &&
                        Object.keys(selectedOrder.metadata.unavailableProducts).includes(productSku);

                      return (
                    <div
                      key={idx}
                      className={`flex items-center justify-between p-3 border rounded-lg ${
                        isUnavailable ? 'bg-red-50 border-red-300 opacity-75' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {product.imageUrl ? (
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            className="w-12 h-12 object-cover rounded"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center">
                            <Package className="w-6 h-6 text-gray-400" />
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <p className={`font-medium ${isUnavailable ? 'line-through text-red-700' : ''}`}>
                              {product.name}
                            </p>
                            {isUnavailable && (
                              <Badge variant="destructive" className="text-xs">
                                Indisponible
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-600">
                            Quantité: {product.quantity}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">
                          {formatPrice(product.price * product.quantity)}
                        </p>
                      </div>
                    </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-4 text-gray-500">
                      <p>Aucun produit dans cette commande</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Unavailable Products */}
              {selectedOrder.metadata?.unavailableProducts &&
                Object.keys(selectedOrder.metadata.unavailableProducts).length > 0 && (
                  <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4">
                    <h3 className="font-semibold text-red-900 mb-3 flex items-center gap-2">
                      <AlertCircle className="w-5 h-5" />
                      Produits Indisponibles
                    </h3>
                    <div className="space-y-2">
                      {Object.keys(selectedOrder.metadata.unavailableProducts).map((sku) => {
                        const product = selectedOrder.products?.find(p => p.sku === sku || p.id === sku);
                        return (
                          <div key={sku} className="flex items-center gap-3 p-3 bg-red-100 border border-red-200 rounded-lg">
                            {product?.imageUrl ? (
                              <img
                                src={product.imageUrl}
                                alt={product.name}
                                className="w-12 h-12 object-cover rounded opacity-50"
                              />
                            ) : (
                              <div className="w-12 h-12 bg-red-200 rounded flex items-center justify-center">
                                <Package className="w-6 h-6 text-red-400" />
                              </div>
                            )}
                            <div className="flex-1">
                              <p className="font-medium text-red-900">{product?.name || "Produit inconnu"}</p>
                              <p className="text-sm text-red-700">SKU: {sku}</p>
                            </div>
                            <Badge variant="destructive">Indisponible</Badge>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
