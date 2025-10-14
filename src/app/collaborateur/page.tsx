"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, MessageSquare, Clock, CheckCircle } from "lucide-react";

export default function CollaborateurDashboard() {
  // Mock data - will be replaced with real data from API
  const stats = {
    todayOrders: 8,
    pendingOrders: 3,
    completedOrders: 5,
    whatsappMessages: 12,
    averagePrepTime: "25 min",
  };

  const recentOrders = [
    {
      id: "ORD-001",
      customer: "Ahmed Benali",
      total: 150.0,
      status: "En préparation",
      time: "14:30",
    },
    {
      id: "ORD-002",
      customer: "Fatima Alami",
      total: 89.5,
      status: "Prête",
      time: "13:45",
    },
    {
      id: "ORD-003",
      customer: "Omar Tazi",
      total: 220.0,
      status: "En attente",
      time: "15:15",
    },
  ];

  const recentMessages = [
    {
      customer: "Ahmed Benali",
      message: "Bonjour, ma commande est-elle prête ?",
      time: "15:20",
      unread: true,
    },
    {
      customer: "Fatima Alami",
      message: "Merci pour la livraison rapide !",
      time: "14:30",
      unread: false,
    },
    {
      customer: "Omar Tazi",
      message: "Pouvez-vous ajouter des tomates ?",
      time: "13:45",
      unread: true,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Dashboard Collaborateur
        </h1>
        <p className="text-gray-600">
          Gestion des commandes et communication clients
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Commandes Aujourd&apos;hui
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.todayOrders}</div>
            <p className="text-xs text-muted-foreground">
              {stats.pendingOrders} en attente
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Commandes Terminées
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedOrders}</div>
            <p className="text-xs text-muted-foreground">
              Temps moyen: {stats.averagePrepTime}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Messages WhatsApp
            </CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.whatsappMessages}</div>
            <p className="text-xs text-muted-foreground">Aujourd&apos;hui</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En Attente</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingOrders}</div>
            <p className="text-xs text-muted-foreground">Commandes à traiter</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Commandes Récentes</CardTitle>
            <CardDescription>Dernières commandes reçues</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between"
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <p className="text-sm font-medium">{order.id}</p>
                      <Badge
                        variant={
                          order.status === "Prête"
                            ? "default"
                            : order.status === "En préparation"
                            ? "secondary"
                            : "outline"
                        }
                      >
                        {order.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-500">
                      {order.customer} - {order.time}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      {order.total.toFixed(2)} MAD
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Messages WhatsApp</CardTitle>
            <CardDescription>Derniers messages clients</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentMessages.map((message, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <div
                    className={`w-2 h-2 rounded-full mt-2 ${
                      message.unread ? "bg-blue-500" : "bg-gray-300"
                    }`}
                  ></div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">{message.customer}</p>
                      <p className="text-xs text-gray-500">{message.time}</p>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {message.message}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Actions Rapides</CardTitle>
          <CardDescription>
            Accès rapide aux fonctionnalités principales
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
              <Package className="h-8 w-8 text-blue-500" />
              <div>
                <h3 className="font-medium">Gérer les Commandes</h3>
                <p className="text-sm text-gray-500">
                  Voir et traiter les commandes
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
              <MessageSquare className="h-8 w-8 text-green-500" />
              <div>
                <h3 className="font-medium">WhatsApp</h3>
                <p className="text-sm text-gray-500">
                  Communiquer avec les clients
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <div>
                <h3 className="font-medium">Marquer Prêt</h3>
                <p className="text-sm text-gray-500">
                  Marquer les commandes comme prêtes
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
