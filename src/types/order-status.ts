/**
 * Standardized Order Status System
 *
 * This enum defines all possible order statuses in the Natura Beldi system.
 * It replaces the old inconsistent status strings with a clear, standardized set.
 */
export enum OrderStatus {
  // Phase 1: Reception
  /** Order received from Glovo webhook */
  CREATED = "CREATED",

  // Phase 2: Preparation
  /** Order accepted by supplier(s) */
  ACCEPTED = "ACCEPTED",

  /** Order is being prepared by suppliers */
  PREPARING = "PREPARING",

  // Phase 3: Ready
  /** Order is ready for pickup (all baskets collected) */
  READY = "READY",

  // Phase 4: Delivery
  /** Order dispatched/out for delivery */
  DISPATCHED = "DISPATCHED",

  // Phase 5: Finalized
  /** Order delivered to customer */
  DELIVERED = "DELIVERED",

  /** Order cancelled */
  CANCELLED = "CANCELLED",
}

/**
 * Maps internal Natura status to Glovo API status
 * Based on transport type (LOGISTICS_DELIVERY vs VENDOR_DELIVERY)
 */
export function mapToGlovoStatus(
  status: OrderStatus,
  transportType: "LOGISTICS_DELIVERY" | "VENDOR_DELIVERY" = "LOGISTICS_DELIVERY"
): string {
  // For orders where Glovo sends a courier
  if (transportType === "LOGISTICS_DELIVERY") {
    switch (status) {
      case OrderStatus.CREATED:
        return "RECEIVED";
      case OrderStatus.READY:
        return "READY_FOR_PICKUP";
      case OrderStatus.DISPATCHED:
        return "DISPATCHED";
      case OrderStatus.CANCELLED:
        return "CANCELLED";
      default:
        return "RECEIVED"; // Default to RECEIVED for internal statuses
    }
  }

  // For orders where vendor delivers
  else {
    switch (status) {
      case OrderStatus.CREATED:
        return "RECEIVED";
      case OrderStatus.READY:
      case OrderStatus.DISPATCHED:
        return "DISPATCHED";
      case OrderStatus.CANCELLED:
        return "CANCELLED";
      default:
        return "RECEIVED";
    }
  }
}

/**
 * Maps old legacy status to new standardized status
 * Ensures backward compatibility with existing data
 */
export function migrateLegacyStatus(oldStatus: string): OrderStatus {
  const statusUpper = oldStatus.toUpperCase();

  switch (statusUpper) {
    // Map old statuses to new ones
    case "PENDING":
      return OrderStatus.CREATED;

    case "COMPLETED":
      return OrderStatus.DELIVERED;

    case "READY_FOR_PICKUP":
    case "OUT_FOR_DELIVERY":
      return OrderStatus.READY;

    case "PICKED_UP_BY_CUSTOMER":
      return OrderStatus.DELIVERED;

    // Keep existing standardized statuses
    case "CREATED":
      return OrderStatus.CREATED;

    case "ACCEPTED":
      return OrderStatus.ACCEPTED;

    case "PREPARING":
      return OrderStatus.PREPARING;

    case "READY":
      return OrderStatus.READY;

    case "DISPATCHED":
      return OrderStatus.DISPATCHED;

    case "DELIVERED":
      return OrderStatus.DELIVERED;

    case "CANCELLED":
      return OrderStatus.CANCELLED;

    default:
      console.warn(`Unknown legacy status: ${oldStatus}, defaulting to CREATED`);
      return OrderStatus.CREATED;
  }
}

/**
 * Returns a human-readable label for the status (French)
 */
export function getStatusLabel(status: OrderStatus): string {
  switch (status) {
    case OrderStatus.CREATED:
      return "Créée";
    case OrderStatus.ACCEPTED:
      return "Acceptée";
    case OrderStatus.PREPARING:
      return "En préparation";
    case OrderStatus.READY:
      return "Prête";
    case OrderStatus.DISPATCHED:
      return "Expédiée";
    case OrderStatus.DELIVERED:
      return "Livrée";
    case OrderStatus.CANCELLED:
      return "Annulée";
    default:
      return "Inconnue";
  }
}

/**
 * Returns CSS color classes for status badges
 */
export function getStatusColor(status: OrderStatus): string {
  switch (status) {
    case OrderStatus.CREATED:
      return "bg-blue-100 text-blue-800 border-blue-200";
    case OrderStatus.ACCEPTED:
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case OrderStatus.PREPARING:
      return "bg-orange-100 text-orange-800 border-orange-200";
    case OrderStatus.READY:
      return "bg-purple-100 text-purple-800 border-purple-200";
    case OrderStatus.DISPATCHED:
      return "bg-indigo-100 text-indigo-800 border-indigo-200";
    case OrderStatus.DELIVERED:
      return "bg-green-100 text-green-800 border-green-200";
    case OrderStatus.CANCELLED:
      return "bg-red-100 text-red-800 border-red-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
}

/**
 * Check if order status is in a final state (cannot be changed)
 */
export function isFinalStatus(status: OrderStatus): boolean {
  return status === OrderStatus.DELIVERED || status === OrderStatus.CANCELLED;
}

/**
 * Get next possible statuses for an order
 */
export function getNextPossibleStatuses(currentStatus: OrderStatus): OrderStatus[] {
  switch (currentStatus) {
    case OrderStatus.CREATED:
      return [OrderStatus.ACCEPTED, OrderStatus.CANCELLED];

    case OrderStatus.ACCEPTED:
      return [OrderStatus.PREPARING, OrderStatus.CANCELLED];

    case OrderStatus.PREPARING:
      return [OrderStatus.READY, OrderStatus.CANCELLED];

    case OrderStatus.READY:
      return [OrderStatus.DISPATCHED, OrderStatus.CANCELLED];

    case OrderStatus.DISPATCHED:
      return [OrderStatus.DELIVERED, OrderStatus.CANCELLED];

    case OrderStatus.DELIVERED:
    case OrderStatus.CANCELLED:
      return []; // Final statuses, no transitions

    default:
      return [];
  }
}
