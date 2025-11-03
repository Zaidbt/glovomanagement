"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Package,
  CheckCircle,
  XCircle,
  Search,
  Filter,
  Store,
  DollarSign,
  AlertCircle,
  ShoppingCart,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface Product {
  id: string;
  sku: string;
  name: string;
  price: number;
  isActive: boolean;
  category1?: string;
  category2?: string;
  imageUrl?: string;
  store: {
    id: string;
    name: string;
    address: string;
  };
}

interface ProductAssignment {
  id: string;
  priority: number;
  isActive: boolean;
  product: Product;
}

interface Store {
  id: string;
  name: string;
  address: string;
}

export default function SupplierDashboard() {
  const router = useRouter();
  const [assignments, setAssignments] = useState<ProductAssignment[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStore, setSelectedStore] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [activeFilter, setActiveFilter] = useState<string>("all");

  // Stats
  const [stats, setStats] = useState({
    totalProducts: 0,
    activeProducts: 0,
    inactiveProducts: 0,
    stores: 0,
  });

  // Edit dialog
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [newPrice, setNewPrice] = useState<string>("");
  const [newIsActive, setNewIsActive] = useState<boolean>(true);

  // Messages
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();

      if (selectedStore !== "all") queryParams.set("storeId", selectedStore);
      if (searchTerm) queryParams.set("search", searchTerm);
      if (selectedCategory !== "all")
        queryParams.set("category", selectedCategory);
      if (activeFilter !== "all")
        queryParams.set("active", activeFilter === "active" ? "true" : "false");

      const response = await fetch(
        `/api/supplier/my-products?${queryParams.toString()}`
      );

      if (response.ok) {
        const data = await response.json();
        setAssignments(data.assignments || []);
        setStores(data.stores || []);
        setCategories(data.categories || []);
        setStats(data.stats || { totalProducts: 0, activeProducts: 0, inactiveProducts: 0, stores: 0 });
      } else {
        setErrorMessage("Erreur lors du chargement des produits");
      }
    } catch (error) {
      console.error("Error fetching products:", error);
      setErrorMessage("Erreur lors du chargement des produits");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickToggle = async (
    productId: string,
    storeId: string,
    currentIsActive: boolean
  ) => {
    try {
      setUpdating(productId);
      setErrorMessage("");
      setSuccessMessage("");

      const response = await fetch(
        `/api/stores/${storeId}/products/${productId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            isActive: !currentIsActive,
            syncToGlovo: true,
          }),
        }
      );

      if (response.ok) {
        setSuccessMessage(
          `Produit ${!currentIsActive ? "activé" : "désactivé"} avec succès`
        );
        fetchProducts();

        // Clear success message after 3 seconds
        setTimeout(() => setSuccessMessage(""), 3000);
      } else {
        const data = await response.json();
        setErrorMessage(data.error || "Erreur lors de la mise à jour");
      }
    } catch (error) {
      console.error("Error updating product:", error);
      setErrorMessage("Erreur lors de la mise à jour");
    } finally {
      setUpdating(null);
    }
  };

  const openEditDialog = (product: Product) => {
    setEditingProduct(product);
    setNewPrice((product.price / 100).toFixed(2));
    setNewIsActive(product.isActive);
    setEditDialogOpen(true);
    setErrorMessage("");
    setSuccessMessage("");
  };

  const handleSaveEdit = async () => {
    if (!editingProduct) return;

    try {
      setUpdating(editingProduct.id);

      const priceInDH = parseFloat(newPrice);
      if (isNaN(priceInDH) || priceInDH < 0) {
        setErrorMessage("Prix invalide");
        return;
      }

      const response = await fetch(
        `/api/stores/${editingProduct.store.id}/products/${editingProduct.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            price: priceInDH, // API will convert to centimes
            isActive: newIsActive,
            syncToGlovo: true,
          }),
        }
      );

      if (response.ok) {
        setSuccessMessage("Produit mis à jour avec succès");
        setEditDialogOpen(false);
        setEditingProduct(null);
        fetchProducts();

        setTimeout(() => setSuccessMessage(""), 3000);
      } else {
        const data = await response.json();
        setErrorMessage(data.error || "Erreur lors de la mise à jour");
      }
    } catch (error) {
      console.error("Error updating product:", error);
      setErrorMessage("Erreur lors de la mise à jour");
    } finally {
      setUpdating(null);
    }
  };

  const formatPrice = (centimes: number) => {
    return (centimes / 100).toFixed(2) + " DH";
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Mes Produits</h1>
          <p className="text-gray-600">
            Gérez la disponibilité et les prix de vos produits
          </p>
        </div>
        <Button
          onClick={() => router.push("/fournisseur/orders")}
          variant="default"
          className="bg-blue-600 hover:bg-blue-700"
        >
          <ShoppingCart className="w-4 h-4 mr-2" />
          Mes Commandes
        </Button>
      </div>

      {/* Messages */}
      {successMessage && (
        <Alert className="mb-4 border-green-500 bg-green-50">
          <CheckCircle className="w-4 h-4 text-green-600" />
          <AlertDescription className="text-green-800">
            {successMessage}
          </AlertDescription>
        </Alert>
      )}

      {errorMessage && (
        <Alert className="mb-4 border-red-500 bg-red-50">
          <AlertCircle className="w-4 h-4 text-red-600" />
          <AlertDescription className="text-red-800">
            {errorMessage}
          </AlertDescription>
        </Alert>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Produits
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalProducts}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Disponibles
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {stats.activeProducts}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Rupture
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-500">
              {stats.inactiveProducts}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Stores
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.stores}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filtres
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label>Recherche</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Nom du produit..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <Label>Store</Label>
              <Select value={selectedStore} onValueChange={setSelectedStore}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les stores</SelectItem>
                  {stores.map((store) => (
                    <SelectItem key={store.id} value={store.id}>
                      {store.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Catégorie</Label>
              <Select
                value={selectedCategory}
                onValueChange={setSelectedCategory}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Statut</Label>
              <Select value={activeFilter} onValueChange={setActiveFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="active">Disponibles</SelectItem>
                  <SelectItem value="inactive">Rupture</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-4">
            <Button onClick={fetchProducts} variant="outline" size="sm">
              Appliquer les filtres
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Products Grid */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Mes Produits ({assignments.length})
          </CardTitle>
          <CardDescription>
            Cliquez sur un produit pour modifier le prix et la disponibilité
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-500">
              Chargement...
            </div>
          ) : assignments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Package className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>Aucun produit assigné</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {assignments.map((assignment) => (
                <Card
                  key={assignment.id}
                  className="hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => openEditDialog(assignment.product)}
                >
                  <CardContent className="pt-6">
                    <div className="space-y-3">
                      {/* Product image placeholder */}
                      <div className="w-full h-32 bg-gray-100 rounded-lg flex items-center justify-center">
                        {assignment.product.imageUrl ? (
                          <img
                            src={assignment.product.imageUrl}
                            alt={assignment.product.name}
                            className="w-full h-full object-cover rounded-lg"
                          />
                        ) : (
                          <Package className="w-12 h-12 text-gray-300" />
                        )}
                      </div>

                      {/* Product info */}
                      <div>
                        <h3 className="font-semibold line-clamp-2 mb-1">
                          {assignment.product.name}
                        </h3>
                        <div className="flex items-center gap-2 mb-2">
                          <Store className="w-3 h-3 text-gray-400" />
                          <span className="text-xs text-gray-600">
                            {assignment.product.store.name}
                          </span>
                        </div>
                      </div>

                      {/* Category and priority */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {assignment.product.category1 && (
                          <Badge variant="outline" className="text-xs">
                            {assignment.product.category1}
                          </Badge>
                        )}
                        <Badge variant="secondary" className="text-xs">
                          Priorité #{assignment.priority}
                        </Badge>
                      </div>

                      {/* Price and status */}
                      <div className="flex items-center justify-between pt-2 border-t">
                        <div className="flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-gray-400" />
                          <span className="text-lg font-bold">
                            {formatPrice(assignment.product.price)}
                          </span>
                        </div>
                        <Button
                          size="sm"
                          variant={
                            assignment.product.isActive ? "default" : "secondary"
                          }
                          onClick={(e) => {
                            e.stopPropagation();
                            handleQuickToggle(
                              assignment.product.id,
                              assignment.product.store.id,
                              assignment.product.isActive
                            );
                          }}
                          disabled={updating === assignment.product.id}
                        >
                          {assignment.product.isActive ? (
                            <>
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Disponible
                            </>
                          ) : (
                            <>
                              <XCircle className="w-4 h-4 mr-1" />
                              Rupture
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier le produit</DialogTitle>
            <DialogDescription>
              {editingProduct?.name}
              <br />
              <span className="text-xs text-gray-500">
                {editingProduct?.store.name}
              </span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="price">Prix (DH)</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is-active"
                checked={newIsActive}
                onChange={(e) => setNewIsActive(e.target.checked)}
                className="w-4 h-4"
              />
              <Label htmlFor="is-active" className="cursor-pointer">
                Produit disponible
              </Label>
            </div>

            <Alert>
              <AlertCircle className="w-4 h-4" />
              <AlertDescription>
                Les modifications seront synchronisées automatiquement avec Glovo
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditDialogOpen(false);
                setEditingProduct(null);
              }}
            >
              Annuler
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={updating === editingProduct?.id}
            >
              {updating === editingProduct?.id
                ? "Enregistrement..."
                : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
