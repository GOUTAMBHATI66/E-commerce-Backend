import prisma from "../prisma/prisma.js";

export const getDashboardData = async (req, res) => {
  try {
    // Total products
    const totalProducts = await prisma.product.count();

    // Total orders
    const totalOrders = await prisma.order.count();

    // Total income earned (sum of totalAmount from all completed orders)
    const totalIncome = await prisma.order.aggregate({
      where: { status: "COMPLETED" },
      _sum: {
        totalAmount: true,
      },
    });

    // Products-wise income chart (group by product)
    const productWiseIncome = await prisma.orderItem.groupBy({
      by: ["productId"],
      _sum: {
        price: true,
      },
      _count: {
        productId: true,
      },
      orderBy: {
        _sum: { price: "desc" },
      },
    });

    // Fetch product names for product-wise income chart
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

    // Pie chart data: Payment methods distribution
    const paymentMethodDistribution = await prisma.order.groupBy({
      by: ["paymentMethod"],
      _count: {
        paymentMethod: true,
      },
    });

    // Last 3 days pending orders or those not completed
    const pendingOrders = await prisma.order.findMany({
      where: {
        deliveryStatus: {
          not: "DELIVERED",
        },
        createdAt: {
          gte: new Date(new Date() - 3 * 24 * 60 * 60 * 1000),
        },
      },
      select: {
        id: true,
        status: true,
        deliveryStatus: true,
        createdAt: true,
        totalAmount: true,
        orderItems: {
          select: {
            quantity: true,
            product: {
              select: {
                name: true,
                id: true,
                stock: true,
              },
            },
          },
        },
      },
    });

    // Additional metrics (Optional): Total non-admin users
    const totalUsers = await prisma.user.count({
      where: { isAdmin: false },
    });

    // Response
    return res.status(200).json({
      success: true,
      data: {
        totalProducts,
        totalOrders,
        totalIncome: totalIncome._sum.totalAmount || 0,
        productWiseIncome: productDetails,
        paymentMethodDistribution,
        pendingOrders,
        totalUsers,
      },
    });
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    return res
      .status(500)
      .json({ message: "Error getting dashboard data", success: false });
  }
};
