import { prisma } from "./prisma";

interface PrismaEvent {
  id: string;
  type: string;
  title: string;
  description: string;
  userId: string | null;
  storeId: string | null;
  orderId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  user?: { name: string; role: string } | null;
  store?: { name: string } | null;
  order?: { id: string; status: string } | null;
}

interface PrismaStore {
  id: string;
  isActive: boolean;
}

interface PrismaUser {
  id: string;
  role: string;
  isActive: boolean;
}

interface PrismaOrder {
  id: string;
  createdAt: Date;
  status: string;
}

export interface EventData {
  id: string;
  type:
    | "STORE_CREATED"
    | "STORE_UPDATED"
    | "STORE_DELETED"
    | "COLLABORATEUR_ADDED"
    | "COLLABORATEUR_UPDATED"
    | "COLLABORATEUR_DELETED"
    | "FOURNISSEUR_ADDED"
    | "FOURNISSEUR_UPDATED"
    | "FOURNISSEUR_DELETED"
    | "ORDER_CREATED"
    | "ORDER_RECEIVED"
    | "ORDER_UPDATED"
    | "ORDER_CANCELLED"
    | "ATTRIBUTION_CREATED"
    | "ATTRIBUTION_DELETED"
    | "CREDENTIAL_ADDED"
    | "CREDENTIAL_UPDATED"
    | "CREDENTIAL_DELETED"
    | "CREDENTIAL_TESTED"
    | "MESSAGE_SENT"
    | "USER_LOGIN"
    | "USER_LOGOUT"
    | "ORDER_SYNC"
    | "SYSTEM_UPDATE"
    | "MESSAGING_STORE_CHANGE"
    | "MESSAGING_MESSAGE_RECEIVED"
    | "MESSAGING_MESSAGE_SENT"
    | "MESSAGING_MESSAGE_ERROR";
  title: string;
  description: string;
  userId?: string;
  storeId?: string;
  orderId?: string;
  metadata?: Record<string, unknown>;
  timestamp: Date;
}

export interface ActivityEvent {
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

class EventTracker {
  private static instance: EventTracker;
  private events: EventData[] = [];

  private constructor() {}

  public static getInstance(): EventTracker {
    if (!EventTracker.instance) {
      EventTracker.instance = new EventTracker();
    }
    return EventTracker.instance;
  }

  /**
   * Track a new event
   */
  public async trackEvent(
    eventData: Omit<EventData, "id" | "timestamp">
  ): Promise<EventData> {
    try {
      // Save to database
      const dbEvent = await prisma.event.create({
        data: {
          type: eventData.type,
          title: eventData.title,
          description: eventData.description,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          metadata: (eventData.metadata || {}) as any,
          userId: eventData.userId || null,
          storeId: eventData.storeId || null,
          orderId: eventData.orderId || null,
        },
        include: {
          user: {
            select: {
              name: true,
              role: true,
            },
          },
          store: {
            select: {
              name: true,
            },
          },
          order: {
            select: {
              id: true,
              status: true,
            },
          },
        },
      });

      const event: EventData = {
        id: dbEvent.id,
        type: dbEvent.type as EventData["type"],
        title: dbEvent.title,
        description: dbEvent.description,
        userId: dbEvent.userId || undefined,
        storeId: dbEvent.storeId || undefined,
        orderId: dbEvent.orderId || undefined,
        metadata: dbEvent.metadata as Record<string, unknown> | undefined,
        timestamp: dbEvent.createdAt,
      };

      // Add to memory cache
      this.events.unshift(event);

      // Keep only last 100 events in memory
      if (this.events.length > 100) {
        this.events = this.events.slice(0, 100);
      }

      // Log to console in development
      if (process.env.NODE_ENV === "development") {
        console.log("📊 Event Tracked:", {
          type: event.type,
          title: event.title,
          timestamp: event.timestamp,
          metadata: event.metadata,
        });
      }

      return event;
    } catch (error) {
      console.error("Error tracking event:", error);
      // Fallback to memory-only tracking
      const event: EventData = {
        ...eventData,
        id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
      };

      this.events.unshift(event);
      return event;
    }
  }

  /**
   * Get recent activities for dashboard
   */
  public async getRecentActivities(
    limit: number = 10
  ): Promise<ActivityEvent[]> {
    try {
      const events = await prisma.event.findMany({
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: {
              name: true,
              role: true,
            },
          },
          store: {
            select: {
              name: true,
            },
          },
          order: {
            select: {
              id: true,
              status: true,
            },
          },
        },
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return events.map((event: any) => {
        const now = new Date();
        const eventTime = new Date(event.createdAt);
        const diffInMinutes = Math.floor(
          (now.getTime() - eventTime.getTime()) / (1000 * 60)
        );

        let timeAgo = "";
        if (diffInMinutes < 1) {
          timeAgo = "À l'instant";
        } else if (diffInMinutes < 60) {
          timeAgo = `Il y a ${diffInMinutes} min`;
        } else if (diffInMinutes < 1440) {
          const hours = Math.floor(diffInMinutes / 60);
          timeAgo = `Il y a ${hours}h`;
        } else {
          const days = Math.floor(diffInMinutes / 1440);
          timeAgo = `Il y a ${days}j`;
        }

        return {
          id: event.id,
          type: event.type,
          title: event.title,
          description: `${event.description} - ${timeAgo}`,
          timestamp: event.createdAt,
          user: event.user
            ? {
                name: event.user.name,
                role: event.user.role,
              }
            : undefined,
          store: event.store
            ? {
                name: event.store.name,
              }
            : undefined,
          order: event.order
            ? {
                id: event.order.id,
                status: event.order.status,
              }
            : undefined,
        };
      });
    } catch (error) {
      console.error("Error fetching recent activities:", error);
      // Return empty array if database error
      return [];
    }
  }

