"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { io, Socket } from "socket.io-client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OrderStatus, getStatusLabel } from "@/types/order-status";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Package, ShoppingCart, CheckCircle, Search, Filter, AlertCircle, Send, Clock } from "lucide-react";
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
  unavailableProducts?: string[];
  originalTotal?: number;
  adjustedTotal?: number;
  billableAmount?: number;
  allProductsUnavailable?: boolean;
  lastUpdatedAt?: string;
  lastUpdatedBy?: string;
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
  allergyInfo?: string;
  specialRequirements?: string;
  metadata?: {
    pickupCode?: string;
    supplierStatuses?: Record<string, SupplierStatus>;
    unavailableProducts?: Record<string, string[]>;
    [key: string]: unknown;
  };
}

export default function CollaborateurCommandesPage() {
  const { data: session } = useSession();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [markingReady, setMarkingReady] = useState(false);
  const [acceptingOrder, setAcceptingOrder] = useState(false);
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
        setFilteredOrders(ordersData);
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

  // WebSocket connection for live updates
  useEffect(() => {
    if (!session?.user || !(session.user as { id?: string }).id) return;

    const socket: Socket = io({
      path: "/socket.io/",
    });

    socket.on("connect", () => {
      console.log("✅ Connected to WebSocket");
      // Join personal collaborateur room (for store-specific notifications)
      socket.emit("join-room", `collaborateur:${(session.user as { id: string }).id}`);
    });

    socket.on("new-order-created", (orderData) => {
      console.log("🆕 New order created via WebSocket:", orderData);

      // Show toast notification
      toast({
        title: "🆕 Nouvelle commande Glovo!",
        description: `Commande ${orderData.orderCode || orderData.orderId} de ${orderData.customerName}`,
      });

      // Refresh orders list
      fetchOrders();
    });

    socket.on("basket-ready", (data) => {
      console.log("🧺 Basket ready received via WebSocket:", data);

      // Show toast notification
      toast({
        title: "🧺 Panier prêt!",
        description: data.basket
          ? `Panier ${data.basket} - ${data.supplierName} - Commande ${data.orderCode}`
          : `${data.supplierName} - Commande ${data.orderCode} (sans panier)`,
      });

      // Refresh orders list
      fetchOrders();
    });

    socket.on("disconnect", () => {
      console.log("❌ Disconnected from WebSocket");
    });

    return () => {
      socket.disconnect();
    };
  }, [(session?.user as { id?: string })?.id]);

  useEffect(() => {
    let filtered = [...orders];

    // Filter by status
    if (statusFilter !== "ALL") {
      filtered = filtered.filter((order) => order.status === statusFilter);
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(
        (order) =>
          order.orderCode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          order.orderId.toLowerCase().includes(searchQuery.toLowerCase()) ||
          order.customerName?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredOrders(filtered);
  }, [orders, statusFilter, searchQuery]);

  const handlePickupBasket = async (orderId: string, supplierId: string, basketNumber: number | null) => {
    try {
      const response = await fetch(`/api/collaborateur/orders/${orderId}/pickup-basket`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ supplierId }),
      });

      if (response.ok) {
        toast({
          title: "✅ Panier récupéré",
          description: basketNumber ? `Panier ${basketNumber} marqué comme récupéré` : "Produits marqués comme récupérés",
        });

        // Re-fetch the specific order to update modal
        const orderResponse = await fetch(`/api/orders/${orderId}`);
        if (orderResponse.ok) {
          const orderData = await orderResponse.json();
          const updatedOrder = orderData.order;

          // Update the order in the orders array without triggering loading state
          setOrders(prevOrders =>
            prevOrders.map(o => o.id === updatedOrder.id ? updatedOrder : o)
          );
          setFilteredOrders(prevOrders =>
            prevOrders.map(o => o.id === updatedOrder.id ? updatedOrder : o)
          );

          // Update the selected order for the modal
          setSelectedOrder(updatedOrder);
        }

        // Don't close dialog - let user see "Commande Prête" button if all baskets picked up
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

  const handleAcceptOrder = async (order: Order) => {
    try {
      setAcceptingOrder(true);
      const response = await fetch("/api/glovo/accept-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order.orderId,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast({
          title: "✅ Commande acceptée",
          description: `Commande ${order.orderCode || order.orderId} acceptée avec succès`,
        });

        // Re-fetch the specific order to update modal
        const orderResponse = await fetch(`/api/orders/${order.id}`);
        if (orderResponse.ok) {
          const orderData = await orderResponse.json();
          const updatedOrder = orderData.order;

          // Update the order in the orders array without triggering loading state
          setOrders(prevOrders =>
            prevOrders.map(o => o.id === updatedOrder.id ? updatedOrder : o)
          );
          setFilteredOrders(prevOrders =>
            prevOrders.map(o => o.id === updatedOrder.id ? updatedOrder : o)
          );

          // Update the selected order for the modal
          setSelectedOrder(updatedOrder);
        }
      } else {
        toast({
          title: "Erreur",
          description: data.error || data.suggestion || "Impossible d'accepter la commande",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error accepting order:", error);
      toast({
        title: "Erreur",
        description: "Erreur lors de l'acceptation de la commande",
        variant: "destructive",
      });
    } finally {
      setAcceptingOrder(false);
    }
  };

  const handleMarkOrderReady = async (orderId: string) => {
    try {
      setMarkingReady(true);
      const response = await fetch(`/api/collaborateur/orders/${orderId}/mark-ready`, {
        method: "POST",
      });

      if (response.ok) {
        toast({
          title: "✅ Commande prête",
          description: "Le client a été notifié par WhatsApp",
        });
        fetchOrders();
        setDetailsOpen(false);
      } else {
        const errorData = await response.json();
        toast({
          title: "Erreur",
          description: errorData.error || "Impossible de marquer la commande comme prête",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error marking order as ready:", error);
      toast({
        title: "Erreur",
        description: "Erreur lors de la mise à jour",
        variant: "destructive",
      });
    } finally {
      setMarkingReady(false);
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

  const getOrderStatus = (order: Order): {
    label: string;
    variant: "default" | "secondary" | "outline" | "destructive"
  } => {
    const status = order.status as OrderStatus;

    switch (status) {
      case OrderStatus.DELIVERED:
        return { label: getStatusLabel(OrderStatus.DELIVERED), variant: "default" };
      case OrderStatus.READY:
      case OrderStatus.DISPATCHED:
        return { label: getStatusLabel(status), variant: "default" };
      case OrderStatus.ACCEPTED:
      case OrderStatus.PREPARING:
        return { label: getStatusLabel(status), variant: "secondary" };
      case OrderStatus.CREATED:
        return { label: getStatusLabel(OrderStatus.CREATED), variant: "outline" };
      case OrderStatus.CANCELLED:
        return { label: getStatusLabel(OrderStatus.CANCELLED), variant: "destructive" };
      default:
        return { label: getStatusLabel(status), variant: "outline" };
    }
  };

  const countReadyBaskets = (order: Order): number => {
    let count = 0;
    if (order.metadata?.supplierStatuses) {
      Object.values(order.metadata.supplierStatuses).forEach((status) => {
        if (status.status === "READY" && !status.pickedUp && status.basket) {
          count++;
        }
      });
    }
    return count;
  };

  // Determine order alert color based on COLLABORATEUR perspective
  const getOrderAlertClass = (order: Order): { bgClass: string; borderClass: string } => {
    const now = new Date();
    const supplierStatuses = order.metadata?.supplierStatuses;

    // If all baskets picked up - BLUE (done)
    if (supplierStatuses && Object.keys(supplierStatuses).length > 0) {
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Toutes les Commandes</h1>
          <p className="text-gray-600">
            Gérer et suivre toutes les commandes
          </p>
        </div>
        <Button onClick={fetchOrders} variant="outline">
          <ShoppingCart className="w-4 h-4 mr-2" />
          Actualiser
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filtres
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Rechercher par code, client..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrer par statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tous les statuts</SelectItem>
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
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>Liste des Commandes ({filteredOrders.length})</CardTitle>
          <CardDescription>
            Cliquez sur une commande pour voir les détails
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredOrders.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <ShoppingCart className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>Aucune commande trouvée</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
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
                  {filteredOrders.map((order) => {
                    const statusInfo = getOrderStatus(order);
                    const alertClass = getOrderAlertClass(order);
                    const readyBasketsCount = countReadyBaskets(order);
                    const readyBaskets: Array<{ supplierId: string; basket: number; supplierName?: string }> = [];
                    let hasNoBasketOrders = false;

                    if (order.metadata?.supplierStatuses) {
                      Object.entries(order.metadata.supplierStatuses).forEach(([supplierId, status]) => {
                        if (status.status === "READY" && !status.pickedUp && status.basket) {
                          readyBaskets.push({
                            supplierId,
                            basket: status.basket,
                            supplierName: status.supplierName,
                          });
                        }
                        if (status.status === "READY" && !status.pickedUp && !status.basket) {
                          hasNoBasketOrders = true;
                        }
                      });
                    }

                    return (
                      <TableRow key={order.id} className={`cursor-pointer hover:bg-gray-50 ${alertClass.bgClass} ${alertClass.borderClass}`}>
                        <TableCell className="font-mono font-bold">
                          {order.orderCode || order.orderId.substring(0, 8)}
                        </TableCell>
                        <TableCell>
                          <span className="text-gray-400">Confidentiel</span>
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatDate(order.orderTime)}
                        </TableCell>
                        <TableCell>
                          {readyBasketsCount > 0 || hasNoBasketOrders ? (
                            <div className="flex gap-1 flex-wrap">
                              {readyBaskets.map((basket, idx) => (
                                <Badge
                                  key={idx}
                                  variant="outline"
                                  className="bg-purple-50 border-purple-300"
                                >
                                  {basket.basket}
                                </Badge>
                              ))}
                              {hasNoBasketOrders && (
                                <Badge
                                  variant="outline"
                                  className="bg-orange-50 border-orange-300 text-orange-700"
                                >
                                  ⚠️
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">-</span>
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
                            Voir Détails
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
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
                  <p className="text-sm text-gray-600">Client</p>
                  <p className="font-medium text-gray-400">Confidentiel</p>
                </div>
              </div>

              {/* Accept Order Button - Show only for CREATED orders */}
              {selectedOrder.status === OrderStatus.CREATED && (
                <div className="border-2 border-blue-300 bg-blue-50 rounded-lg p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-lg mb-1 text-blue-900">
                        📋 Nouvelle commande
                      </h3>
                      <p className="text-sm text-blue-700">
                        Acceptez cette commande pour confirmer au client que vous commencez la préparation (30 min estimé)
                      </p>
                    </div>
                    <Button
                      onClick={() => handleAcceptOrder(selectedOrder)}
                      disabled={acceptingOrder}
                      size="lg"
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {acceptingOrder ? (
                        <>
                          <Clock className="w-5 h-5 mr-2 animate-spin" />
                          Acceptation...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-5 h-5 mr-2" />
                          Accepter Commande
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}

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

              {/* Baskets Ready for Pickup */}
              {selectedOrder.metadata?.supplierStatuses && (() => {
                const statuses = selectedOrder.metadata.supplierStatuses;
                const allPickedUp = Object.values(statuses).every((s) => s.pickedUp === true);
                const hasPickedUpBaskets = Object.values(statuses).some((s) => s.pickedUp === true);
                const hasUnpickedBaskets = Object.values(statuses).some(
                  (s) => s.status === "READY" && !s.pickedUp && s.basket
                );
                const hasNoBasketOrders = Object.values(statuses).some(
                  (s) => s.status === "READY" && !s.pickedUp && !s.basket
                );
                const hasCancelledSuppliers = Object.values(statuses).some(
                  (s) => s.status === "CANCELLED"
                );
                const hasPartialSuppliers = Object.values(statuses).some(
                  (s) => s.status === "PARTIAL"
                );

                return (
                  <div>
                    {/* Cancelled Suppliers (all products unavailable) */}
                    {hasCancelledSuppliers && (
                      <>
                        <h3 className="font-semibold mb-3 text-red-900">❌ Fournisseurs Annulés</h3>
                        <div className="space-y-3 mb-6">
                          {Object.entries(statuses).map(([supplierId, status]) => {
                            if (status.status === "CANCELLED") {
                              return (
                                <div
                                  key={supplierId}
                                  className="p-4 bg-red-50 border-2 border-red-200 rounded-lg"
                                >
                                  <div className="flex items-start gap-3">
                                    <div className="bg-red-600 text-white rounded-full w-10 h-10 flex items-center justify-center font-bold text-lg flex-shrink-0">
                                      ❌
                                    </div>
                                    <div className="flex-1">
                                      <p className="font-semibold text-red-900">
                                        {status.supplierName || "Fournisseur"}
                                      </p>
                                      <p className="text-sm text-red-700">
                                        AUCUN produit disponible - Commande annulée
                                      </p>
                                      <p className="text-xs text-red-600 mt-1">
                                        Montant facturable: 0 DH (original: {(status.originalTotal || 0) / 100} DH)
                                      </p>
                                      <p className="text-xs text-red-600 mt-1 italic">
                                        ⚠️ Modifiez la commande Glovo manuellement
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          })}
                        </div>
                      </>
                    )}

                    {/* Partial Suppliers (some products unavailable) */}
                    {hasPartialSuppliers && (
                      <>
                        <h3 className="font-semibold mb-3 text-orange-900">⚠️ Fournisseurs Partiels</h3>
                        <div className="space-y-3 mb-6">
                          {Object.entries(statuses).map(([supplierId, status]) => {
                            if (status.status === "PARTIAL") {
                              const unavailableProducts = status.unavailableProducts || [];
                              return (
                                <div
                                  key={supplierId}
                                  className="p-4 bg-red-50 border-2 border-red-200 rounded-lg"
                                >
                                  <div className="flex items-start gap-3">
                                    <div className="bg-orange-600 text-white rounded-full w-10 h-10 flex items-center justify-center font-bold text-lg flex-shrink-0">
                                      ⚠️
                                    </div>
                                    <div className="flex-1">
                                      <p className="font-semibold text-orange-900">
                                        {status.supplierName || "Fournisseur"}
                                      </p>
                                      <p className="text-sm text-orange-700">
                                        {unavailableProducts.length} produit(s) indisponible(s)
                                      </p>
                                      <div className="mt-2 space-y-1">
                                        {unavailableProducts.map((sku: string) => {
                                          const prod = selectedOrder.products.find(p => p.sku === sku);
                                          return (
                                            <p key={sku} className="text-xs text-red-700 line-through">
                                              • {prod?.name || sku}
                                            </p>
                                          );
                                        })}
                                      </div>
                                      <p className="text-xs text-orange-600 mt-2">
                                        Montant facturable: {(status.billableAmount || 0) / 100} DH
                                        (original: {(status.originalTotal || 0) / 100} DH)
                                      </p>
                                      <p className="text-xs text-orange-600 mt-1 italic">
                                        ⚠️ Modifiez la commande Glovo pour retirer les produits indisponibles
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          })}
                        </div>
                      </>
                    )}

                    {hasUnpickedBaskets && (
                      <>
                        <h3 className="font-semibold mb-3">Paniers Prêts à Récupérer</h3>
                        <div className="space-y-3">
                          {Object.entries(statuses).map(([supplierId, status]) => {
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
                      </>
                    )}

                    {/* Orders without baskets (all baskets full) */}
                    {hasNoBasketOrders && (
                      <>
                        <h3 className="font-semibold mb-3 mt-6">⚠️ Produits Prêts Sans Panier</h3>
                        <div className="space-y-3">
                          {Object.entries(statuses).map(([supplierId, status]) => {
                            if (status.status === "READY" && !status.pickedUp && !status.basket) {
                              return (
                                <div
                                  key={supplierId}
                                  className="flex items-center justify-between p-4 bg-orange-50 border-2 border-orange-300 rounded-lg"
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="bg-orange-500 text-white rounded-full w-10 h-10 flex items-center justify-center font-bold text-lg">
                                      ⚠️
                                    </div>
                                    <div>
                                      <p className="font-semibold text-orange-900">
                                        {status.supplierName || "Fournisseur"}
                                      </p>
                                      <p className="text-sm text-orange-700">
                                        Produits prêts depuis: {formatDate(status.markedReadyAt)}
                                      </p>
                                      <p className="text-xs text-orange-600 mt-1">
                                        Tous les paniers étaient pleins - à récupérer directement
                                      </p>
                                    </div>
                                  </div>
                                  <Button
                                    onClick={() => handlePickupBasket(selectedOrder.id, supplierId, null)}
                                    className="bg-orange-600 hover:bg-orange-700"
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
                      </>
                    )}

                    {/* Commande Prête Button - Show when at least one basket picked up (for testing) */}
                    {hasPickedUpBaskets && selectedOrder.status !== OrderStatus.READY && selectedOrder.status !== OrderStatus.DELIVERED && (
                      <div className={`border-2 rounded-lg p-6 ${allPickedUp ? 'bg-green-50 border-green-300' : 'bg-yellow-50 border-yellow-300'}`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className={`font-bold text-lg mb-1 ${allPickedUp ? 'text-green-900' : 'text-yellow-900'}`}>
                              {allPickedUp ? '✅ Tous les paniers récupérés' : '⚠️ Paniers partiellement récupérés'}
                            </h3>
                            <p className={`text-sm ${allPickedUp ? 'text-green-700' : 'text-yellow-700'}`}>
                              {allPickedUp
                                ? 'Cliquez sur le bouton pour marquer la commande comme prête et notifier le client par WhatsApp'
                                : 'Mode test: Vous pouvez envoyer le message même si tous les paniers ne sont pas récupérés'}
                            </p>
                          </div>
                          <Button
                            onClick={() => handleMarkOrderReady(selectedOrder.id)}
                            disabled={markingReady}
                            size="lg"
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            {markingReady ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                                Envoi...
                              </>
                            ) : (
                              <>
                                <Send className="w-5 h-5 mr-2" />
                                Commande Prête
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

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
