"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Package,
  ShoppingCart,
  Eye,
  EyeOff,
  DollarSign,
  RefreshCw,
  CheckCircle,
  Search,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";

interface Product {
  id: string;
  sku: string;
  name: string;
  price: number;
  isActive: boolean;
  category1?: string;
  imageUrl?: string;
  store: {
    id: string;
    name: string;
  };
}

interface ProductAssignment {
  id: string;
  product: Product;
}

export default function SupplierDashboard() {
  const router = useRouter();
  const { toast } = useToast();
  const [assignments, setAssignments] = useState<ProductAssignment[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<ProductAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Edit dialog
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [newPrice, setNewPrice] = useState<string>("");
  const [newIsActive, setNewIsActive] = useState<boolean>(true);
  const [updating, setUpdating] = useState(false);

  // Stats
  const [stats, setStats] = useState({
    totalProducts: 0,
    activeProducts: 0,
    inactiveProducts: 0,
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      const filtered = assignments.filter((a) =>
        a.product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.product.sku.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredProducts(filtered);
    } else {
      setFilteredProducts(assignments);
    }
  }, [searchTerm, assignments]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/supplier/my-products");

      if (response.ok) {
        const data = await response.json();
        setAssignments(data.assignments || []);
        setFilteredProducts(data.assignments || []);

        // Calculate stats
        const total = data.assignments?.length || 0;
        const active = data.assignments?.filter((a: ProductAssignment) => a.product.isActive).length || 0;
        setStats({
          totalProducts: total,
          activeProducts: active,
          inactiveProducts: total - active,
        });
      } else {
        toast({
          title: "خطأ",
          description: "فشل تحميل المنتجات",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error fetching products:", error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء تحميل المنتجات",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleQuickToggle = async (productId: string, storeId: string, currentIsActive: boolean) => {
    try {
      const response = await fetch(`/api/stores/${storeId}/products/${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentIsActive }),
      });

      if (response.ok) {
        toast({
          title: "✅ تم التحديث",
          description: currentIsActive ? "تم إخفاء المنتج" : "تم إظهار المنتج",
        });
        fetchProducts();
      } else {
        toast({
          title: "خطأ",
          description: "فشل تحديث المنتج",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error toggling product:", error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء التحديث",
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (product: Product) => {
    setEditingProduct(product);
    setNewPrice((product.price / 100).toFixed(2));
    setNewIsActive(product.isActive);
    setEditDialogOpen(true);
  };

  const handleUpdateProduct = async () => {
    if (!editingProduct) return;

    try {
      setUpdating(true);
      const priceInCentimes = Math.round(parseFloat(newPrice) * 100);

      const response = await fetch(
        `/api/stores/${editingProduct.store.id}/products/${editingProduct.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            price: priceInCentimes,
            isActive: newIsActive,
          }),
        }
      );

      if (response.ok) {
        toast({
          title: "✅ تم التحديث بنجاح",
          description: "تم تحديث السعر والحالة",
        });
        setEditDialogOpen(false);
        fetchProducts();
      } else {
        toast({
          title: "خطأ",
          description: "فشل تحديث المنتج",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error updating product:", error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء التحديث",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  const formatPrice = (price: number) => {
    return `${(price / 100).toFixed(2)} درهم`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600" dir="rtl">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">لوحة التحكم</h1>
          <p className="text-gray-600">إدارة منتجاتك بسهولة</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => router.push("/fournisseur/orders")} variant="default">
            <ShoppingCart className="w-4 h-4 ml-2" />
            الطلبات
          </Button>
          <Button onClick={fetchProducts} variant="outline">
            <RefreshCw className="w-4 h-4 ml-2" />
            تحديث
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center justify-between">
              <span>إجمالي المنتجات</span>
              <Package className="h-5 w-5 text-blue-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{stats.totalProducts}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center justify-between">
              <span>المنتجات المتاحة</span>
              <CheckCircle className="h-5 w-5 text-green-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{stats.activeProducts}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center justify-between">
              <span>المنتجات المخفية</span>
              <EyeOff className="h-5 w-5 text-orange-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">{stats.inactiveProducts}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            بحث عن منتج
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="ابحث بالاسم أو رمز المنتج..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="text-right"
          />
        </CardContent>
      </Card>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProducts.map((assignment) => {
          const product = assignment.product;
          return (
            <Card key={product.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-1">{product.name}</h3>
                    <p className="text-sm text-gray-500">SKU: {product.sku}</p>
                    {product.category1 && (
                      <Badge variant="outline" className="mt-2">
                        {product.category1}
                      </Badge>
                    )}
                  </div>
                  {product.imageUrl && (
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-16 h-16 object-cover rounded-lg mr-3"
                    />
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {/* Price */}
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <span className="text-sm text-gray-600">السعر</span>
                    <span className="text-lg font-bold text-blue-600">
                      {formatPrice(product.price)}
                    </span>
                  </div>

                  {/* Status */}
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-600">الحالة</span>
                    <Badge variant={product.isActive ? "default" : "secondary"}>
                      {product.isActive ? "متاح" : "مخفي"}
                    </Badge>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      onClick={() => openEditDialog(product)}
                      className="flex-1"
                      variant="default"
                    >
                      <DollarSign className="w-4 h-4 ml-2" />
                      تعديل السعر
                    </Button>
                    <Button
                      onClick={() => handleQuickToggle(product.id, product.store.id, product.isActive)}
                      variant={product.isActive ? "outline" : "default"}
                      className="flex-1"
                    >
                      {product.isActive ? (
                        <>
                          <EyeOff className="w-4 h-4 ml-2" />
                          إخفاء
                        </>
                      ) : (
                        <>
                          <Eye className="w-4 h-4 ml-2" />
                          إظهار
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredProducts.length === 0 && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-gray-500">
              <Package className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-lg">لا توجد منتجات</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>تعديل المنتج</DialogTitle>
          </DialogHeader>

          {editingProduct && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">{editingProduct.name}</h3>
                <p className="text-sm text-gray-500">SKU: {editingProduct.sku}</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">السعر (درهم)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                  className="text-right"
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">الحالة</label>
                <div className="flex gap-2">
                  <Button
                    onClick={() => setNewIsActive(true)}
                    variant={newIsActive ? "default" : "outline"}
                    className="flex-1"
                  >
                    <Eye className="w-4 h-4 ml-2" />
                    متاح
                  </Button>
                  <Button
                    onClick={() => setNewIsActive(false)}
                    variant={!newIsActive ? "default" : "outline"}
                    className="flex-1"
                  >
                    <EyeOff className="w-4 h-4 ml-2" />
                    مخفي
                  </Button>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  onClick={handleUpdateProduct}
                  disabled={updating}
                  className="flex-1"
                >
                  {updating ? "جاري الحفظ..." : "حفظ التغييرات"}
                </Button>
                <Button
                  onClick={() => setEditDialogOpen(false)}
                  variant="outline"
                  className="flex-1"
                >
                  إلغاء
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
