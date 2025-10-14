"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Store,
  Users,
  Truck,
  Package,
  TrendingUp,
  Activity,
  Clock,
  CheckCircle,
} from "lucide-react";

interface DashboardStats {
  totalStores: number;
  activeStores: number;
  totalCollaborateurs: number;
  activeCollaborateurs: number;
  totalFournisseurs: number;
  activeFournisseurs: number;
  totalOrders: number;
  pendingOrders: number;
  todayOrders: number;
}

interface ActivityEvent {
  id: string;
  type: string;
  title: string;
  description: string;
  timestamp: Date;
  user?: {
    name: string;
    role: string;
  };
  store?: {
    name: string;
  };
  order?: {
    id: string;
    status: string;
  };
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalStores: 0,
    activeStores: 0,
    totalCollaborateurs: 0,
    activeCollaborateurs: 0,
    totalFournisseurs: 0,
    activeFournisseurs: 0,
    totalOrders: 0,
    pendingOrders: 0,
    todayOrders: 0,
  });

  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch stats and activities in parallel
      const [statsResponse, activitiesResponse] = await Promise.all([
        fetch("/api/dashboard/stats"),
        fetch("/api/activities?limit=5"),
      ]);

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData);
      }

      if (activitiesResponse.ok) {
        const activitiesData = await activitiesResponse.json();
        setActivities(activitiesData);
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-green-50 to-emerald-50">
      <div className="space-y-8 p-8">
        {/* Header Section */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-green-600/10 to-emerald-600/10 rounded-3xl blur-3xl"></div>
          <div className="relative bg-white/80 backdrop-blur-sm rounded-3xl p-8 border border-white/20 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-6">
                <div className="relative">
                  <div className="w-16 h-16 natura-gradient rounded-2xl flex items-center justify-center shadow-2xl">
                    <span className="text-2xl font-bold text-white">N</span>
                  </div>
                  <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                  </div>
                </div>
                <div>
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                    Dashboard Admin
                  </h1>
                  <p className="text-gray-600 text-lg font-medium">
                    Vue d&apos;ensemble du système Natura Beldi
                  </p>
                </div>
              </div>
              <div className="hidden lg:flex items-center space-x-4">
                <div className="text-right">
                  <p className="text-sm text-gray-500">Dernière mise à jour</p>
                  <p className="text-lg font-semibold text-gray-900">
                    Il y a 2 min
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <Activity className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {/* Stores Card */}
          <div className="group relative">
            <Card className="relative bg-white/90 border-0 shadow-lg hover:shadow-xl transition-shadow duration-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl shadow-lg">
                    <Store className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex items-center space-x-1 text-green-600">
                    <TrendingUp className="h-4 w-4" />
                    <span className="text-sm font-semibold">+12%</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-gray-600 uppercase tracking-wide">
                    Stores
                  </h3>
                  <div className="text-3xl font-bold text-gray-900">
                    {stats.totalStores}
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-green-600 font-medium">
                      {stats.activeStores} actifs
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Collaborateurs Card */}
          <div className="group relative">
            <Card className="relative bg-white/90 border-0 shadow-lg hover:shadow-xl transition-shadow duration-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl shadow-lg">
                    <Users className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex items-center space-x-1 text-blue-600">
                    <TrendingUp className="h-4 w-4" />
                    <span className="text-sm font-semibold">+8%</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-gray-600 uppercase tracking-wide">
                    Collaborateurs
                  </h3>
                  <div className="text-3xl font-bold text-gray-900">
                    {stats.totalCollaborateurs}
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-sm text-blue-600 font-medium">
                      {stats.activeCollaborateurs} actifs
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Fournisseurs Card */}
          <div className="group relative">
            <Card className="relative bg-white/90 border-0 shadow-lg hover:shadow-xl transition-shadow duration-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-gradient-to-br from-orange-500 to-amber-500 rounded-xl shadow-lg">
                    <Truck className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex items-center space-x-1 text-orange-600">
                    <TrendingUp className="h-4 w-4" />
                    <span className="text-sm font-semibold">+15%</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-gray-600 uppercase tracking-wide">
                    Fournisseurs
                  </h3>
                  <div className="text-3xl font-bold text-gray-900">
                    {stats.totalFournisseurs}
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                    <span className="text-sm text-orange-600 font-medium">
                      {stats.activeFournisseurs} actifs
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Commandes Card */}
          <div className="group relative">
            <Card className="relative bg-white/90 border-0 shadow-lg hover:shadow-xl transition-shadow duration-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl shadow-lg">
                    <Package className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex items-center space-x-1 text-purple-600">
                    <TrendingUp className="h-4 w-4" />
                    <span className="text-sm font-semibold">+23%</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-gray-600 uppercase tracking-wide">
                    Commandes
                  </h3>
                  <div className="text-3xl font-bold text-gray-900">
                    {stats.totalOrders}
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    <span className="text-sm text-purple-600 font-medium">
                      {stats.pendingOrders} en attente
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Recent Activity */}
          <div className="group relative">
            <Card className="relative bg-white/90 border-0 shadow-lg hover:shadow-xl transition-shadow duration-200">
              <CardHeader className="pb-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg">
                    <Activity className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-bold text-gray-900">
                      Activité Récente
                    </CardTitle>
                    <CardDescription className="text-gray-600">
                      Dernières actions dans le système
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="flex items-start space-x-4">
                        <div className="w-3 h-3 bg-gray-200 rounded-full animate-pulse"></div>
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                          <div className="h-3 bg-gray-200 rounded w-2/3 animate-pulse"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : activities.length > 0 ? (
                  <div className="space-y-6">
                    {activities.map((activity, index) => {
                      const getActivityColor = (type: string) => {
                        switch (type) {
                          case "STORE_CREATED":
                          case "STORE_UPDATED":
                            return "green";
                          case "COLLABORATEUR_ADDED":
                          case "COLLABORATEUR_UPDATED":
                            return "blue";
                          case "FOURNISSEUR_ADDED":
                          case "FOURNISSEUR_UPDATED":
                            return "orange";
                          case "ORDER_CREATED":
                          case "ORDER_UPDATED":
                            return "yellow";
                          case "USER_LOGIN":
                            return "emerald";
                          case "USER_LOGOUT":
                            return "red";
                          case "CREDENTIAL_ADDED":
                          case "CREDENTIAL_UPDATED":
                          case "CREDENTIAL_TESTED":
                            return "purple";
                          case "CREDENTIAL_DELETED":
                            return "red";
                          case "MESSAGE_SENT":
                          case "MESSAGING_MESSAGE_SENT":
                            return "green";
                          case "MESSAGING_MESSAGE_RECEIVED":
                            return "blue";
                          case "MESSAGING_MESSAGE_ERROR":
                            return "red";
                          case "ORDER_SYNC":
                            return "blue";
                          default:
                            return "gray";
                        }
                      };

                      const color = getActivityColor(activity.type);
                      const isLast = index === activities.length - 1;

                      return (
                        <div
                          key={activity.id}
                          className="flex items-start space-x-4 group/item"
                        >
                          <div className="relative">
                            <div
                              className={`w-3 h-3 bg-${color}-500 rounded-full`}
                            ></div>
                            {!isLast && (
                              <div
                                className={`absolute top-0 left-1/2 w-0.5 h-6 bg-gradient-to-b from-${color}-500 to-transparent transform -translate-x-1/2`}
                              ></div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p
                              className={`text-sm font-semibold text-gray-900 group-hover/item:text-${color}-600 transition-colors`}
                            >
                              {activity.title}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {activity.description}
                            </p>
                          </div>
                          <Clock className="h-4 w-4 text-gray-400" />
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Activity className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">Aucune activité récente</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Store Status */}
          <div className="group relative">
            <Card className="relative bg-white/90 border-0 shadow-lg hover:shadow-xl transition-shadow duration-200">
              <CardHeader className="pb-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg">
                    <Store className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-bold text-gray-900">
                      Statut des Stores
                    </CardTitle>
                    <CardDescription className="text-gray-600">
                      État actuel de tous les stores
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="flex items-center justify-between p-4 bg-green-50 rounded-xl border border-green-200 group/item">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg flex items-center justify-center">
                        <Store className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">
                          Store Casablanca
                        </p>
                        <p className="text-xs text-gray-500">
                          3 collaborateurs, 5 fournisseurs
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <Badge className="bg-green-100 text-green-800 border-green-200">
                        Actif
                      </Badge>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-green-50 rounded-xl border border-green-200 group/item">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg flex items-center justify-center">
                        <Store className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">
                          Store Rabat
                        </p>
                        <p className="text-xs text-gray-500">
                          2 collaborateurs, 4 fournisseurs
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <Badge className="bg-green-100 text-green-800 border-green-200">
                        Actif
                      </Badge>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200 group/item">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-gray-400 to-gray-500 rounded-lg flex items-center justify-center">
                        <Store className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">
                          Store Marrakech
                        </p>
                        <p className="text-xs text-gray-500">
                          1 collaborateur, 3 fournisseurs
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                      <Badge
                        variant="secondary"
                        className="bg-gray-100 text-gray-800 border-gray-200"
                      >
                        Inactif
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
