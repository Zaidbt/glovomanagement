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
  const [flushDialogOpen, setFlushDialogOpen] = useState(false);
  const [flushConfirmation, setFlushConfirmation] = useState("");

  // File upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [replaceExisting, setReplaceExisting] = useState(false);

  // Messages
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    fetchStore();
    fetchProducts();
  }, [storeId]);

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

          <div className="mt-4">
            <Button onClick={fetchProducts} variant="outline" size="sm">
              Appliquer les filtres
            </Button>
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
                    <TableRow key={product.id}>
                      <TableCell className="font-mono text-xs">
                        {product.sku.substring(0, 8)}...
                      </TableCell>
                      <TableCell className="font-medium">
                        {product.name}
                      </TableCell>
                      <TableCell>{formatPrice(product.price)}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {product.category1 && (
                            <Badge variant="outline" className="text-xs">
                              {product.category1}
                            </Badge>
                          )}
                          {product.category2 && (
                            <Badge variant="secondary" className="text-xs">
                              {product.category2}
                            </Badge>
                          )}
                        </div>
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
    </div>
  );
}
