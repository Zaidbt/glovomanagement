import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * AI Agent API - Analytics & Insights
 * Provides business analytics for AI agent decision making
 *
 * Usage: GET /api/ai-agent/analytics?period=7d&storeId=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "7d";
    const storeId = searchParams.get("storeId");
    const includePredictions = searchParams.get("predictions") === "true";

    // Calculate date range
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case "1d":
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case "7d":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "30d":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "90d":
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    // Build store filter
    const storeFilter = storeId ? { storeId } : {};

    // Get orders analytics
    const orders = await prisma.order.findMany({
      where: {
        ...storeFilter,
        createdAt: {
          gte: startDate,
          lte: now,
        },
      },
      include: {
        customer: true,
        store: true,
      },
    });

    // Get customers analytics
    const customers = await prisma.customer.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: now,
        },
      },
    });

    // Get events analytics
    const events = await prisma.event.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: now,
        },
      },
    });

    // Calculate key metrics
    const totalOrders = orders.length;
    const totalRevenue = orders.reduce(
      (sum, order) => sum + (order.estimatedTotalPrice || 0),
      0
    );
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const totalCustomers = customers.length;
    const newCustomers = customers.filter(
      (c) => c.firstOrderDate && new Date(c.firstOrderDate) >= startDate
    ).length;

    // Order status breakdown
    const statusBreakdown = orders.reduce((acc, order) => {
      acc[order.status] = (acc[order.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Customer loyalty distribution
    const loyaltyDistribution = customers.reduce((acc, customer) => {
      acc[customer.loyaltyTier] = (acc[customer.loyaltyTier] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Event type breakdown
    const eventBreakdown = events.reduce((acc, event) => {
      acc[event.type] = (acc[event.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Top products (from order products)
    const productSales: Record<
      string,
      { name: string; quantity: number; revenue: number }
    > = {};
    orders.forEach((order) => {
      if (Array.isArray(order.products)) {
        order.products.forEach((product: any) => {
          const productName = product.name || "Unknown Product";
          if (!productSales[productName]) {
            productSales[productName] = {
              name: productName,
              quantity: 0,
              revenue: 0,
            };
          }
          productSales[productName].quantity += product.quantity || 0;
          productSales[productName].revenue += product.total || 0;
        });
      }
    });

    const topProducts = Object.values(productSales)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // Customer insights
    const activeCustomers = customers.filter((c) => c.isActive).length;
    const highValueCustomers = customers.filter(
      (c) => (c.totalSpent || 0) > 1000
    ).length;
    const atRiskCustomers = customers.filter((c) => {
      if (!c.lastOrderDate) return true;
      const daysSinceLastOrder = Math.floor(
        (Date.now() - new Date(c.lastOrderDate).getTime()) /
          (1000 * 60 * 60 * 24)
      );
      return daysSinceLastOrder > 7;
    }).length;

    // AI-friendly response
    const aiResponse = {
      success: true,
      period: {
        start: startDate,
        end: now,
        days: Math.ceil(
          (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
        ),
      },
      metrics: {
        orders: {
          total: totalOrders,
          revenue: totalRevenue,
          averageValue: Math.round(averageOrderValue),
          statusBreakdown,
        },
        customers: {
          total: totalCustomers,
          new: newCustomers,
          active: activeCustomers,
          highValue: highValueCustomers,
          atRisk: atRiskCustomers,
          loyaltyDistribution,
        },
        events: {
          total: events.length,
          breakdown: eventBreakdown,
        },
      },
      insights: {
        topProducts,
        busiestDay: getBusiestDay(orders),
        peakHour: getPeakHour(orders),
        customerRetention: calculateRetentionRate(customers),
        averageOrderFrequency: calculateOrderFrequency(orders, customers),
      },
      aiContext: {
        businessHealth: assessBusinessHealth(
          totalOrders,
          totalRevenue,
          averageOrderValue
        ),
        customerSatisfaction: assessCustomerSatisfaction(
          statusBreakdown,
          events
        ),
        growthTrends: assessGrowthTrends(orders, customers, period),
        recommendations: generateRecommendations(orders, customers, events),
      },
    };

    // Add predictions if requested
    if (includePredictions) {
      aiResponse.predictions = {
        nextWeekOrders: predictNextWeekOrders(orders),
        customerChurnRisk: predictCustomerChurn(customers),
        revenueForecast: predictRevenue(orders, period),
      };
    }

    return NextResponse.json(aiResponse);
  } catch (error) {
    console.error("AI Agent Analytics Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        message: "Unable to retrieve analytics data",
      },
      { status: 500 }
    );
  }
}

/**
 * Helper functions for analytics
 */
function getBusiestDay(orders: any[]): string {
  const dayCounts: Record<string, number> = {};
  orders.forEach((order) => {
    const day = new Date(order.createdAt).toLocaleDateString("en-US", {
      weekday: "long",
    });
    dayCounts[day] = (dayCounts[day] || 0) + 1;
  });

  return (
    Object.entries(dayCounts).sort(([, a], [, b]) => b - a)[0]?.[0] || "Unknown"
  );
}

function getPeakHour(orders: any[]): number {
  const hourCounts: Record<number, number> = {};
  orders.forEach((order) => {
    const hour = new Date(order.createdAt).getHours();
    hourCounts[hour] = (hourCounts[hour] || 0) + 1;
  });

  return parseInt(
    Object.entries(hourCounts).sort(([, a], [, b]) => b - a)[0]?.[0] || "12"
  );
}

function calculateRetentionRate(customers: any[]): number {
  const repeatCustomers = customers.filter(
    (c) => (c.totalOrders || 0) > 1
  ).length;
  return customers.length > 0 ? (repeatCustomers / customers.length) * 100 : 0;
}

function calculateOrderFrequency(orders: any[], customers: any[]): number {
  return customers.length > 0 ? orders.length / customers.length : 0;
}

function assessBusinessHealth(
  totalOrders: number,
  totalRevenue: number,
  avgOrderValue: number
): string {
  if (totalOrders > 50 && totalRevenue > 10000 && avgOrderValue > 200) {
    return "EXCELLENT";
  } else if (totalOrders > 20 && totalRevenue > 5000 && avgOrderValue > 150) {
    return "GOOD";
  } else if (totalOrders > 10 && totalRevenue > 2000) {
    return "FAIR";
  } else {
    return "NEEDS_IMPROVEMENT";
  }
}

function assessCustomerSatisfaction(
  statusBreakdown: Record<string, number>,
  events: any[]
): string {
  const completedOrders =
    (statusBreakdown.DELIVERED || 0) + (statusBreakdown.COMPLETED || 0);
  const totalOrders = Object.values(statusBreakdown).reduce(
    (sum, count) => sum + count,
    0
  );
  const completionRate =
    totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0;

  if (completionRate > 90) return "EXCELLENT";
  if (completionRate > 80) return "GOOD";
  if (completionRate > 70) return "FAIR";
  return "NEEDS_IMPROVEMENT";
}

function assessGrowthTrends(
  orders: any[],
  customers: any[],
  period: string
): string {
  // Simple trend analysis based on recent activity
  const recentOrders = orders.filter((o) => {
    const daysSince = Math.floor(
      (Date.now() - new Date(o.createdAt).getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysSince <= 3;
  });

  const growthRate = recentOrders.length / Math.max(orders.length, 1);

  if (growthRate > 1.2) return "GROWING";
  if (growthRate > 0.8) return "STABLE";
  return "DECLINING";
}

function generateRecommendations(
  orders: any[],
  customers: any[],
  events: any[]
): string[] {
  const recommendations: string[] = [];

  const atRiskCustomers = customers.filter((c) => {
    if (!c.lastOrderDate) return true;
    const daysSince = Math.floor(
      (Date.now() - new Date(c.lastOrderDate).getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysSince > 7;
  });

  if (atRiskCustomers.length > customers.length * 0.3) {
    recommendations.push(
      "High customer churn risk - implement retention campaign"
    );
  }

  const cancelledOrders = orders.filter((o) => o.status === "CANCELLED").length;
  if (cancelledOrders > orders.length * 0.1) {
    recommendations.push("High cancellation rate - review order process");
  }

  const newCustomers = customers.filter(
    (c) => (c.totalOrders || 0) === 1
  ).length;
  if (newCustomers > customers.length * 0.5) {
    recommendations.push("Many new customers - focus on onboarding experience");
  }

  return recommendations;
}

function predictNextWeekOrders(orders: any[]): number {
  // Simple prediction based on recent trend
  const recentOrders = orders.filter((o) => {
    const daysSince = Math.floor(
      (Date.now() - new Date(o.createdAt).getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysSince <= 7;
  });

  return Math.round(recentOrders.length * 1.1); // 10% growth assumption
}

function predictCustomerChurn(customers: any[]): number {
  const atRisk = customers.filter((c) => {
    if (!c.lastOrderDate) return true;
    const daysSince = Math.floor(
      (Date.now() - new Date(c.lastOrderDate).getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysSince > 14;
  });

  return Math.round((atRisk.length / customers.length) * 100);
}

function predictRevenue(orders: any[], period: string): number {
  const totalRevenue = orders.reduce(
    (sum, order) => sum + (order.estimatedTotalPrice || 0),
    0
  );
  const avgDailyRevenue = totalRevenue / Math.max(orders.length, 1);

  return Math.round(avgDailyRevenue * 7); // Next week prediction
}
