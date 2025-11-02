"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle, UserPlus, Trash2 } from "lucide-react";

interface Supplier {
  id: string;
  name: string;
  email: string;
  phone?: string;
}

interface ProductSupplier {
  id: string;
  priority: number;
  isActive: boolean;
  supplier: Supplier;
}

interface SupplierAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storeId: string;
  productId?: string;
  productName?: string;
  category?: string;
  mode: "single" | "bulk";
  onSuccess?: () => void;
}

export function SupplierAssignmentDialog({
  open,
  onOpenChange,
  storeId,
  productId,
  productName,
  category,
  mode,
  onSuccess,
}: SupplierAssignmentDialogProps) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [currentSuppliers, setCurrentSuppliers] = useState<ProductSupplier[]>(
    []
  );
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>("");
  const [priority, setPriority] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (open) {
      fetchSuppliers();
      if (mode === "single" && productId) {
        fetchCurrentSuppliers();
      }
    }
  }, [open, storeId, productId, mode]);

  const fetchSuppliers = async () => {
    try {
      const response = await fetch(`/api/stores/${storeId}/fournisseurs`);
      if (response.ok) {
        const data = await response.json();
        setSuppliers(data.fournisseurs || []);
      }
    } catch (error) {
      console.error("Error fetching suppliers:", error);
    }
  };

  const fetchCurrentSuppliers = async () => {
    if (!productId) return;

    try {
      const response = await fetch(
        `/api/stores/${storeId}/products/${productId}/suppliers`
      );
      if (response.ok) {
        const data = await response.json();
        setCurrentSuppliers(data.suppliers || []);
      }
    } catch (error) {
      console.error("Error fetching current suppliers:", error);
    }
  };

  const handleAssign = async () => {
    if (!selectedSupplierId) {
      setErrorMessage("Veuillez sélectionner un fournisseur");
      return;
    }

    try {
      setLoading(true);
      setErrorMessage("");
      setSuccessMessage("");

      let response;

      if (mode === "single" && productId) {
        // Single product assignment
        response = await fetch(
          `/api/stores/${storeId}/products/${productId}/suppliers`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              supplierId: selectedSupplierId,
              priority,
              isActive: true,
            }),
          }
        );
      } else {
        // Bulk assignment by category
        response = await fetch(
          `/api/stores/${storeId}/suppliers/assign-bulk`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              supplierId: selectedSupplierId,
              category,
              priority,
              isActive: true,
            }),
          }
        );
      }

      const data = await response.json();

      if (response.ok) {
        setSuccessMessage(
          data.message || "Fournisseur(s) assigné(s) avec succès"
        );
        setSelectedSupplierId("");
        setPriority(1);

        if (mode === "single" && productId) {
          fetchCurrentSuppliers();
        }

        if (onSuccess) {
          setTimeout(() => {
            onSuccess();
            onOpenChange(false);
          }, 1500);
        }
      } else {
        setErrorMessage(data.error || "Erreur lors de l'assignation");
      }
    } catch (error) {
      console.error("Error assigning supplier:", error);
      setErrorMessage("Erreur lors de l'assignation");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveSupplier = async (supplierId: string) => {
    if (!productId) return;

    try {
      const response = await fetch(
        `/api/stores/${storeId}/products/${productId}/suppliers?supplierId=${supplierId}`,
        {
          method: "DELETE",
        }
      );

      if (response.ok) {
        setSuccessMessage("Fournisseur retiré avec succès");
        fetchCurrentSuppliers();

        if (onSuccess) {
          setTimeout(() => {
            onSuccess();
          }, 1000);
        }
      } else {
        const data = await response.json();
        setErrorMessage(data.error || "Erreur lors de la suppression");
      }
    } catch (error) {
      console.error("Error removing supplier:", error);
      setErrorMessage("Erreur lors de la suppression");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            {mode === "single"
              ? "Assigner un fournisseur"
              : "Assignation en masse"}
          </DialogTitle>
          <DialogDescription>
            {mode === "single" && productName && (
              <>Produit: {productName}</>
            )}
            {mode === "bulk" && category && (
              <>Assigner tous les produits de la catégorie: {category}</>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Messages */}
          {successMessage && (
            <Alert className="border-green-500 bg-green-50">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <AlertDescription className="text-green-800">
                {successMessage}
              </AlertDescription>
            </Alert>
          )}

          {errorMessage && (
            <Alert className="border-red-500 bg-red-50">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <AlertDescription className="text-red-800">
                {errorMessage}
              </AlertDescription>
            </Alert>
          )}

          {/* Current suppliers (single mode only) */}
          {mode === "single" && currentSuppliers.length > 0 && (
            <div>
              <Label className="mb-2 block">Fournisseurs actuels</Label>
              <div className="space-y-2 border rounded-lg p-3 bg-gray-50">
                {currentSuppliers.map((ps) => (
                  <div
                    key={ps.id}
                    className="flex items-center justify-between bg-white p-2 rounded border"
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">#{ps.priority}</Badge>
                      <span className="font-medium">{ps.supplier.name}</span>
                      <span className="text-sm text-gray-500">
                        {ps.supplier.email}
                      </span>
                      {!ps.isActive && (
                        <Badge variant="secondary">Inactif</Badge>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveSupplier(ps.supplier.id)}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Assignment form */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="supplier">Fournisseur</Label>
              <Select
                value={selectedSupplierId}
                onValueChange={setSelectedSupplierId}
              >
                <SelectTrigger id="supplier">
                  <SelectValue placeholder="Sélectionner..." />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((supplier) => (
                    <SelectItem key={supplier.id} value={supplier.id}>
                      {supplier.name} - {supplier.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="priority">Priorité</Label>
              <Input
                id="priority"
                type="number"
                min={1}
                value={priority}
                onChange={(e) => setPriority(parseInt(e.target.value))}
              />
              <p className="text-xs text-gray-500 mt-1">
                1 = Principal, 2+ = Backup
              </p>
            </div>
          </div>

          {mode === "bulk" && (
            <Alert>
              <AlertCircle className="w-4 h-4" />
              <AlertDescription>
                Cette action assignera le fournisseur à tous les produits de la
                catégorie sélectionnée.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              setSuccessMessage("");
              setErrorMessage("");
              setSelectedSupplierId("");
              setPriority(1);
            }}
          >
            Fermer
          </Button>
          <Button onClick={handleAssign} disabled={loading || !selectedSupplierId}>
            {loading ? "Assignation..." : "Assigner"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
