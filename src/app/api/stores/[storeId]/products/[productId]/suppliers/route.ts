import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/stores/[storeId]/products/[productId]/suppliers
// Assign a supplier to a product
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ storeId: string; productId: string }> }
) {
  try {
    const { storeId, productId } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Non authentifié" },
        { status: 401 }
      );
    }

    // Only admins and collaborateurs can assign suppliers
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        collaborateurStores: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Utilisateur non trouvé" },
        { status: 404 }
      );
    }

    const isAdmin = user.role === "ADMIN";
    const hasStoreAccess = user.collaborateurStores.some(
      (cs) => cs.storeId === storeId
    );

    if (!isAdmin && !hasStoreAccess) {
      return NextResponse.json(
        { success: false, error: "Accès refusé" },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { supplierId, priority = 1, isActive = true } = body;

    if (!supplierId) {
      return NextResponse.json(
        { success: false, error: "supplierId requis" },
        { status: 400 }
      );
    }

    // Verify product exists and belongs to store
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product || product.storeId !== storeId) {
      return NextResponse.json(
        { success: false, error: "Produit non trouvé" },
        { status: 404 }
      );
    }

    // Verify supplier exists and is a fournisseur
    const supplier = await prisma.user.findUnique({
      where: { id: supplierId },
      include: {
        fournisseurStores: true,
      },
    });

    if (!supplier || supplier.role !== "FOURNISSEUR") {
      return NextResponse.json(
        { success: false, error: "Fournisseur non trouvé" },
        { status: 404 }
      );
    }

    // Check if supplier has access to this store
    const hasSupplierAccess = supplier.fournisseurStores.some(
      (fs) => fs.storeId === storeId
    );

    if (!hasSupplierAccess) {
      return NextResponse.json(
        {
          success: false,
          error: "Le fournisseur n'a pas accès à ce store",
        },
        { status: 400 }
      );
    }

    // Create or update assignment
    const assignment = await prisma.productSupplier.upsert({
      where: {
        productId_supplierId: {
          productId,
          supplierId,
        },
      },
      create: {
        productId,
        supplierId,
        priority,
        isActive,
      },
      update: {
        priority,
        isActive,
      },
      include: {
        supplier: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    // Log event
    await prisma.event.create({
      data: {
        type: "SUPPLIER_ASSIGNED",
        title: "Fournisseur assigné",
        description: `${supplier.name} assigné au produit ${product.name} (priorité: ${priority})`,
        metadata: {
          productId: product.id,
          productName: product.name,
          supplierId: supplier.id,
          supplierName: supplier.name,
          priority,
        },
        userId: session.user.id,
        storeId,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Fournisseur assigné avec succès",
      assignment,
    });
  } catch (error) {
    console.error("💥 Erreur assignation fournisseur:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Erreur assignation fournisseur",
        message: error instanceof Error ? error.message : "Erreur inconnue",
      },
      { status: 500 }
    );
  }
}

// GET /api/stores/[storeId]/products/[productId]/suppliers
// Get all suppliers assigned to a product
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ storeId: string; productId: string }> }
) {
  try {
    const { productId } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Non authentifié" },
        { status: 401 }
      );
    }

    const suppliers = await prisma.productSupplier.findMany({
      where: { productId },
      include: {
        supplier: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
      orderBy: {
        priority: "asc",
      },
    });

    return NextResponse.json({
      success: true,
      suppliers,
    });
  } catch (error) {
    console.error("💥 Erreur récupération fournisseurs:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Erreur récupération fournisseurs",
        message: error instanceof Error ? error.message : "Erreur inconnue",
      },
      { status: 500 }
    );
  }
}

// DELETE /api/stores/[storeId]/products/[productId]/suppliers?supplierId=xxx
// Remove a supplier from a product
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ storeId: string; productId: string }> }
) {
  try {
    const { storeId, productId } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Non authentifié" },
        { status: 401 }
      );
    }

    // Only admins and collaborateurs can remove suppliers
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        collaborateurStores: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Utilisateur non trouvé" },
        { status: 404 }
      );
    }

    const isAdmin = user.role === "ADMIN";
    const hasStoreAccess = user.collaborateurStores.some(
      (cs) => cs.storeId === storeId
    );

    if (!isAdmin && !hasStoreAccess) {
      return NextResponse.json(
        { success: false, error: "Accès refusé" },
        { status: 403 }
      );
    }

    // Get supplierId from query params
    const searchParams = request.nextUrl.searchParams;
    const supplierId = searchParams.get("supplierId");

    if (!supplierId) {
      return NextResponse.json(
        { success: false, error: "supplierId requis" },
        { status: 400 }
      );
    }

    // Get product and supplier names for event
    const assignment = await prisma.productSupplier.findUnique({
      where: {
        productId_supplierId: {
          productId,
          supplierId,
        },
      },
      include: {
        product: true,
        supplier: true,
      },
    });

    if (!assignment) {
      return NextResponse.json(
        { success: false, error: "Assignation non trouvée" },
        { status: 404 }
      );
    }

    // Delete assignment
    await prisma.productSupplier.delete({
      where: {
        productId_supplierId: {
          productId,
          supplierId,
        },
      },
    });

    // Log event
    await prisma.event.create({
      data: {
        type: "SUPPLIER_REMOVED",
        title: "Fournisseur retiré",
        description: `${assignment.supplier.name} retiré du produit ${assignment.product.name}`,
        metadata: {
          productId: assignment.product.id,
          productName: assignment.product.name,
          supplierId: assignment.supplier.id,
          supplierName: assignment.supplier.name,
        },
        userId: session.user.id,
        storeId,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Fournisseur retiré avec succès",
    });
  } catch (error) {
    console.error("💥 Erreur suppression fournisseur:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Erreur suppression fournisseur",
        message: error instanceof Error ? error.message : "Erreur inconnue",
      },
      { status: 500 }
    );
  }
}
