"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, Clock, CheckCircle, AlertCircle } from "lucide-react";

export default function FournisseurDashboard() {
  // Mock data - will be replaced with real data from API
  const stats = {
    totalOrders: 15,
    pendingOrders: 3,
    inProgressOrders: 5,
    completedOrders: 7,
    todayOrders: 8,
  };

  const recentOrders = [
    {
      id: "ORD-001",
      items: ["Viande de bœuf (2kg)", "Poulet entier (1kg)"],
      total: 150.0,
      status: "En préparation",
      time: "14:30",
      priority: "Normal",
    },
    {
      id: "ORD-002",
      items: ["Légumes variés (3kg)", "Fruits de saison (2kg)"],
      total: 89.5,
      status: "En attente",
      time: "13:45",
      priority: "Urgent",
    },
    {
      id: "ORD-003",
      items: ["Épices marocaines", "Huile d&apos;olive (1L)"],
      total: 45.0,
      status: "Prêt",
      time: "12:30",
      priority: "Normal",
    },
  ];

  const orderStats = [
    { label: "En attente", count: stats.pendingOrders, color: "bg-yellow-500" },
    {
      label: "En préparation",
      count: stats.inProgressOrders,
      color: "bg-blue-500",
    },
    { label: "Prêtes", count: stats.completedOrders, color: "bg-green-500" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Dashboard Fournisseur
        </h1>
        <p className="text-gray-600">Gestion de vos commandes et préparation</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Commandes
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalOrders}</div>
            <p className="text-xs text-muted-foreground">
              {stats.todayOrders} aujourd&apos;hui
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En Attente</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingOrders}</div>
            <p className="text-xs text-muted-foreground">À traiter</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              En Préparation
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.inProgressOrders}</div>
            <p className="text-xs text-muted-foreground">En cours</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Terminées</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedOrders}</div>
            <p className="text-xs text-muted-foreground">Prêtes à livrer</p>
          </CardContent>
        </Card>
      </div>

      {/* Order Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Statut des Commandes</CardTitle>
          <CardDescription>
            Répartition des commandes par statut
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {orderStats.map((stat) => (
              <div key={stat.label} className="flex items-center space-x-3">
                <div className={`w-4 h-4 rounded-full ${stat.color}`}></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{stat.label}</p>
                  <p className="text-2xl font-bold">{stat.count}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Orders */}
      <Card>
        <CardHeader>
          <CardTitle>Commandes Récentes</CardTitle>
          <CardDescription>Dernières commandes assignées</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentOrders.map((order) => (
              <div
                key={order.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <p className="text-sm font-medium">{order.id}</p>
                    <Badge
                      variant={
                        order.status === "Prêt"
                          ? "default"
                          : order.status === "En préparation"
                          ? "secondary"
                          : "outline"
                      }
                    >
                      {order.status}
                    </Badge>
                    <Badge
                      variant={
                        order.priority === "Urgent" ? "destructive" : "outline"
                      }
                    >
                      {order.priority}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    {order.items.map((item, index) => (
                      <p key={index} className="text-xs text-gray-500">
                        • {item}
                      </p>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">{order.time}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">
                    {order.total.toFixed(2)} MAD
                  </p>
                  <div className="mt-2 space-x-2">
                    {order.status === "En attente" && (
                      <button className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                        Commencer
                      </button>
                    )}
                    {order.status === "En préparation" && (
                      <button className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                        Marquer Prêt
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Actions Rapides</CardTitle>
          <CardDescription>Gestion rapide de vos commandes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
              <Clock className="h-8 w-8 text-yellow-500" />
              <div>
                <h3 className="font-medium">Commandes en Attente</h3>
                <p className="text-sm text-gray-500">
                  Voir les nouvelles commandes
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
              <AlertCircle className="h-8 w-8 text-blue-500" />
              <div>
                <h3 className="font-medium">En Préparation</h3>
                <p className="text-sm text-gray-500">Commandes en cours</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <div>
                <h3 className="font-medium">Marquer Prêt</h3>
                <p className="text-sm text-gray-500">Finaliser les commandes</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
