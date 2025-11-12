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
  Users,
  Search,
  Filter,
  RefreshCw,
  Eye,
  Phone,
  Mail,
  MapPin,
  Star,
  TrendingUp,
  Crown,
  Award,
  User,
  AlertCircle,
  Download,
  FileSpreadsheet,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

interface Customer {
  id: string;
  phoneNumber: string;
  name?: string;
  email?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  totalOrders: number;
  totalSpent: number;
  averageOrderValue: number;
  lastOrderDate?: string;
  firstOrderDate?: string;
  customerLifetimeValue: number;
  loyaltyTier: string;
  churnRiskScore: number;
  isActive: boolean;
  preferredDeliveryTime?: string;
  favoriteProducts?: string[];
  deliveryNotes?: string;
  whatsappOptIn: boolean;
  smsOptIn: boolean;
  emailOptIn: boolean;
  createdAt: string;
  updatedAt: string;
  orders?: Order[];
}

interface Order {
  id: string;
  orderId: string;
  orderCode?: string;
  status: string;
  totalAmount?: number;
  currency?: string;
  orderTime?: string;
  createdAt: string;
}

interface CustomerFilters {
  loyaltyTier: string;
  isActive: string;
  search: string;
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<CustomerFilters>({
    loyaltyTier: "all",
    isActive: "all",
    search: "",
  });
  const { toast } = useToast();

