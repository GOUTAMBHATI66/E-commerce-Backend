import { createRazorpayInstance } from "../config/razorpay.config.js";
import prisma from "../prisma/prisma.js";
import crypto from "crypto";
import dotenv from "dotenv";
dotenv.config();

const razorPayInstance = createRazorpayInstance();

// creating order
export const createOrder = async (req, res) => {
  try {
    const { userId, items, paymentMethod, addressId } = req.body;

    // Validate input data
    if (
      !userId ||
      !items ||
      items.length === 0 ||
      !paymentMethod ||
      !addressId
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid order data" });
    }

    // Check if user exists
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // Fetch product, variant, and attribute details
    const products = await Promise.all(
      items.map(async (item) => {
        const product = await prisma.product.findUnique({
          where: { id: item.productId },
          select: {
            id: true,
            name: true,
            price: true,
            discountPercent: true,
            variants: {
              where: { id: item.variantId },
              select: {
                id: true,
                color: true,
                attributes: {
                  where: { id: item.attributeId },
                  select: {
                    id: true,
                    size: true,
                    stock: true,
                    price: true,
                  },
                },
              },
            },
          },
        });

        if (!product) {
          throw new Error(`Product with ID ${item.productId} not found`);
        }

        const variant = product.variants[0];
        if (!variant) {
          throw new Error(`Variant with ID ${item.variantId} not found`);
        }

        const attribute = variant.attributes[0];
        if (!attribute) {
          throw new Error(`Attribute with ID ${item.attributeId} not found`);
        }

        if (attribute.stock < item.quantity) {
          throw new Error(`Insufficient stock for attribute ${attribute.id}`);
        }

        return {
          product,
          variant,
          attribute,
        };
      })
    );
    // Calculate total amount
    let totalAmount = 0;
    products.forEach(({ product, attribute }) => {
      const itemPrice = attribute.price || product.price;
      totalAmount +=
        itemPrice *
        items.find((item) => item.productId === product.id).quantity;
    });

    let razorpayOrderId = null;

    // Process Razorpay order creation for online payments
    if (paymentMethod === "ONLINE") {
      const razorpayOrder = await razorPayInstance.orders.create({
        amount: Math.round(totalAmount * 100),
        currency: "INR",
        receipt: `order_${Date.now()}`,
      });

      if (!razorpayOrder.id) {
        return res.status(500).json({
          success: false,
          message: "Failed to create Razorpay order",
        });
      }

      razorpayOrderId = razorpayOrder.id;
    }

    // Create the order
    const createdOrder = await prisma.order.create({
      data: {
        userId,
        paymentMethod,
        razorpayOrderId,
        totalAmount,
        status: "PENDING",
        deliveryStatus: "PENDING",
        shippingAddressId: addressId,
        orderItems: {
          create: items.map((item) => {
            const { product, attribute } = products.find(
              (p) => p.product.id === item.productId
            );
            return {
              productId: product.id,
              variantId: product.variants[0].id,
              attributeId: attribute.id,
              quantity: item.quantity,
              price: attribute.price || product.price,
            };
          }),
        },
      },
    });

    return res.status(201).json({
      success: true,
      message: "Order created successfully!",
      order: createdOrder,
    });
  } catch (error) {
    console.error("Error creating order:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to create order." });
  }
};

// verify the payment
export const verifyPayment = async (req, res) => {
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    orderId,
  } = req.body;

  const sha = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET);
  sha.update(`${razorpay_order_id}|${razorpay_payment_id}`);
  const digest = sha.digest("hex");
  let order;

  if (digest !== razorpay_signature) {
    order = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: "CANCELLED",
      },
    });

    return res
      .status(400)
      .json({ message: "Payment Cancelled", success: false });
  }

  // apply the order
  order = await prisma.order.update({
    where: { id: orderId },
    data: {
      status: "COMPLETED",
      razorpayPaymentId: razorpay_payment_id,
    },
  });

  res.status(200).json({
    message: "Payment Successful",
    success: true,
    orderId: razorpay_order_id,
    paymentId: razorpay_payment_id,
  });
};

// delete the online order if payment fails
export const deleteOrder = async (req, res) => {
  try {
    const { id: orderId } = req.params;
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order || order.paymentMethod !== "ONLINE") {
      return res.status(404).json({
        message: "Order not found or invalid order type",
        success: false,
      });
    }

    await prisma.order.delete({
      where: { id: orderId },
    });

    res.status(200).json({
      message: "Order cancelled successfully!!",
      success: true,
    });
  } catch (error) {
    console.error("Error while deleting order:", error);
    res.status(500).json({
      message: "Error while deleting order",
      success: false,
    });
  }
};

// ----------------work in optional web hook
export const razorpayWebhookHandler = async (req, res) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

  // Verify the webhook signature
  const signature = req.headers["x-razorpay-signature"];
  const body = JSON.stringify(req.body);

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("hex");

  if (signature !== expectedSignature) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid signature" });
  }

  const event = req.body.event;
  const payload = req.body.payload;
  try {
    let order;

    // Handle payment events
    switch (event) {
      case "payment.captured":
        if (payload.payment.entity.id) {
          order = await prisma.order.findFirst({
            where: {
              razorpayOrderId: payload.payment.order_id,
              paymentMethod: "ONLINE",
            },
          });

          if (order) {
            await prisma.order.update({
              where: { id: order.id },
              data: {
                status: "COMPLETED",
                razorpayPaymentId: payload.payment.entity.id,
              },
            });
          }
        }
        break;
      case "order.paid":
        if (payload.payment.entity.id) {
          order = await prisma.order.findFirst({
            where: {
              razorpayOrderId: payload.payment.entity.order_id,
              paymentMethod: "ONLINE",
            },
          });

          if (order) {
            await prisma.order.update({
              where: { id: order.id },
              data: {
                status: "COMPLETED",
                razorpayPaymentId: payload.payment.entity.id,
              },
            });
          }
          console.log(
            "Payment completed and order marked with status as completed."
          );
        }
        break;

      case "payment.failed":
        if (payload.payment.entity.order_id) {
          order = await prisma.order.findFirst({
            where: {
              razorpayOrderId: payload.payment.entity.order_id,
            },
          });
          if (order) {
            await prisma.order.update({
              where: { id: order.id },
              data: { status: "CANCELLED" },
            });
            console.log("Payment failed and order marked as cancelled.");
          }
        }
        break;

      default:
        console.log(`Unhandled event: ${event}`);
    }

    res.status(200).json({ success: true, status: "ok" });
  } catch (error) {
    console.error("Error handling Razorpay webhook:", error);
    res
      .status(500)
      .json({ success: false, message: "Webhook handling failed" });
  }
};