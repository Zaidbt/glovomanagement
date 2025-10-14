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
import { Plus, Edit, Trash2, Users } from "lucide-react";

interface Collaborateur {
  id: string;
  username: string;
  name: string;
  email: string;
  phone?: string;
  isActive: boolean;
  createdAt: string;
  collaborateurStores: {
    store: {
      id: string;
      name: string;
    };
  }[];
}

export default function CollaborateursPage() {
  const [collaborateurs, setCollaborateurs] = useState<Collaborateur[]>([]);
  const [stores, setStores] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCollaborateur, setEditingCollaborateur] =
    useState<Collaborateur | null>(null);

  useEffect(() => {
    fetchCollaborateurs();
    fetchStores();
  }, []);

  const fetchCollaborateurs = async () => {
    try {
      const response = await fetch("/api/collaborateurs");
      if (response.ok) {
        const data = await response.json();
        setCollaborateurs(data);
      }
    } catch (error) {
      console.error("Error fetching collaborateurs:", error);
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

  const handleCreateCollaborateur = async (formData: FormData) => {
    try {
      const response = await fetch("/api/collaborateurs", {
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
          storeIds: formData.getAll("storeIds"),
        }),
      });

      if (response.ok) {
        fetchCollaborateurs();
        setIsDialogOpen(false);
      }
    } catch (error) {
      console.error("Error creating collaborateur:", error);
    }
  };

  const handleUpdateCollaborateur = async (formData: FormData) => {
    if (!editingCollaborateur) return;

    try {
      const response = await fetch(
        `/api/collaborateurs/${editingCollaborateur.id}`,
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
            isActive: formData.get("isActive") === "on",
            storeIds: formData.getAll("storeIds"),
          }),
        }
      );

      if (response.ok) {
        fetchCollaborateurs();
        setIsDialogOpen(false);
        setEditingCollaborateur(null);
      }
    } catch (error) {
      console.error("Error updating collaborateur:", error);
    }
  };

  const handleDeleteCollaborateur = async (collaborateurId: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce collaborateur ?"))
      return;

    try {
      const response = await fetch(`/api/collaborateurs/${collaborateurId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchCollaborateurs();
      }
    } catch (error) {
      console.error("Error deleting collaborateur:", error);
    }
  };

  const openEditDialog = (collaborateur: Collaborateur) => {
    setEditingCollaborateur(collaborateur);
    setIsDialogOpen(true);
  };

  const openCreateDialog = () => {
    setEditingCollaborateur(null);
    setIsDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">
            Gestion des Collaborateurs
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
            Gestion des Collaborateurs
          </h1>
          <p className="text-gray-600">
            Gérez vos collaborateurs et leurs permissions
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Nouveau Collaborateur
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>
                {editingCollaborateur
                  ? "Modifier le Collaborateur"
                  : "Nouveau Collaborateur"}
              </DialogTitle>
              <DialogDescription>
                {editingCollaborateur
                  ? "Modifiez les informations du collaborateur."
                  : "Créez un nouveau collaborateur dans le système."}
              </DialogDescription>
            </DialogHeader>
            <form
              action={
                editingCollaborateur
                  ? handleUpdateCollaborateur
                  : handleCreateCollaborateur
              }
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="username">Nom d&apos;utilisateur</Label>
                <Input
                  id="username"
                  name="username"
                  defaultValue={editingCollaborateur?.username || ""}
                  required
                />
              </div>
              {!editingCollaborateur && (
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
                <Label htmlFor="name">Nom complet</Label>
                <Input
                  id="name"
                  name="name"
                  defaultValue={editingCollaborateur?.name || ""}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  defaultValue={editingCollaborateur?.email || ""}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Téléphone (optionnel)</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  defaultValue={editingCollaborateur?.phone || ""}
                />
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
                        defaultChecked={editingCollaborateur?.collaborateurStores.some(
                          (cs) => cs.store.id === store.id
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
              {editingCollaborateur && (
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    name="isActive"
                    defaultChecked={editingCollaborateur.isActive}
                    className="rounded"
                  />
                  <Label htmlFor="isActive">Collaborateur actif</Label>
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
                  {editingCollaborateur ? "Modifier" : "Créer"}
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
              Total Collaborateurs
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{collaborateurs.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Collaborateurs Actifs
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {collaborateurs.filter((c) => c.isActive).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Collaborateurs Inactifs
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {collaborateurs.filter((c) => !c.isActive).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Collaborateurs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Liste des Collaborateurs</CardTitle>
          <CardDescription>
            Gérez tous vos collaborateurs et leurs assignations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom d&apos;utilisateur</TableHead>
                <TableHead>Nom complet</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Stores</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {collaborateurs.map((collaborateur) => (
                <TableRow key={collaborateur.id}>
                  <TableCell className="font-medium">
                    {collaborateur.username}
                  </TableCell>
                  <TableCell>{collaborateur.name}</TableCell>
                  <TableCell>{collaborateur.email}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {collaborateur.collaborateurStores.map((cs) => (
                        <Badge
                          key={cs.store.id}
                          variant="outline"
                          className="text-xs"
                        >
                          {cs.store.name}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={collaborateur.isActive ? "default" : "secondary"}
                    >
                      {collaborateur.isActive ? "Actif" : "Inactif"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(collaborateur)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          handleDeleteCollaborateur(collaborateur.id)
                        }
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
