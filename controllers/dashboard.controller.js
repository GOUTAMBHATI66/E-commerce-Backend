import prisma from "../prisma/prisma.js";

export const getSellerDashboardData = async (req, res) => {
  try {
    const sellerId = req.user.id; // Assuming seller's ID is available in req.user

    // Fetch total products created by the seller
    const totalProducts = await prisma.product.count({
      where: { sellerId },
    });

    // Fetch total orders associated with the seller's products
    const totalOrders = await prisma.orderItem.count({
      where: {
        product: { sellerId },
      },
    });

    // Fetch total income earned from completed orders
    const totalIncome = await prisma.order.aggregate({
      where: {
        status: "COMPLETED",
        orderItems: {
          some: {
            product: { sellerId },
          },
        },
      },
      _sum: { totalAmount: true },
    });

    // Fetch order statistics (pending, shipped, delivered)
    const orderStats = await prisma.order.groupBy({
      by: ["deliveryStatus"],
      where: {
        orderItems: {
          some: {
            product: { sellerId },
          },
        },
      },
      _count: { deliveryStatus: true },
    });

    // Fetch payment method distribution for the seller's orders
    const paymentMethodStats = await prisma.order.groupBy({
      by: ["paymentMethod"],
      where: {
        orderItems: {
          some: {
            product: { sellerId },
          },
        },
      },
      _count: { paymentMethod: true },
    });

    // Fetch income breakdown by product
    const productWiseIncome = await prisma.orderItem.groupBy({
      by: ["productId"],
      where: {
        product: { sellerId },
      },
      _sum: { price: true },
      _count: { productId: true },
      orderBy: { _sum: { price: "desc" } },
    });

    // Fetch product names for product-wise income
    const productDetails = await Promise.all(
      productWiseIncome.map(async (item) => {
        const product = await prisma.product.findUnique({
          where: { id: item.productId },
          select: { name: true },
        });
        return {
          ...item,
          productName: product?.name || "Unknown",
        };
      })
    );

    // Fetch recent pending orders (last 7 days)
    const recentPendingOrders = await prisma.order.findMany({
      where: {
        deliveryStatus: { not: "DELIVERED" },
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        orderItems: {
          some: {
            product: { sellerId },
          },
        },
      },
      select: {
        id: true,
        totalAmount: true,
        status: true,
        deliveryStatus: true,
        createdAt: true,
        orderItems: {
          select: {
            quantity: true,
            product: {
              select: {
                id: true,
                name: true,
                totalQuantity: true,
              },
            },
          },
        },
      },
    });

    // Prepare and send the response
    return res.status(200).json({
      success: true,
      data: {
        totalProducts,
        totalOrders,
        totalIncome: totalIncome._sum.totalAmount || 0,
        orderStats,
        paymentMethodStats,
        productWiseIncome: productDetails,
        recentPendingOrders,
      },
    });
  } catch (error) {
    console.error("Error fetching seller dashboard data:", error);
    return res
      .status(500)
      .json({ message: "Error getting dashboard data", success: false });
  }
};
