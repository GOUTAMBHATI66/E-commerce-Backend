import prisma from "../prisma/prisma.js";
export const getSellerAllOrders = async (req, res) => {
  try {
    const sellerId = req.user.id;
    const { page = 1, size = 10 } = req.query;

    const currentPage = parseInt(page, 10);
    const pageSize = parseInt(size, 10);

    const skip = (currentPage - 1) * pageSize;

    const seller = await prisma.seller.findUnique({
      where: { id: sellerId },
    });

    if (!seller) {
      return res.status(404).json({
        success: false,
        message: "Seller not found",
      });
    }

    const totalOrders = await prisma.orderItem.count({
      where: {
        product: {
          sellerId,
        },
      },
    });

    // Fetch order items for the seller
    const orders = await prisma.orderItem.findMany({
      where: {
        product: {
          sellerId,
        },
      },
      select: {
        id: true,
        order: {
          select: {
            id: true,
            user: {
              select: {
                name: true,
              },
            },
            paymentMethod: true,
            razorpayOrderId: true,
            razorpayPaymentId: true,
            status: true,
            deliveryStatus: true,
            totalAmount: true,
            shippingAddress: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        quantity: true,
        price: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      skip,
      take: pageSize,
    });

    return res.status(200).json({
      success: true,
      message: "Seller orders fetched successfully",
      data: {
        orders,
        pagination: {
          currentPage,
          pageSize,
          totalOrders,
          totalPages: Math.ceil(totalOrders / pageSize),
        },
      },
    });
  } catch (error) {
    console.error("Error fetching seller orders:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching seller orders",
    });
  }
};

// get paritcular order
export const getSellerParticularOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await prisma.order.findUnique({
      where: { id },
      select: {
        user: true,
        shippingAddress: true,
        orderItems: {
          select: {
            product: {
              select: {
                name: true,
                category: true,
              },
            },
            variant: {
              select: {
                color: true,
                images: true,
              },
            },
            attribute: {
              select: {
                size: true,
                stock: true,
                price: true,
              },
            },
            quantity: true,
            price: true,
          },
        },
        createdAt: true,
        updatedAt: true,
        razorpayOrderId: true,
        razorpayPaymentId: true,
        status: true,
        deliveryStatus: true,
        paymentMethod: true,
        totalAmount: true,
        id: true,
      },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "No Order details available .",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Particular Order details found successfully",
      data: order,
    });
  } catch (error) {
    console.error("Error getting particular Order details: ", error);
    return res.status(500).json({
      success: false,
      message: "Error getting particular Order details",
    });
  }
};

export const updateOrderDeliveryStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, paymentMethod } = req.body;
    const order = await prisma.order.findUnique({
      where: {
        id: id,
      },
      include: {
        orderItems: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    const updatedOrder = await prisma.order.update({
      where: {
        id: id,
      },
      data: {
        deliveryStatus: status,
      },
    });

    if (status === "DELIVERED") {
      for (const orderItem of order.orderItems) {
        const { variantId, quantity, attributeId, productId } = orderItem;

        const attribute = await prisma.attribute.findUnique({
          where: {
            id: attributeId,
          },
        });

        if (attribute.stock > 0) {
          const decrementValue = Math.min(attribute.stock, quantity); // Only decrement up to the available stock

          await prisma.attribute.update({
            where: {
              id: attributeId,
              variantId: variantId,
            },
            data: {
              stock: {
                decrement: decrementValue,
              },
            },
          });

          const product = await prisma.product.findUnique({
            where: {
              id: productId,
            },
          });

          if (product.totalQuantity > 0) {
            const productDecrementValue = Math.min(
              product.totalQuantity,
              quantity
            );

            await prisma.product.update({
              where: {
                id: productId,
              },
              data: {
                totalQuantity: {
                  decrement: productDecrementValue,
                },
              },
            });
          }
        } else {
          console.log(
            "Attribute stock is already zero; no decrement performed."
          );
        }
      }
      // update the payment method of the cash on delivery product to completed
      if (paymentMethod === "COD") {
        await prisma.order.update({
          where: {
            id: id,
            paymentMethod: "COD",
          },
          data: {
            status: "COMPLETED",
          },
        });
      }
    }
    return res.status(200).json({
      success: true,
      message: "Order updated successfully",
      data: updatedOrder,
    });
  } catch (error) {
    console.log("Error updating delivery status of orders: ", error);
    return res.status(500).json({
      success: false,
      message: "Error updating delivery status of orders",
    });
  }
};
