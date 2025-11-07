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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Edit, Trash2, Store, MessageSquare, Package, ListOrdered } from "lucide-react";
import { useRouter } from "next/navigation";

interface Store {
  id: string;
  name: string;
  address: string;
  phone: string;
  twilioNumber?: string;
  glovoStoreId?: string;
  twilioCredentialId?: string;
  glovoCredentialId?: string;
  twilioCredential?: {
    id: string;
    name: string;
    instanceName?: string;
    customField1?: string; // Phone number
  };
  glovoCredential?: {
    id: string;
    name: string;
    instanceName?: string;
    apiKey?: string;        // Chain ID
    customField1?: string;  // Vendor ID
    accessToken?: string;   // OAuth Token
  };
  isActive: boolean;
  createdAt: string;
}

interface TwilioCredential {
  id: string;
  name: string;
  instanceName?: string;
  customField1?: string; // Phone number
  isActive: boolean;
}

interface GlovoCredential {
  id: string;
  name: string;
  instanceName?: string;
  apiKey?: string;        // Chain ID
  customField1?: string;  // Vendor ID
  isActive: boolean;
}

export default function StoresPage() {
  const router = useRouter();
  const [stores, setStores] = useState<Store[]>([]);
  const [twilioCredentials, setTwilioCredentials] = useState<
    TwilioCredential[]
  >([]);
  const [glovoCredentials, setGlovoCredentials] = useState<GlovoCredential[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStore, setEditingStore] = useState<Store | null>(null);

  useEffect(() => {
    fetchStores();
    fetchTwilioCredentials();
    fetchGlovoCredentials();
  }, []);

  const fetchStores = async () => {
    try {
      const response = await fetch("/api/stores");
      if (response.ok) {
        const data = await response.json();
        setStores(data);
      }
    } catch (error) {
      console.error("Error fetching stores:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTwilioCredentials = async () => {
    try {
      const response = await fetch("/api/credentials");
      if (response.ok) {
        const credentials = await response.json();
        const twilioCreds = credentials.filter(
          (c: Record<string, unknown>) => c.type === "TWILIO" && c.isActive
        );
        setTwilioCredentials(twilioCreds);
      }
    } catch (error) {
      console.error("Error fetching Twilio credentials:", error);
    }
  };

  const fetchGlovoCredentials = async () => {
    try {
      const response = await fetch("/api/credentials");
      if (response.ok) {
        const credentials = await response.json();
        const glovoCreds = credentials.filter(
          (c: Record<string, unknown>) => c.type === "GLOVO" && c.isActive
        );
        setGlovoCredentials(glovoCreds);
      }
    } catch (error) {
      console.error("Error fetching Glovo credentials:", error);
    }
  };

  const handleCreateStore = async (formData: FormData) => {
    try {
      const response = await fetch("/api/stores", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.get("name"),
          address: formData.get("address"),
          phone: formData.get("phone"),
          twilioNumber: formData.get("twilioNumber"),
          glovoStoreId: formData.get("glovoStoreId"),
          twilioCredentialId: formData.get("twilioCredentialId") || null,
          glovoCredentialId: formData.get("glovoCredentialId") || null,
        }),
      });

      if (response.ok) {
        fetchStores();
        setIsDialogOpen(false);
      }
    } catch (error) {
      console.error("Error creating store:", error);
    }
  };

  const handleUpdateStore = async (formData: FormData) => {
    if (!editingStore) return;

    try {
      const response = await fetch(`/api/stores/${editingStore.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.get("name"),
          address: formData.get("address"),
          phone: formData.get("phone"),
          twilioNumber: formData.get("twilioNumber"),
          glovoStoreId: formData.get("glovoStoreId"),
          twilioCredentialId: formData.get("twilioCredentialId") || null,
          glovoCredentialId: formData.get("glovoCredentialId") || null,
          isActive: formData.get("isActive") === "on",
        }),
      });

      if (response.ok) {
        fetchStores();
        setIsDialogOpen(false);
        setEditingStore(null);
      }
    } catch (error) {
      console.error("Error updating store:", error);
    }
  };

  const handleDeleteStore = async (storeId: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce store ?")) return;

    try {
      const response = await fetch(`/api/stores/${storeId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchStores();
      }
    } catch (error) {
      console.error("Error deleting store:", error);
    }
  };

  const openEditDialog = (store: Store) => {
    setEditingStore(store);
    setIsDialogOpen(true);
  };

  const openCreateDialog = () => {
    setEditingStore(null);
    setIsDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">
            Gestion des Stores
          </h1>
        </div>
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen natura-bg">
      <div className="space-y-8 p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 natura-gradient rounded-lg flex items-center justify-center shadow-lg">
                <Store className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold natura-text-gradient">
                  Gestion des Stores
                </h1>
                <p className="text-gray-600">
                  Gérez vos stores et leurs configurations
                </p>
              </div>
            </div>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button
                onClick={openCreateDialog}
                className="natura-button natura-hover shadow-lg"
              >
                <Plus className="h-4 w-4 mr-2" />
                Nouveau Store
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>
                  {editingStore ? "Modifier le Store" : "Nouveau Store"}
                </DialogTitle>
                <DialogDescription>
                  {editingStore
                    ? "Modifiez les informations du store."
                    : "Créez un nouveau store dans le système."}
                </DialogDescription>
              </DialogHeader>
              <form
                action={editingStore ? handleUpdateStore : handleCreateStore}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="name">Nom du Store</Label>
                  <Input
                    id="name"
                    name="name"
                    defaultValue={editingStore?.name || ""}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Adresse</Label>
                  <Textarea
                    id="address"
                    name="address"
                    defaultValue={editingStore?.address || ""}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Téléphone</Label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    defaultValue={editingStore?.phone || ""}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="twilioNumber">
                    Numéro Twilio (optionnel)
                  </Label>
                  <Input
                    id="twilioNumber"
                    name="twilioNumber"
                    type="tel"
                    defaultValue={editingStore?.twilioNumber || ""}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="glovoStoreId">
                    ID Store Glovo (optionnel)
                  </Label>
                  <Input
                    id="glovoStoreId"
                    name="glovoStoreId"
                    defaultValue={editingStore?.glovoStoreId || ""}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="twilioCredentialId">
                    Credential Twilio (optionnel)
                  </Label>
                  <Select
                    name="twilioCredentialId"
                    defaultValue={editingStore?.twilioCredentialId || ""}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner une credential Twilio" />
                    </SelectTrigger>
                    <SelectContent>
                      {twilioCredentials.map((cred) => (
                        <SelectItem key={cred.id} value={cred.id}>
                          <div className="flex items-center space-x-2">
                            <MessageSquare className="h-4 w-4 text-green-600" />
                            <span>
                              Twilio Whatsapp{" "}
                              {cred.customField1 || "(Numéro non configuré)"}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500">
                    Sélectionnez la credential Twilio pour ce store. Si aucune
                    n&apos;est sélectionnée, le système utilisera la première
                    credential disponible.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="glovoCredentialId">
                    Credential Glovo (optionnel)
                  </Label>
                  <Select
                    name="glovoCredentialId"
                    defaultValue={editingStore?.glovoCredentialId || ""}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner une credential Glovo" />
                    </SelectTrigger>
                    <SelectContent>
                      {glovoCredentials.map((cred) => (
                        <SelectItem key={cred.id} value={cred.id}>
                          {cred.instanceName || cred.name} - Vendor:{" "}
                          {cred.customField1 || "(Non configuré)"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500">
                    Sélectionnez la credential Glovo pour ce store. La
                    credential contient le Chain ID, Vendor ID et le token OAuth
                    pour l&apos;API Glovo.
                  </p>
                </div>
                {editingStore && (
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="isActive"
                      name="isActive"
                      defaultChecked={editingStore.isActive}
                      className="rounded"
                    />
                    <Label htmlFor="isActive">Store actif</Label>
                  </div>
                )}
                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Annuler
                  </Button>
                  <Button type="submit">
                    {editingStore ? "Modifier" : "Créer"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          <Card className="natura-card natura-hover group">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Stores
              </CardTitle>
              <div className="p-2 bg-green-100 rounded-lg group-hover:bg-green-200 transition-colors">
                <Store className="h-5 w-5 text-green-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">
                {stores.length}
              </div>
              <p className="text-sm text-green-600 font-medium">Stores créés</p>
            </CardContent>
          </Card>
          <Card className="natura-card natura-hover group">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Stores Actifs
              </CardTitle>
              <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                <Store className="h-5 w-5 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">
                {stores.filter((store) => store.isActive).length}
              </div>
              <p className="text-sm text-blue-600 font-medium">
                En fonctionnement
              </p>
            </CardContent>
          </Card>
          <Card className="natura-card natura-hover group">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Stores Inactifs
              </CardTitle>
              <div className="p-2 bg-red-100 rounded-lg group-hover:bg-red-200 transition-colors">
                <Store className="h-5 w-5 text-red-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">
                {stores.filter((store) => !store.isActive).length}
              </div>
              <p className="text-sm text-red-600 font-medium">Hors service</p>
            </CardContent>
          </Card>
        </div>

        {/* Stores Table */}
        <Card className="natura-card">
          <CardHeader className="bg-gradient-to-r from-green-50 to-green-100 rounded-t-lg">
            <CardTitle className="text-xl font-bold text-gray-800 flex items-center space-x-2">
              <Store className="h-5 w-5 text-green-600" />
              <span>Liste des Stores</span>
            </CardTitle>
            <CardDescription className="text-gray-600">
              Gérez tous vos stores et leurs configurations
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="font-semibold text-gray-700">
                    Nom
                  </TableHead>
                  <TableHead className="font-semibold text-gray-700">
                    Adresse
                  </TableHead>
                  <TableHead className="font-semibold text-gray-700">
                    Téléphone
                  </TableHead>
                  <TableHead className="font-semibold text-gray-700">
                    Twilio
                  </TableHead>
                  <TableHead className="font-semibold text-gray-700">
                    Glovo
                  </TableHead>
                  <TableHead className="font-semibold text-gray-700">
                    Statut
                  </TableHead>
                  <TableHead className="font-semibold text-gray-700">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stores.map((store) => (
                  <TableRow
                    key={store.id}
                    className="hover:bg-green-50 transition-colors"
                  >
                    <TableCell className="font-medium text-gray-900">
                      {store.name}
                    </TableCell>
                    <TableCell className="text-gray-600">
                      {store.address}
                    </TableCell>
                    <TableCell className="text-gray-600">
                      {store.phone}
                    </TableCell>
                    <TableCell>
                      {store.twilioCredential ? (
                        <div className="flex items-center space-x-2">
                          <MessageSquare className="h-4 w-4 text-green-600" />
                          <div>
                            <div className="text-sm font-medium">
                              {store.twilioCredential.instanceName ||
                                store.twilioCredential.name}
                            </div>
                            {store.twilioCredential.customField1 && (
                              <div className="text-xs text-gray-500">
                                {store.twilioCredential.customField1}
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">
                          Aucune credential
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {store.glovoCredential ? (
                        <div>
                          <div className="text-sm font-medium">
                            {store.glovoCredential.instanceName ||
                              store.glovoCredential.name}
                          </div>
                          {store.glovoCredential.customField1 && (
                            <div className="text-xs text-gray-500">
                              Vendor: {store.glovoCredential.customField1}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">
                          Aucune credential
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={store.isActive ? "default" : "secondary"}
                        className={
                          store.isActive
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }
                      >
                        {store.isActive ? "Actif" : "Inactif"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push(`/admin/stores/${store.id}/products`)}
                          className="hover:bg-blue-50 hover:text-blue-700 transition-colors"
                          title="Gérer les produits"
                        >
                          <Package className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push(`/admin/stores/${store.id}/category-priorities`)}
                          className="hover:bg-purple-50 hover:text-purple-700 transition-colors"
                          title="Gérer priorités fournisseurs par catégorie"
                        >
                          <ListOrdered className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(store)}
                          className="hover:bg-green-50 hover:text-green-700 transition-colors"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteStore(store.id)}
                          className="hover:bg-red-50 hover:text-red-700 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