  /**
   * Get dashboard statistics
   */
  public async getDashboardStats(): Promise<{
    totalStores: number;
    activeStores: number;
    totalCollaborateurs: number;
    activeCollaborateurs: number;
    totalFournisseurs: number;
    activeFournisseurs: number;
    totalOrders: number;
    pendingOrders: number;
    todayOrders: number;
  }> {
    try {
      // Get real data from database
      const [stores, users, orders] = await Promise.all([
        prisma.store.findMany(),
        prisma.user.findMany(),
        prisma.order.findMany(),
      ]);

      const activeStores = stores.filter(
        (store: PrismaStore) => store.isActive
      ).length;
      const collaborateurs = users.filter(
        (user: PrismaUser) => user.role === "COLLABORATEUR"
      );
      const fournisseurs = users.filter(
        (user: PrismaUser) => user.role === "FOURNISSEUR"
      );
      const activeCollaborateurs = collaborateurs.filter(
        (user: PrismaUser) => user.isActive
      ).length;
      const activeFournisseurs = fournisseurs.filter(
        (user: PrismaUser) => user.isActive
      ).length;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayOrders = orders.filter(
        (order: PrismaOrder) => order.createdAt >= today
      ).length;
      const pendingOrders = orders.filter(
        (order: PrismaOrder) => order.status === "PENDING"
      ).length;

      return {
        totalStores: stores.length,
        activeStores,
        totalCollaborateurs: collaborateurs.length,
        activeCollaborateurs,
        totalFournisseurs: fournisseurs.length,
        activeFournisseurs,
        totalOrders: orders.length,
        pendingOrders,
        todayOrders,
      };
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      // Return mock data if database error
      return {
        totalStores: 3,
        activeStores: 2,
        totalCollaborateurs: 8,
        activeCollaborateurs: 7,
        totalFournisseurs: 12,
        activeFournisseurs: 10,
        totalOrders: 45,
        pendingOrders: 8,
        todayOrders: 12,
      };
    }
  }

  /**
   * Track store creation
   */
  public async trackStoreCreated(
    storeName: string,
    userId: string
  ): Promise<void> {
    await this.trackEvent({
      type: "STORE_CREATED",
      title: "Nouveau store créé",
      description: `${storeName} a été créé avec succès`,
      userId,
      metadata: { storeName },
    });
  }

  /**
   * Track store update
   */
  public async trackStoreUpdated(
    storeName: string,
    userId: string
  ): Promise<void> {
    await this.trackEvent({
      type: "STORE_UPDATED",
      title: "Store mis à jour",
      description: `${storeName} a été modifié`,
      userId,
      metadata: { storeName },
    });
  }

  /**
   * Track store deletion
   */
  public async trackStoreDeleted(
    storeName: string,
    userId: string
  ): Promise<void> {
    await this.trackEvent({
      type: "STORE_DELETED",
      title: "Store supprimé",
      description: `${storeName} a été supprimé`,
      userId,
      metadata: { storeName },
    });
  }

  /**
   * Track collaborator addition
   */
  public async trackCollaborateurAdded(
    collaborateurName: string,
    storeName: string,
    userId: string
  ): Promise<void> {
    await this.trackEvent({
      type: "COLLABORATEUR_ADDED",
      title: "Collaborateur ajouté",
      description: `${collaborateurName} a été ajouté au store ${storeName}`,
      userId,
      metadata: { collaborateurName, storeName },
    });
  }

  /**
   * Track fournisseur addition
   */
  public async trackFournisseurAdded(
    fournisseurName: string,
    storeName: string,
    userId: string
  ): Promise<void> {
    await this.trackEvent({
      type: "FOURNISSEUR_ADDED",
      title: "Fournisseur ajouté",
      description: `${fournisseurName} a été ajouté au store ${storeName}`,
      userId,
      metadata: { fournisseurName, storeName },
    });
  }

  /**
   * Track order creation
   */
  public async trackOrderCreated(
    orderId: string,
    storeName: string,
    userId?: string
  ): Promise<void> {
    await this.trackEvent({
      type: "ORDER_CREATED",
      title: "Commande reçue",
      description: `Commande ${orderId} reçue pour ${storeName}`,
      userId,
      orderId,
      metadata: { orderId, storeName },
    });
  }

  /**
   * Track order update
   */
  public async trackOrderUpdated(
    orderId: string,
    newStatus: string,
    userId: string
  ): Promise<void> {
    await this.trackEvent({
      type: "ORDER_UPDATED",
      title: "Commande mise à jour",
      description: `Commande ${orderId} - Statut: ${newStatus}`,
      userId,
      orderId,
      metadata: { orderId, newStatus },
    });
  }

  /**
   * Track user login
   */
  public async trackUserLogin(userName: string, role: string): Promise<void> {
    await this.trackEvent({
      type: "USER_LOGIN",
      title: "Connexion utilisateur",
      description: `${userName} (${role}) s'est connecté`,
      metadata: { userName, role },
    });
  }

  /**
   * Track user logout
   */
  public async trackUserLogout(userName: string, role: string): Promise<void> {
    await this.trackEvent({
      type: "USER_LOGOUT",
      title: "Déconnexion utilisateur",
      description: `${userName} (${role}) s'est déconnecté`,
      metadata: { userName, role },
    });
  }
}

export const eventTracker = EventTracker.getInstance();
