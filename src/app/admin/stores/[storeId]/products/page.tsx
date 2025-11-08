"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
  Upload,
  Trash2,
  Search,
  Filter,
  Package,
  AlertCircle,
  CheckCircle,
  ArrowLeft,
  RefreshCw,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Product {
  id: string;
  sku: string;
  name: string;
  price: number; // in centimes
  isActive: boolean;
  category1?: string;
  category2?: string;
  barcode?: string;
  imageUrl?: string;
  lastSyncedAt?: string;
  createdAt: string;
  updatedAt: string;
  suppliers: {
    id: string;
    priority: number;
    supplier: {
      id: string;
      name: string;
      email: string;
      phone?: string;
    };
  }[];
}

interface Store {
  id: string;
  name: string;
  address: string;
}

export default function StoreProductsPage() {
  const params = useParams();
  const router = useRouter();
  const storeId = params.storeId as string;

  const [store, setStore] = useState<Store | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [flushing, setFlushing] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [activeFilter, setActiveFilter] = useState<string>("all");

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
  });
  const [categories, setCategories] = useState<string[]>([]);

  // Dialogs
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [syncProgressOpen, setSyncProgressOpen] = useState(false);
  const [flushDialogOpen, setFlushDialogOpen] = useState(false);
  const [flushConfirmation, setFlushConfirmation] = useState("");
  const [productDetailOpen, setProductDetailOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Sync progress
  const [syncProgress, setSyncProgress] = useState({
    currentPage: 0,
    totalPages: 0,
    productsProcessed: 0,
    totalProducts: 0,
    percentage: 0,
    status: "Initialisation...",
  });

  // File upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [replaceExisting, setReplaceExisting] = useState(false);

  // Messages
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    fetchStore();
  }, [storeId]);

  // Live search - fetch products when filters change
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchProducts();
    }, 300); // Debounce 300ms

    return () => clearTimeout(timeoutId);
  }, [searchTerm, selectedCategory, activeFilter]);

  const fetchStore = async () => {
    try {
      const response = await fetch(`/api/stores/${storeId}`);
      if (response.ok) {
        const data = await response.json();
        setStore(data);
      }
    } catch (error) {
      console.error("Error fetching store:", error);
    }
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();

      if (searchTerm) queryParams.set("search", searchTerm);
      if (selectedCategory !== "all")
        queryParams.set("category", selectedCategory);
      if (activeFilter !== "all")
        queryParams.set("active", activeFilter === "active" ? "true" : "false");
      queryParams.set("limit", "1000"); // Get all products

      const response = await fetch(
        `/api/stores/${storeId}/products?${queryParams.toString()}`
      );

      if (response.ok) {
        const data = await response.json();
        setProducts(data.products || []);
        setStats(data.stats || { total: 0, active: 0, inactive: 0 });
        setCategories(data.categories || []);
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

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      const validTypes = [
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "text/csv",
      ];
      if (!validTypes.includes(file.type) && !file.name.match(/\.(xlsx?|csv)$/i)) {
        setErrorMessage("Format de fichier invalide. Utilisez Excel (.xlsx) ou CSV.");
        return;
      }
      setSelectedFile(file);
      setErrorMessage("");
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setErrorMessage("Veuillez sélectionner un fichier");
      return;
    }

    try {
      setUploading(true);
      setErrorMessage("");
      setSuccessMessage("");

      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("replaceExisting", replaceExisting.toString());

      const response = await fetch(`/api/stores/${storeId}/products/import`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setSuccessMessage(
          data.message ||
            `${data.results.created + data.results.updated} produits importés`
        );
        setUploadDialogOpen(false);
        setSelectedFile(null);
        setReplaceExisting(false);
        fetchProducts(); // Refresh list
      } else {
        setErrorMessage(data.error || "Erreur lors de l'import");
      }
    } catch (error) {
      console.error("Error uploading file:", error);
      setErrorMessage("Erreur lors de l'upload du fichier");
    } finally {
      setUploading(false);
    }
  };

  const handleSyncGlovo = async () => {
    try {
      setSyncing(true);
      setSyncProgressOpen(true);
      setErrorMessage("");
      setSuccessMessage("");

      // Reset progress
      setSyncProgress({
        currentPage: 0,
        totalPages: 0,
        productsProcessed: 0,
        totalProducts: 0,
        percentage: 0,
        status: "Connexion à l'API Glovo...",
      });

      // Simulate progress while the backend processes
      const progressInterval = setInterval(() => {
        setSyncProgress((prev) => {
          if (prev.percentage >= 95) return prev; // Cap at 95% until we get real response
          return {
            ...prev,
            percentage: Math.min(prev.percentage + 5, 95),
            status: prev.percentage < 30 ? "Récupération des produits depuis Glovo..." :
                   prev.percentage < 60 ? "Traitement des données..." :
                   "Sauvegarde dans la base de données...",
          };
        });
      }, 500);

      const response = await fetch(`/api/stores/${storeId}/products/sync-glovo`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          replaceExisting: false,
        }),
      });

      clearInterval(progressInterval);
      const data = await response.json();

      if (response.ok) {
        // Complete progress
        setSyncProgress({
          currentPage: data.results.total || 0,
          totalPages: data.results.total || 0,
          productsProcessed: data.results.created + data.results.updated,
          totalProducts: data.results.total,
          percentage: 100,
          status: "Synchronisation terminée!",
        });

        // Wait a bit to show completion
        setTimeout(() => {
          setSyncProgressOpen(false);
          setSuccessMessage(
            data.message ||
              `${data.results.created + data.results.updated} produits synchronisés depuis Glovo`
          );
          fetchProducts();
        }, 1500);
      } else {
        clearInterval(progressInterval);
        setSyncProgressOpen(false);
        setErrorMessage(data.error || "Erreur lors de la synchronisation Glovo");
      }
    } catch (error) {
      console.error("Error syncing Glovo products:", error);
      setSyncProgressOpen(false);
      setErrorMessage("Erreur lors de la synchronisation avec Glovo");
    } finally {
      setSyncing(false);
    }
  };

  const handleFlush = async () => {
    if (flushConfirmation !== "DELETE") {
      setErrorMessage('Veuillez taper "DELETE" pour confirmer');
      return;
    }

    try {
      setFlushing(true);
      setErrorMessage("");
      setSuccessMessage("");

      const response = await fetch(`/api/stores/${storeId}/products/flush`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ confirmation: "DELETE" }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccessMessage(
          `${data.deletedCount} produits supprimés avec succès`
        );
        setFlushDialogOpen(false);
        setFlushConfirmation("");
        fetchProducts(); // Refresh list
      } else {
        setErrorMessage(data.error || "Erreur lors de la suppression");
      }
    } catch (error) {
      console.error("Error flushing products:", error);
      setErrorMessage("Erreur lors de la suppression des produits");
    } finally {
      setFlushing(false);
    }
  };

  const formatPrice = (centimes: number) => {
    return (centimes / 100).toFixed(2) + " DH";
  };

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push("/admin/stores")}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour aux stores
        </Button>
      </div>

      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Catalogue Produits</h1>
          {store && (
            <p className="text-gray-600">
              {store.name} - {store.address}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setUploadDialogOpen(true)}>
            <Upload className="w-4 h-4 mr-2" />
            Importer
          </Button>
          <Button
            variant="outline"
            onClick={handleSyncGlovo}
            disabled={syncing}
            className="border-blue-500 text-blue-600 hover:bg-blue-50"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Synchronisation..." : "Synchroniser Glovo"}
          </Button>
          <Button
            variant="destructive"
            onClick={() => setFlushDialogOpen(true)}
            disabled={stats.total === 0}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Flush
          </Button>
        </div>
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Produits
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Actifs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {stats.active}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Inactifs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-400">
              {stats.inactive}
            </div>
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Recherche</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Nom, SKU, ou code barre..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <Label>Catégorie</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
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
                  <SelectItem value="active">Actifs</SelectItem>
                  <SelectItem value="inactive">Inactifs</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Produits ({products.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-500">
              Chargement...
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Package className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>Aucun produit trouvé</p>
              <p className="text-sm mt-2">
                Importez un fichier Excel/CSV pour commencer
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Image</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Nom</TableHead>
                    <TableHead>Prix</TableHead>
                    <TableHead>Catégorie</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Fournisseurs</TableHead>
                    <TableHead>Code Barre</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product) => (
                    <TableRow
                      key={product.id}
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => {
                        setSelectedProduct(product);
                        setProductDetailOpen(true);
                      }}
                    >
                      <TableCell>
                        {product.imageUrl ? (
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            className="w-12 h-12 object-cover rounded"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center">
                            <Package className="w-6 h-6 text-gray-400" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {product.sku.substring(0, 8)}...
                      </TableCell>
                      <TableCell className="font-medium">
                        {product.name}
                      </TableCell>
                      <TableCell>{formatPrice(product.price)}</TableCell>
                      <TableCell>
                        {product.category1 && (
                          <Badge variant="outline" className="text-xs">
                            {product.category1}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={product.isActive ? "default" : "secondary"}
                        >
                          {product.isActive ? "Actif" : "Inactif"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {product.suppliers.length > 0 ? (
                          <div className="flex flex-col gap-1">
                            {product.suppliers.map((s) => (
                              <span key={s.id} className="text-xs">
                                #{s.priority} {s.supplier.name}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs">
                            Aucun
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {product.barcode || "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Importer des produits</DialogTitle>
            <DialogDescription>
              Importez un fichier Excel (.xlsx) ou CSV contenant vos produits.
              <br />
              Colonnes requises: SKU, NAME, PRICE
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="file-upload">Fichier</Label>
              <Input
                id="file-upload"
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileSelect}
              />
              {selectedFile && (
                <p className="text-sm text-gray-600 mt-2">
                  Fichier sélectionné: {selectedFile.name}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="replace-existing"
                checked={replaceExisting}
                onChange={(e) => setReplaceExisting(e.target.checked)}
                className="w-4 h-4"
              />
              <Label htmlFor="replace-existing" className="cursor-pointer">
                Remplacer tous les produits existants
              </Label>
            </div>

            {replaceExisting && (
              <Alert className="border-orange-500 bg-orange-50">
                <AlertCircle className="w-4 h-4 text-orange-600" />
                <AlertDescription className="text-orange-800">
                  Attention: Tous les produits existants seront supprimés avant
                  l&apos;import.
                </AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setUploadDialogOpen(false);
                setSelectedFile(null);
                setReplaceExisting(false);
              }}
            >
              Annuler
            </Button>
            <Button onClick={handleUpload} disabled={uploading || !selectedFile}>
              {uploading ? "Import en cours..." : "Importer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sync Progress Dialog */}
      <Dialog open={syncProgressOpen} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />
              Synchronisation Glovo
            </DialogTitle>
            <DialogDescription>
              Récupération des produits depuis l&apos;API Glovo...
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{syncProgress.status}</span>
                <span className="font-semibold text-blue-600">
                  {syncProgress.percentage}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-500 ease-out rounded-full"
                  style={{ width: `${syncProgress.percentage}%` }}
                >
                  <div className="h-full w-full bg-white/20 animate-pulse" />
                </div>
              </div>
            </div>

            {/* Stats */}
            {syncProgress.totalProducts > 0 && (
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <div className="text-sm text-blue-600 font-medium mb-1">
                    Produits traités
                  </div>
                  <div className="text-2xl font-bold text-blue-900">
                    {syncProgress.productsProcessed}
                    <span className="text-sm font-normal text-blue-600 ml-1">
                      / {syncProgress.totalProducts}
                    </span>
                  </div>
                </div>
                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                  <div className="text-sm text-green-600 font-medium mb-1">
                    Progression
                  </div>
                  <div className="text-2xl font-bold text-green-900">
                    {syncProgress.percentage}%
                  </div>
                </div>
              </div>
            )}

            {/* Loading Animation */}
            <div className="flex items-center justify-center py-2">
              <div className="flex space-x-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>

            {syncProgress.percentage === 100 && (
              <Alert className="border-green-500 bg-green-50">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <AlertDescription className="text-green-800 font-medium">
                  Synchronisation terminée avec succès!
                </AlertDescription>
              </Alert>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Flush Dialog */}
      <Dialog open={flushDialogOpen} onOpenChange={setFlushDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer tous les produits</DialogTitle>
            <DialogDescription>
              Cette action est irréversible. Tous les produits et leurs
              assignations aux fournisseurs seront supprimés.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Alert className="border-red-500 bg-red-50">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <AlertDescription className="text-red-800">
                Vous êtes sur le point de supprimer {stats.total} produits
              </AlertDescription>
            </Alert>

            <div>
              <Label htmlFor="flush-confirmation">
                Tapez &quot;DELETE&quot; pour confirmer
              </Label>
              <Input
                id="flush-confirmation"
                value={flushConfirmation}
                onChange={(e) => setFlushConfirmation(e.target.value)}
                placeholder="DELETE"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setFlushDialogOpen(false);
                setFlushConfirmation("");
              }}
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={handleFlush}
              disabled={flushing || flushConfirmation !== "DELETE"}
            >
              {flushing ? "Suppression..." : "Supprimer tout"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Product Detail Modal */}
      <Dialog open={productDetailOpen} onOpenChange={setProductDetailOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Détails du produit</DialogTitle>
            <DialogDescription>
              {selectedProduct?.name}
            </DialogDescription>
          </DialogHeader>

          {selectedProduct && (
            <div className="space-y-6">
              {/* Product Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-600">SKU</Label>
                  <p className="font-mono text-sm mt-1">{selectedProduct.sku}</p>
                </div>
                <div>
                  <Label className="text-gray-600">Prix</Label>
                  <p className="text-lg font-bold mt-1">
                    {formatPrice(selectedProduct.price)}
                  </p>
                </div>
                <div>
                  <Label className="text-gray-600">Catégorie</Label>
                  <div className="mt-1">
                    {selectedProduct.category1 && (
                      <Badge variant="outline">{selectedProduct.category1}</Badge>
                    )}
                  </div>
                </div>
                <div>
                  <Label className="text-gray-600">Statut</Label>
                  <div className="mt-1">
                    <Badge
                      variant={selectedProduct.isActive ? "default" : "secondary"}
                    >
                      {selectedProduct.isActive ? "Actif" : "Inactif"}
                    </Badge>
                  </div>
                </div>
                {selectedProduct.barcode && (
                  <div>
                    <Label className="text-gray-600">Code Barre</Label>
                    <p className="font-mono text-sm mt-1">{selectedProduct.barcode}</p>
                  </div>
                )}
              </div>

              {/* Suppliers */}
              <div>
                <Label className="text-gray-600">Fournisseurs assignés</Label>
                {selectedProduct.suppliers.length > 0 ? (
                  <div className="mt-2 space-y-2">
                    {selectedProduct.suppliers.map((s) => (
                      <div
                        key={s.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div>
                          <p className="font-medium">{s.supplier.name}</p>
                          <p className="text-sm text-gray-600">{s.supplier.email}</p>
                        </div>
                        <Badge variant="outline">Priorité #{s.priority}</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 mt-2">
                    Aucun fournisseur assigné
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    // TODO: Open supplier assignment dialog
                    alert("Fonctionnalité d'assignation à venir");
                  }}
                >
                  Assigner un fournisseur
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    // TODO: Open edit dialog
                    alert("Fonctionnalité d'édition à venir");
                  }}
                >
                  Modifier
                </Button>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setProductDetailOpen(false);
                setSelectedProduct(null);
              }}
            >
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
