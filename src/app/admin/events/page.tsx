"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Activity,
  Search,
  Filter,
  RefreshCw,
  Clock,
  Trash2,
  AlertCircle,
  CheckCircle,
  XCircle,
  MessageSquare,
  Store,
  Users,
  Truck,
  Key,
  ShoppingCart,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface Event {
  id: string;
  type: string;
  title: string;
  description: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  userId?: string;
  storeId?: string;
  orderId?: string;
  user?: {
    name: string;
    email: string;
  };
  store?: {
    name: string;
  };
  order?: {
    orderId: string;
    orderCode?: string;
  };
}

interface EventFilters {
  type: string;
  dateRange: string;
  search: string;
}

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalEvents, setTotalEvents] = useState(0);
  const [filters, setFilters] = useState<EventFilters>({
    type: "all",
    dateRange: "all",
    search: "",
  });
  const { toast } = useToast();

  const EVENTS_PER_PAGE = 10;

  // Load events
  const loadEvents = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: EVENTS_PER_PAGE.toString(),
        type: filters.type,
        dateRange: filters.dateRange,
        search: filters.search,
      });

      const response = await fetch(`/api/events?${params}`);
      if (response.ok) {
        const data = await response.json();
        setEvents(data.events || []);
        setTotalPages(data.totalPages || 1);
        setTotalEvents(data.totalEvents || 0);
      } else {
        throw new Error("Erreur lors du chargement des événements");
      }
    } catch (error) {
      console.error("Error loading events:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les événements",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [currentPage, filters, toast]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  // Filter events
  const filteredEvents = events;

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("fr-FR");
  };

  // Get event color
  const getEventColor = (type: string) => {
    switch (type) {
      case "STORE_CREATED":
      case "STORE_UPDATED":
        return "bg-green-500";
      case "COLLABORATEUR_ADDED":
      case "COLLABORATEUR_UPDATED":
        return "bg-blue-500";
      case "FOURNISSEUR_ADDED":
      case "FOURNISSEUR_UPDATED":
        return "bg-orange-500";
      case "ORDER_CREATED":
      case "ORDER_UPDATED":
      case "ORDER_DISPATCHED":
        return "bg-yellow-500";
      case "ORDER_CANCELLED":
      case "ORDER_DELETED":
        return "bg-red-500";
      case "USER_LOGIN":
        return "bg-emerald-500";
      case "USER_LOGOUT":
        return "bg-red-500";
      case "CREDENTIAL_ADDED":
      case "CREDENTIAL_UPDATED":
      case "CREDENTIAL_TESTED":
        return "bg-purple-500";
      case "CREDENTIAL_DELETED":
        return "bg-red-500";
      case "MESSAGE_SENT":
      case "MESSAGING_MESSAGE_SENT":
        return "bg-green-500";
      case "MESSAGING_MESSAGE_RECEIVED":
        return "bg-blue-500";
      case "MESSAGING_MESSAGE_ERROR":
        return "bg-red-500";
      case "ORDER_SYNC":
        return "bg-blue-500";
      default:
        return "bg-gray-500";
    }
  };

  // Get event icon
  const getEventIcon = (type: string) => {
    switch (type) {
      case "STORE_CREATED":
      case "STORE_UPDATED":
        return <Store className="w-4 h-4" />;
      case "COLLABORATEUR_ADDED":
      case "COLLABORATEUR_UPDATED":
        return <Users className="w-4 h-4" />;
      case "FOURNISSEUR_ADDED":
      case "FOURNISSEUR_UPDATED":
        return <Truck className="w-4 h-4" />;
      case "ORDER_CREATED":
      case "ORDER_UPDATED":
      case "ORDER_DISPATCHED":
      case "ORDER_CANCELLED":
      case "ORDER_DELETED":
        return <ShoppingCart className="w-4 h-4" />;
      case "USER_LOGIN":
        return <CheckCircle className="w-4 h-4" />;
      case "USER_LOGOUT":
        return <XCircle className="w-4 h-4" />;
      case "CREDENTIAL_ADDED":
      case "CREDENTIAL_UPDATED":
      case "CREDENTIAL_TESTED":
      case "CREDENTIAL_DELETED":
        return <Key className="w-4 h-4" />;
      case "MESSAGE_SENT":
      case "MESSAGING_MESSAGE_SENT":
      case "MESSAGING_MESSAGE_RECEIVED":
      case "MESSAGING_MESSAGE_ERROR":
        return <MessageSquare className="w-4 h-4" />;
      case "ORDER_SYNC":
        return <Activity className="w-4 h-4" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  // Get event type label
  const getEventTypeLabel = (type: string) => {
    switch (type) {
      case "STORE_CREATED": return "Store créé";
      case "STORE_UPDATED": return "Store modifié";
      case "COLLABORATEUR_ADDED": return "Collaborateur ajouté";
      case "COLLABORATEUR_UPDATED": return "Collaborateur modifié";
      case "FOURNISSEUR_ADDED": return "Fournisseur ajouté";
      case "FOURNISSEUR_UPDATED": return "Fournisseur modifié";
      case "ORDER_CREATED": return "Commande créée";
      case "ORDER_UPDATED": return "Commande modifiée";
      case "ORDER_DISPATCHED": return "Commande expédiée";
      case "ORDER_CANCELLED": return "Commande annulée";
      case "ORDER_DELETED": return "Commande supprimée";
      case "USER_LOGIN": return "Connexion";
      case "USER_LOGOUT": return "Déconnexion";
      case "CREDENTIAL_ADDED": return "Credential ajoutée";
      case "CREDENTIAL_UPDATED": return "Credential modifiée";
      case "CREDENTIAL_TESTED": return "Credential testée";
      case "CREDENTIAL_DELETED": return "Credential supprimée";
      case "MESSAGE_SENT": return "Message envoyé";
      case "MESSAGING_MESSAGE_SENT": return "Message automatique";
      case "MESSAGING_MESSAGE_RECEIVED": return "Message reçu";
      case "MESSAGING_MESSAGE_ERROR": return "Erreur message";
      case "ORDER_SYNC": return "Synchronisation";
      default: return type;
    }
  };

  // Delete event
  const deleteEvent = async (eventId: string) => {
    try {
      const response = await fetch(`/api/events/${eventId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast({
          title: "Événement supprimé",
          description: "L'événement a été supprimé avec succès",
        });
        loadEvents();
      } else {
        throw new Error("Erreur lors de la suppression");
      }
    } catch (error) {
      console.error("Error deleting event:", error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer l'événement",
        variant: "destructive",
      });
    }
  };

  // Clear old events
  const clearOldEvents = async () => {
    try {
      const response = await fetch("/api/events/cleanup", {
        method: "POST",
      });

      if (response.ok) {
        toast({
          title: "Nettoyage terminé",
          description: "Les anciens événements ont été supprimés",
        });
        loadEvents();
      } else {
        throw new Error("Erreur lors du nettoyage");
      }
    } catch (error) {
      console.error("Error cleaning events:", error);
      toast({
        title: "Erreur",
        description: "Impossible de nettoyer les événements",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Événements</h1>
          <p className="text-gray-600">
            Historique complet des événements ({totalEvents} événements)
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={loadEvents} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Actualiser
          </Button>
          <Button onClick={clearOldEvents} variant="outline">
            <Trash2 className="w-4 h-4 mr-2" />
            Nettoyer
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Activity className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Événements</p>
                <p className="text-2xl font-bold">{totalEvents}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <MessageSquare className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Messages</p>
                <p className="text-2xl font-bold">
                  {events.filter(e => e.type.includes("MESSAGE")).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <ShoppingCart className="h-8 w-8 text-yellow-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Commandes</p>
                <p className="text-2xl font-bold">
                  {events.filter(e => e.type.includes("ORDER")).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <AlertCircle className="h-8 w-8 text-red-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Erreurs</p>
                <p className="text-2xl font-bold">
                  {events.filter(e => e.type.includes("ERROR")).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filtres
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="search">Recherche</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  id="search"
                  placeholder="Titre, description..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="type">Type d&apos;événement</Label>
              <Select
                value={filters.type}
                onValueChange={(value) => setFilters({ ...filters, type: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Tous les types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les types</SelectItem>
                  <SelectItem value="ORDER">Commandes</SelectItem>
                  <SelectItem value="MESSAGE">Messages</SelectItem>
                  <SelectItem value="STORE">Stores</SelectItem>
                  <SelectItem value="USER">Utilisateurs</SelectItem>
                  <SelectItem value="CREDENTIAL">Credentials</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="dateRange">Période</Label>
              <Select
                value={filters.dateRange}
                onValueChange={(value) => setFilters({ ...filters, dateRange: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Toutes les périodes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les périodes</SelectItem>
                  <SelectItem value="today">Aujourd&apos;hui</SelectItem>
                  <SelectItem value="week">Cette semaine</SelectItem>
                  <SelectItem value="month">Ce mois</SelectItem>
                  <SelectItem value="year">Cette année</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Events Table */}
      <Card>
        <CardHeader>
          <CardTitle>Liste des événements</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin" />
              <span className="ml-2">Chargement des événements...</span>
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="text-center py-8">
              <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Aucun événement trouvé</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Événement</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Utilisateur</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEvents.map((event) => (
                    <TableRow key={event.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 ${getEventColor(event.type)} rounded-full`}></div>
                          <Badge variant="outline">
                            {getEventTypeLabel(event.type)}
                          </Badge>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getEventIcon(event.type)}
                          <span className="font-medium">{event.title}</span>
                        </div>
                      </TableCell>

                      <TableCell>
                        <p className="text-sm text-gray-600 max-w-xs truncate">
                          {event.description}
                        </p>
                      </TableCell>

                      <TableCell>
                        <div>
                          <p className="text-sm font-medium">
                            {event.user?.name || "Système"}
                          </p>
                          {event.store?.name && (
                            <p className="text-xs text-gray-500">
                              {event.store.name}
                            </p>
                          )}
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-gray-400" />
                          <span className="text-sm">{formatDate(event.createdAt)}</span>
                        </div>
                      </TableCell>

                      <TableCell>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => deleteEvent(event.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Page {currentPage} sur {totalPages} ({totalEvents} événements)
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  Précédent
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                >
                  Suivant
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