  // Load customers
  const loadCustomers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/customers");
      if (response.ok) {
        const data = await response.json();
        setCustomers(data);
      } else {
        throw new Error("Erreur lors du chargement des clients");
      }
    } catch (error) {
      console.error("Error loading customers:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les clients",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  // Filter customers
  const filteredCustomers = customers.filter((customer) => {
    const matchesLoyaltyTier =
      filters.loyaltyTier === "all" ||
      customer.loyaltyTier === filters.loyaltyTier;
    const matchesActive =
      filters.isActive === "all" ||
      (filters.isActive === "active" && customer.isActive) ||
      (filters.isActive === "inactive" && !customer.isActive);
    const matchesSearch =
      filters.search === "" ||
      customer.name?.toLowerCase().includes(filters.search.toLowerCase()) ||
      customer.phoneNumber.includes(filters.search) ||
      customer.email?.toLowerCase().includes(filters.search.toLowerCase());

    return matchesLoyaltyTier && matchesActive && matchesSearch;
  });

  // Format price
  const formatPrice = (price: number, currency: string = "MAD") => {
    return `${(price / 100).toFixed(2)} ${currency}`;
  };

  // Format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return "Jamais";
    return new Date(dateString).toLocaleDateString("fr-FR");
  };

  // Get loyalty tier color
  const getLoyaltyTierColor = (tier: string) => {
    switch (tier) {
      case "VIP":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "GOLD":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "SILVER":
        return "bg-gray-100 text-gray-800 border-gray-200";
      case "BRONZE":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "NEW":
        return "bg-blue-100 text-blue-800 border-blue-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  // Get loyalty tier icon
  const getLoyaltyTierIcon = (tier: string) => {
    switch (tier) {
      case "VIP":
        return <Crown className="w-4 h-4" />;
      case "GOLD":
        return <Award className="w-4 h-4" />;
      case "SILVER":
        return <Star className="w-4 h-4" />;
      case "BRONZE":
        return <User className="w-4 h-4" />;
      case "NEW":
        return <User className="w-4 h-4" />;
      default:
        return <User className="w-4 h-4" />;
    }
  };

  // Get churn risk color
  const getChurnRiskColor = (score: number) => {
    if (score >= 0.7) return "text-red-600";
    if (score >= 0.4) return "text-yellow-600";
    return "text-green-600";
  };

  // Export to CSV
  const exportToCSV = () => {
    const headers = [
      "Nom",
      "Téléphone",
      "Email",
      "Ville",
      "Adresse",
      "Nombre Commandes",
      "Total Dépensé (DH)",
      "Valeur Moyenne (DH)",
      "CLV (DH)",
      "Tier Fidélité",
      "Risque Churn",
      "Dernière Commande",
      "Première Commande",
      "WhatsApp",
      "SMS",
      "Email Opt-in",
      "Statut",
      "Date Création",
    ];

    const rows = filteredCustomers.map((customer) => [
      customer.name || "N/A",
      customer.phoneNumber,
      customer.email || "N/A",
      customer.city || "N/A",
      customer.address || "N/A",
      customer.totalOrders,
      (customer.totalSpent / 100).toFixed(2),
      (customer.averageOrderValue / 100).toFixed(2),
      (customer.customerLifetimeValue / 100).toFixed(2),
      customer.loyaltyTier,
      customer.churnRiskScore.toFixed(2),
      formatDate(customer.lastOrderDate),
      formatDate(customer.firstOrderDate),
      customer.whatsappOptIn ? "Oui" : "Non",
      customer.smsOptIn ? "Oui" : "Non",
      customer.emailOptIn ? "Oui" : "Non",
      customer.isActive ? "Actif" : "Inactif",
      formatDate(customer.createdAt),
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      ),
    ].join("\n");

    const blob = new Blob(["\ufeff" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `clients_natura_beldi_${new Date().toISOString().split("T")[0]}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "✅ Export réussi",
      description: `${filteredCustomers.length} clients exportés en CSV`,
    });
  };

  // Export to Excel (using HTML table method)
  const exportToExcel = () => {
    const tableHTML = `
      <table>
        <thead>
          <tr>
            <th>Nom</th>
            <th>Téléphone</th>
            <th>Email</th>
            <th>Ville</th>
            <th>Adresse</th>
            <th>Nombre Commandes</th>
            <th>Total Dépensé (DH)</th>
            <th>Valeur Moyenne (DH)</th>
            <th>CLV (DH)</th>
            <th>Tier Fidélité</th>
            <th>Risque Churn</th>
            <th>Dernière Commande</th>
            <th>Première Commande</th>
            <th>WhatsApp</th>
            <th>SMS</th>
            <th>Email Opt-in</th>
            <th>Statut</th>
            <th>Date Création</th>
          </tr>
        </thead>
        <tbody>
          ${filteredCustomers
            .map(
              (customer) => `
            <tr>
              <td>${customer.name || "N/A"}</td>
              <td>${customer.phoneNumber}</td>
              <td>${customer.email || "N/A"}</td>
              <td>${customer.city || "N/A"}</td>
              <td>${customer.address || "N/A"}</td>
              <td>${customer.totalOrders}</td>
              <td>${(customer.totalSpent / 100).toFixed(2)}</td>
              <td>${(customer.averageOrderValue / 100).toFixed(2)}</td>
              <td>${(customer.customerLifetimeValue / 100).toFixed(2)}</td>
              <td>${customer.loyaltyTier}</td>
              <td>${customer.churnRiskScore.toFixed(2)}</td>
              <td>${formatDate(customer.lastOrderDate)}</td>
              <td>${formatDate(customer.firstOrderDate)}</td>
              <td>${customer.whatsappOptIn ? "Oui" : "Non"}</td>
              <td>${customer.smsOptIn ? "Oui" : "Non"}</td>
              <td>${customer.emailOptIn ? "Oui" : "Non"}</td>
              <td>${customer.isActive ? "Actif" : "Inactif"}</td>
              <td>${formatDate(customer.createdAt)}</td>
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>
    `;

    const blob = new Blob([tableHTML], {
      type: "application/vnd.ms-excel",
    });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `clients_natura_beldi_${new Date().toISOString().split("T")[0]}.xls`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "✅ Export réussi",
      description: `${filteredCustomers.length} clients exportés en Excel`,
    });
  };

  // Customer Details Modal
  const CustomerDetailsModal = ({ customer }: { customer: Customer }) => (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Eye className="w-4 h-4 mr-1" />
          Détails
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getLoyaltyTierIcon(customer.loyaltyTier)}
            {customer.name || "Client"}
            <Badge className={getLoyaltyTierColor(customer.loyaltyTier)}>
              {customer.loyaltyTier}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Customer Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium text-gray-500">
                Téléphone
              </Label>
              <p className="flex items-center gap-2">
                <Phone className="w-4 h-4" />
                {customer.phoneNumber}
              </p>
            </div>
            {customer.email && (
              <div>
                <Label className="text-sm font-medium text-gray-500">
                  Email
                </Label>
                <p className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  {customer.email}
                </p>
              </div>
            )}
            {customer.address && (
              <div className="md:col-span-2">
                <Label className="text-sm font-medium text-gray-500">
                  Adresse
                </Label>
                <p className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  {customer.address}
                  {customer.city && `, ${customer.city}`}
                  {customer.postalCode && ` ${customer.postalCode}`}
                </p>
              </div>
            )}
          </div>

          <Separator />

          {/* Analytics */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Analytics</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {customer.totalOrders}
                </div>
                <div className="text-sm text-gray-600">Commandes</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {formatPrice(customer.totalSpent)}
                </div>
                <div className="text-sm text-gray-600">Total dépensé</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {formatPrice(customer.averageOrderValue)}
                </div>
                <div className="text-sm text-gray-600">Panier moyen</div>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">
                  {formatPrice(customer.customerLifetimeValue)}
                </div>
                <div className="text-sm text-gray-600">Valeur vie client</div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Order History */}
          <div>
            <h3 className="text-lg font-semibold mb-4">
              Historique des commandes
            </h3>
            {customer.orders && customer.orders.length > 0 ? (
              <div className="space-y-2">
                {customer.orders.slice(0, 10).map((order) => (
                  <div
                    key={order.id}
                    className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <div className="font-medium">
                        {order.orderCode || order.orderId}
                      </div>
                      <div className="text-sm text-gray-500">
                        {formatDate(order.orderTime || order.createdAt)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">
                        {formatPrice(order.totalAmount || 0)}
                      </div>
                      <Badge variant="outline">{order.status}</Badge>
                    </div>
                  </div>
                ))}
                {customer.orders.length > 10 && (
                  <p className="text-sm text-gray-500 text-center">
                    ... et {customer.orders.length - 10} autres commandes
                  </p>
                )}
              </div>
            ) : (
              <p className="text-gray-500">Aucune commande trouvée</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Clients</h1>
          <p className="text-gray-600">
            Gestion et analytics des clients ({filteredCustomers.length}{" "}
            clients)
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={exportToCSV}
            disabled={filteredCustomers.length === 0}
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Button
            variant="outline"
            onClick={exportToExcel}
            disabled={filteredCustomers.length === 0}
          >
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            Export Excel
          </Button>
          <Button onClick={loadCustomers} disabled={loading}>
            <RefreshCw
              className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`}
            />
            Actualiser
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  Total Clients
                </p>
                <p className="text-2xl font-bold">{customers.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  Clients Actifs
                </p>
                <p className="text-2xl font-bold">
                  {customers.filter((c) => c.isActive).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Crown className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Clients VIP</p>
                <p className="text-2xl font-bold">
                  {customers.filter((c) => c.loyaltyTier === "VIP").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <AlertCircle className="h-8 w-8 text-red-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  Risque Churn
                </p>
                <p className="text-2xl font-bold">
                  {customers.filter((c) => c.churnRiskScore >= 0.7).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="search">Recherche</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  id="search"
                  placeholder="Nom, téléphone, email..."
                  value={filters.search}
                  onChange={(e) =>
                    setFilters({ ...filters, search: e.target.value })
                  }
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="loyaltyTier">Niveau de fidélité</Label>
              <Select
                value={filters.loyaltyTier}
                onValueChange={(value) =>
                  setFilters({ ...filters, loyaltyTier: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Tous les niveaux" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les niveaux</SelectItem>
                  <SelectItem value="VIP">VIP</SelectItem>
                  <SelectItem value="GOLD">Gold</SelectItem>
                  <SelectItem value="SILVER">Silver</SelectItem>
                  <SelectItem value="BRONZE">Bronze</SelectItem>
                  <SelectItem value="NEW">Nouveau</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="isActive">Statut</Label>
              <Select
                value={filters.isActive}
                onValueChange={(value) =>
                  setFilters({ ...filters, isActive: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Tous les statuts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="active">Actifs</SelectItem>
                  <SelectItem value="inactive">Inactifs</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Customers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Liste des clients ({filteredCustomers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin" />
              <span className="ml-2">Chargement des clients...</span>
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Aucun client trouvé</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Niveau</TableHead>
                    <TableHead>Commandes</TableHead>
                    <TableHead>Total dépensé</TableHead>
                    <TableHead>Dernière commande</TableHead>
                    <TableHead>Risque churn</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomers.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {customer.name || "Client anonyme"}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            ID: {customer.id.slice(-8)}
                          </p>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div>
                          <p className="flex items-center gap-1 text-sm">
                            <Phone className="w-3 h-3" />
                            {customer.phoneNumber}
                          </p>
                          {customer.email && (
                            <p className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Mail className="w-3 h-3" />
                              {customer.email}
                            </p>
                          )}
                        </div>
                      </TableCell>

                      <TableCell>
                        <Badge
                          className={getLoyaltyTierColor(customer.loyaltyTier)}
                        >
                          <span className="flex items-center space-x-1">
                            {getLoyaltyTierIcon(customer.loyaltyTier)}
                            <span>{customer.loyaltyTier}</span>
                          </span>
                        </Badge>
                      </TableCell>

                      <TableCell>
                        <div className="text-center">
                          <p className="font-medium">{customer.totalOrders}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatPrice(customer.averageOrderValue)} moy.
                          </p>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {formatPrice(customer.totalSpent)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            CLV: {formatPrice(customer.customerLifetimeValue)}
                          </p>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div>
                          <p className="text-sm">
                            {formatDate(customer.lastOrderDate)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Premier: {formatDate(customer.firstOrderDate)}
                          </p>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div
                          className={`text-sm font-medium ${getChurnRiskColor(
                            customer.churnRiskScore
                          )}`}
                        >
                          {customer.churnRiskScore >= 0.7
                            ? "Élevé"
                            : customer.churnRiskScore >= 0.4
                            ? "Moyen"
                            : "Faible"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {(customer.churnRiskScore * 100).toFixed(0)}%
                        </div>
                      </TableCell>

                      <TableCell>
                        <CustomerDetailsModal customer={customer} />
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
