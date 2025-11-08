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
import { Input } from "@/components/ui/input";
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
import { Package, ShoppingCart, CheckCircle, Search, Filter, AlertCircle, Send } from "lucide-react";
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

export default function CollaborateurCommandesPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [markingReady, setMarkingReady] = useState(false);
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
        fetchOrders();
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
                <SelectItem value="PENDING">En attente</SelectItem>
                <SelectItem value="ACCEPTED">En préparation</SelectItem>
                <SelectItem value="COMPLETED">Complétée</SelectItem>
                <SelectItem value="DELIVERED">Livrée</SelectItem>
                <SelectItem value="CANCELLED">Annulée</SelectItem>
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
                          {readyBasketsCount > 0 ? (
                            <div className="flex gap-1">
                              {readyBaskets.map((basket, idx) => (
                                <Badge
                                  key={idx}
                                  variant="outline"
                                  className="bg-purple-50 border-purple-300"
                                >
                                  {basket.basket}
                                </Badge>
                              ))}
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
              {selectedOrder.metadata?.supplierStatuses && (() => {
                const statuses = selectedOrder.metadata.supplierStatuses;
                const allPickedUp = Object.values(statuses).every((s) => s.pickedUp === true);
                const hasUnpickedBaskets = Object.values(statuses).some(
                  (s) => s.status === "READY" && !s.pickedUp && s.basket
                );

                return (
                  <div>
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

                    {/* Commande Prête Button - Show when all baskets picked up */}
                    {allPickedUp && selectedOrder.status !== "READY_FOR_PICKUP" && selectedOrder.status !== "DELIVERED" && (
                      <div className="bg-green-50 border-2 border-green-300 rounded-lg p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-bold text-green-900 text-lg mb-1">
                              ✅ Tous les paniers récupérés
                            </h3>
                            <p className="text-sm text-green-700">
                              Cliquez sur le bouton pour marquer la commande comme prête et notifier le client par WhatsApp
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
