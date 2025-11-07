"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { ArrowLeft, ArrowUp, ArrowDown, Save, Loader2, Package, Users } from "lucide-react";

interface Supplier {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  averagePriority: number;
  minPriority: number;
  maxPriority: number;
  productCount: number;
}

interface CategorySuppliers {
  category: string;
  productCount: number;
  suppliers: Supplier[];
}

export default function CategoryPrioritiesPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const storeId = params?.storeId as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<CategorySuppliers[]>([]);
  const [storeName, setStoreName] = useState<string>("");
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch store info
  const fetchStoreInfo = async () => {
    try {
      const response = await fetch(`/api/stores/${storeId}`);
      if (response.ok) {
        const data = await response.json();
        setStoreName(data.store?.name || "Store");
      }
    } catch (error) {
      console.error("Error fetching store:", error);
    }
  };

  // Fetch categories with suppliers
  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/stores/${storeId}/category-suppliers`);
      if (response.ok) {
        const data = await response.json();
        setCategories(data.categories || []);
      } else {
        toast({
          title: "Erreur",
          description: "Impossible de charger les catégories",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
      toast({
        title: "Erreur",
        description: "Erreur lors du chargement",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (storeId) {
      fetchStoreInfo();
      fetchCategories();
    }
  }, [storeId]);

  // Move supplier up in priority (decrease priority number)
  const moveSupplierUp = (categoryIndex: number, supplierIndex: number) => {
    if (supplierIndex === 0) return;

    const newCategories = [...categories];
    const suppliers = [...newCategories[categoryIndex].suppliers];

    // Swap with previous supplier
    [suppliers[supplierIndex - 1], suppliers[supplierIndex]] = [
      suppliers[supplierIndex],
      suppliers[supplierIndex - 1],
    ];

    newCategories[categoryIndex].suppliers = suppliers;
    setCategories(newCategories);
    setHasChanges(true);
  };

  // Move supplier down in priority (increase priority number)
  const moveSupplierDown = (categoryIndex: number, supplierIndex: number) => {
    const suppliers = categories[categoryIndex].suppliers;
    if (supplierIndex === suppliers.length - 1) return;

    const newCategories = [...categories];
    const suppliersArray = [...newCategories[categoryIndex].suppliers];

    // Swap with next supplier
    [suppliersArray[supplierIndex + 1], suppliersArray[supplierIndex]] = [
      suppliersArray[supplierIndex],
      suppliersArray[supplierIndex + 1],
    ];

    newCategories[categoryIndex].suppliers = suppliersArray;
    setCategories(newCategories);
    setHasChanges(true);
  };

  // Save all priority changes
  const handleSaveAll = async () => {
    try {
      setSaving(true);
      let totalUpdated = 0;
      const errors: string[] = [];

      for (const category of categories) {
        // Build supplier priorities array with new order
        const supplierPriorities = category.suppliers.map((supplier, index) => ({
          supplierId: supplier.id,
          priority: index + 1, // Priority starts at 1
        }));

        const response = await fetch(`/api/stores/${storeId}/category-suppliers`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            category: category.category,
            supplierPriorities,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          totalUpdated += data.updatedCount || 0;
        } else {
          errors.push(`Erreur pour ${category.category}`);
        }
      }

      if (errors.length === 0) {
        toast({
          title: "✅ Priorités sauvegardées",
          description: `${totalUpdated} attributions mises à jour`,
        });
        setHasChanges(false);
        // Refresh to show updated data
        await fetchCategories();
      } else {
        toast({
          title: "⚠️ Sauvegarde partielle",
          description: `${totalUpdated} mises à jour, ${errors.length} erreurs`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error saving priorities:", error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder les priorités",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/admin/stores")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Priorités par Catégorie
            </h1>
            <p className="text-gray-600">{storeName}</p>
          </div>
        </div>

        {hasChanges && (
          <Button
            onClick={handleSaveAll}
            disabled={saving}
            className="natura-gradient text-white"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sauvegarde...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Sauvegarder Tout
              </>
            )}
          </Button>
        )}
      </div>

      {/* Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Package className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <p className="font-medium text-blue-900">
                Gestion des priorités par catégorie
              </p>
              <p className="text-sm text-blue-700 mt-1">
                Réorganisez l&apos;ordre des fournisseurs pour chaque catégorie. Les
                modifications s&apos;appliqueront à tous les produits de la catégorie.
                Utilisez les flèches pour changer l&apos;ordre (priorité 1 = premier
                contacté).
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Categories List */}
      {categories.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">
              Aucune catégorie avec fournisseurs assignés
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {categories.map((category, categoryIndex) => (
            <Card key={category.category}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{category.category}</span>
                  <Badge variant="outline" className="ml-2">
                    {category.productCount} produits
                  </Badge>
                </CardTitle>
                <CardDescription>
                  {category.suppliers.length} fournisseur
                  {category.suppliers.length > 1 ? "s" : ""} assigné
                  {category.suppliers.length > 1 ? "s" : ""}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {category.suppliers.map((supplier, supplierIndex) => (
                    <div
                      key={supplier.id}
                      className="flex items-center justify-between p-4 border rounded-lg bg-gray-50"
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <Badge className="natura-gradient text-white">
                          #{supplierIndex + 1}
                        </Badge>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">
                            {supplier.name}
                          </p>
                          <div className="flex items-center gap-4 mt-1">
                            <p className="text-sm text-gray-600">
                              {supplier.email}
                            </p>
                            {supplier.phone && (
                              <p className="text-sm text-gray-500">
                                {supplier.phone}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-600">
                            {supplier.productCount} produit
                            {supplier.productCount > 1 ? "s" : ""}
                          </p>
                          <p className="text-xs text-gray-500">
                            Priorité actuelle: {supplier.minPriority}
                            {supplier.minPriority !== supplier.maxPriority &&
                              `-${supplier.maxPriority}`}
                          </p>
                        </div>
                      </div>

                      {/* Move buttons */}
                      <div className="flex flex-col gap-1 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            moveSupplierUp(categoryIndex, supplierIndex)
                          }
                          disabled={supplierIndex === 0}
                          className="h-8 w-8 p-0"
                        >
                          <ArrowUp className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            moveSupplierDown(categoryIndex, supplierIndex)
                          }
                          disabled={
                            supplierIndex === category.suppliers.length - 1
                          }
                          className="h-8 w-8 p-0"
                        >
                          <ArrowDown className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Floating Save Button */}
      {hasChanges && (
        <div className="fixed bottom-6 right-6 z-50">
          <Button
            onClick={handleSaveAll}
            disabled={saving}
            size="lg"
            className="natura-gradient text-white shadow-lg"
          >
            {saving ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Sauvegarde en cours...
              </>
            ) : (
              <>
                <Save className="w-5 h-5 mr-2" />
                Sauvegarder les Modifications
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
