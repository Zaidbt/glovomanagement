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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Edit, Trash2, Truck } from "lucide-react";

interface Fournisseur {
  id: string;
  username: string;
  name: string;
  email: string;
  phone?: string;
  isActive: boolean;
  createdAt: string;
  fournisseurStores: {
    store: {
      id: string;
      name: string;
    };
  }[];
}

const CATEGORIES = [
  { value: "VIANDE", label: "Viande" },
  { value: "VOLAILLE", label: "Volaille" },
  { value: "LEGUMES", label: "Légumes" },
  { value: "FRUITS", label: "Fruits" },
  { value: "EPICERIE", label: "Épicerie" },
  { value: "AUTRE", label: "Autre" },
];

export default function FournisseursPage() {
  const [fournisseurs, setFournisseurs] = useState<Fournisseur[]>([]);
  const [stores, setStores] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingFournisseur, setEditingFournisseur] =
    useState<Fournisseur | null>(null);

  useEffect(() => {
    fetchFournisseurs();
    fetchStores();
  }, []);

  const fetchFournisseurs = async () => {
    try {
      const response = await fetch("/api/fournisseurs");
      if (response.ok) {
        const data = await response.json();
        setFournisseurs(data);
      }
    } catch (error) {
      console.error("Error fetching fournisseurs:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStores = async () => {
    try {
      const response = await fetch("/api/stores");
      if (response.ok) {
        const data = await response.json();
        setStores(data);
      }
    } catch (error) {
      console.error("Error fetching stores:", error);
    }
  };

  const handleCreateFournisseur = async (formData: FormData) => {
    try {
      const response = await fetch("/api/fournisseurs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: formData.get("username"),
          password: formData.get("password"),
          name: formData.get("name"),
          email: formData.get("email"),
          phone: formData.get("phone"),
          category: formData.get("category"),
          storeIds: formData.getAll("storeIds"),
        }),
      });

      if (response.ok) {
        fetchFournisseurs();
        setIsDialogOpen(false);
      }
    } catch (error) {
      console.error("Error creating fournisseur:", error);
    }
  };

  const handleUpdateFournisseur = async (formData: FormData) => {
    if (!editingFournisseur) return;

    try {
      const response = await fetch(
        `/api/fournisseurs/${editingFournisseur.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            username: formData.get("username"),
            name: formData.get("name"),
            email: formData.get("email"),
            phone: formData.get("phone"),
            category: formData.get("category"),
            isActive: formData.get("isActive") === "on",
            storeIds: formData.getAll("storeIds"),
          }),
        }
      );

      if (response.ok) {
        fetchFournisseurs();
        setIsDialogOpen(false);
        setEditingFournisseur(null);
      }
    } catch (error) {
      console.error("Error updating fournisseur:", error);
    }
  };

  const handleDeleteFournisseur = async (fournisseurId: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce fournisseur ?")) return;

    try {
      const response = await fetch(`/api/fournisseurs/${fournisseurId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchFournisseurs();
      }
    } catch (error) {
      console.error("Error deleting fournisseur:", error);
    }
  };

  const openEditDialog = (fournisseur: Fournisseur) => {
    setEditingFournisseur(fournisseur);
    setIsDialogOpen(true);
  };

  const openCreateDialog = () => {
    setEditingFournisseur(null);
    setIsDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">
            Gestion des Fournisseurs
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Gestion des Fournisseurs
          </h1>
          <p className="text-gray-600">
            Gérez vos fournisseurs et leurs spécialisations
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Nouveau Fournisseur
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>
                {editingFournisseur
                  ? "Modifier le Fournisseur"
                  : "Nouveau Fournisseur"}
              </DialogTitle>
              <DialogDescription>
                {editingFournisseur
                  ? "Modifiez les informations du fournisseur."
                  : "Créez un nouveau fournisseur dans le système."}
              </DialogDescription>
            </DialogHeader>
            <form
              action={
                editingFournisseur
                  ? handleUpdateFournisseur
                  : handleCreateFournisseur
              }
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="username">Nom d&apos;utilisateur</Label>
                <Input
                  id="username"
                  name="username"
                  defaultValue={editingFournisseur?.username || ""}
                  required
                />
              </div>
              {!editingFournisseur && (
                <div className="space-y-2">
                  <Label htmlFor="password">Mot de passe</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    required
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="name">Nom commercial</Label>
                <Input
                  id="name"
                  name="name"
                  defaultValue={editingFournisseur?.name || ""}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  defaultValue={editingFournisseur?.email || ""}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Téléphone (optionnel)</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  defaultValue={editingFournisseur?.phone || ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Catégorie</Label>
                <Select
                  name="category"
                  defaultValue={editingFournisseur?.name || ""}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une catégorie" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((category) => (
                      <SelectItem key={category.value} value={category.value}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Stores assignés</Label>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {stores.map((store) => (
                    <div key={store.id} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`store-${store.id}`}
                        name="storeIds"
                        value={store.id}
                        defaultChecked={editingFournisseur?.fournisseurStores.some(
                          (fs) => fs.store.id === store.id
                        )}
                        className="rounded"
                      />
                      <Label htmlFor={`store-${store.id}`} className="text-sm">
                        {store.name}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
              {editingFournisseur && (
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    name="isActive"
                    defaultChecked={editingFournisseur.isActive}
                    className="rounded"
                  />
                  <Label htmlFor="isActive">Fournisseur actif</Label>
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
                  {editingFournisseur ? "Modifier" : "Créer"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Fournisseurs
            </CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fournisseurs.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Fournisseurs Actifs
            </CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {fournisseurs.filter((f) => f.isActive).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Fournisseurs Inactifs
            </CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {fournisseurs.filter((f) => !f.isActive).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Fournisseurs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Liste des Fournisseurs</CardTitle>
          <CardDescription>
            Gérez tous vos fournisseurs et leurs assignations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom d&apos;utilisateur</TableHead>
                <TableHead>Nom commercial</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Stores</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fournisseurs.map((fournisseur) => (
                <TableRow key={fournisseur.id}>
                  <TableCell className="font-medium">
                    {fournisseur.username}
                  </TableCell>
                  <TableCell>{fournisseur.name}</TableCell>
                  <TableCell>{fournisseur.email}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {fournisseur.fournisseurStores.map((fs) => (
                        <Badge
                          key={fs.store.id}
                          variant="outline"
                          className="text-xs"
                        >
                          {fs.store.name}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={fournisseur.isActive ? "default" : "secondary"}
                    >
                      {fournisseur.isActive ? "Actif" : "Inactif"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(fournisseur)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteFournisseur(fournisseur.id)}
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
  );
}
