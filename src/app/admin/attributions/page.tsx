"use client";

import { useState, useEffect, useCallback } from "react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Link as LinkIcon, Store, Users, Truck, ListOrdered } from "lucide-react";
import { useRouter } from "next/navigation";

interface Store {
  id: string;
  name: string;
  address: string;
  phone: string;
  isActive: boolean;
  collaborateurStores: {
    collaborateur: {
      id: string;
      username: string;
      name: string;
    };
  }[];
  fournisseurStores: {
    fournisseur: {
      id: string;
      username: string;
      name: string;
    };
  }[];
}

export default function AttributionsPage() {
  const router = useRouter();
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStore, setSelectedStore] = useState<string>("");

  const fetchStores = useCallback(async () => {
    try {
      const response = await fetch("/api/stores");
      if (response.ok) {
        const data = await response.json();
        setStores(data);
        if (data.length > 0 && !selectedStore) {
          setSelectedStore(data[0].id);
        }
      }
    } catch (error) {
      console.error("Error fetching stores:", error);
    } finally {
      setLoading(false);
    }
  }, [selectedStore]);

  useEffect(() => {
    fetchStores();
  }, [fetchStores]);

  const currentStore = stores.find((store) => store.id === selectedStore);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">
            Gestion des Attributions
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
            Gestion des Attributions
          </h1>
          <p className="text-gray-600">
            Gérez les assignations collaborateurs et fournisseurs par store
          </p>
        </div>
      </div>

      {/* Store Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Sélection du Store</CardTitle>
          <CardDescription>
            Choisissez un store pour gérer ses attributions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <Store className="h-5 w-5 text-gray-500" />
            <Select value={selectedStore} onValueChange={setSelectedStore}>
              <SelectTrigger className="w-[300px]">
                <SelectValue placeholder="Sélectionner un store" />
              </SelectTrigger>
              <SelectContent>
                {stores.map((store) => (
                  <SelectItem key={store.id} value={store.id}>
                    {store.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {currentStore && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Collaborateurs */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5" />
                <span>Collaborateurs Assignés</span>
              </CardTitle>
              <CardDescription>
                Collaborateurs assignés au store {currentStore.name}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {currentStore.collaborateurStores.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nom d&apos;utilisateur</TableHead>
                      <TableHead>Nom complet</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentStore.collaborateurStores.map((cs) => (
                      <TableRow key={cs.collaborateur.id}>
                        <TableCell className="font-medium">
                          {cs.collaborateur.username}
                        </TableCell>
                        <TableCell>{cs.collaborateur.name}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-4 text-gray-500">
                  Aucun collaborateur assigné à ce store
                </div>
              )}
            </CardContent>
          </Card>

          {/* Fournisseurs */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Truck className="h-5 w-5" />
                <span>Fournisseurs Assignés</span>
              </CardTitle>
              <CardDescription>
                Fournisseurs assignés au store {currentStore.name}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {currentStore.fournisseurStores.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nom d&apos;utilisateur</TableHead>
                      <TableHead>Nom commercial</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentStore.fournisseurStores.map((fs) => (
                      <TableRow key={fs.fournisseur.id}>
                        <TableCell className="font-medium">
                          {fs.fournisseur.username}
                        </TableCell>
                        <TableCell>{fs.fournisseur.name}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-4 text-gray-500">
                  Aucun fournisseur assigné à ce store
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Store Info */}
      {currentStore && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <LinkIcon className="h-5 w-5" />
              <span>Informations du Store</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <h4 className="font-medium text-gray-900">Détails du Store</h4>
                <div className="mt-2 space-y-1 text-sm text-gray-600">
                  <p>
                    <strong>Nom:</strong> {currentStore.name}
                  </p>
                  <p>
                    <strong>Adresse:</strong> {currentStore.address}
                  </p>
                  <p>
                    <strong>Téléphone:</strong> {currentStore.phone}
                  </p>
                  <p>
                    <strong>Statut:</strong>
                    <Badge
                      variant={currentStore.isActive ? "default" : "secondary"}
                      className="ml-2"
                    >
                      {currentStore.isActive ? "Actif" : "Inactif"}
                    </Badge>
                  </p>
                </div>
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Statistiques</h4>
                <div className="mt-2 space-y-1 text-sm text-gray-600">
                  <p>
                    <strong>Collaborateurs:</strong>{" "}
                    {currentStore.collaborateurStores.length}
                  </p>
                  <p>
                    <strong>Fournisseurs:</strong>{" "}
                    {currentStore.fournisseurStores.length}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Actions Rapides</CardTitle>
          <CardDescription>Gérez rapidement les attributions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <Button asChild>
              <a href="/admin/collaborateurs">
                <Users className="h-4 w-4 mr-2" />
                Gérer les Collaborateurs
              </a>
            </Button>
            <Button asChild variant="outline">
              <a href="/admin/fournisseurs">
                <Truck className="h-4 w-4 mr-2" />
                Gérer les Fournisseurs
              </a>
            </Button>
            <Button asChild variant="outline">
              <a href="/admin/stores">
                <Store className="h-4 w-4 mr-2" />
                Gérer les Stores
              </a>
            </Button>
            {selectedStore && (
              <Button
                variant="outline"
                className="natura-gradient text-white border-0"
                onClick={() =>
                  router.push(
                    `/admin/stores/${selectedStore}/category-priorities`
                  )
                }
              >
                <ListOrdered className="h-4 w-4 mr-2" />
                Gérer Priorités par Catégorie
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
