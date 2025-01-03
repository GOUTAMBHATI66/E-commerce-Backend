import axios from "axios";
import prisma from "../prisma/prisma.js";

export const createDelivery = async (req, res) => {
  const { orderId } = req.params;
  const seller = await prisma.seller.findUnique({
    where: {
      id: req.user.id,
    },
  });
  if (!seller) {
    res.status(404).json({ success: false, message: "Seller no found" });
  }
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        orderItems: {
          where: {
            product: {
              sellerId: req.user.id, // get products only for the particular seller
            },
          },
          include: {
            product: true,
          },
        },
        shippingAddress: true,
      },
    });

    if (!order || !order.product.seller) {
      res.status(404).json({ success: false, message: "Order not found" });
    }

    const deliveryPromises = order.orderItems.map(async (item) => {
      const { product, quantity, price } = item;

      // Check if seller has Shiprocket credentials
      if (!seller.shiprocketEmail || !seller.shiprocketPassword) {
        throw new Error(
          `Seller ${seller.name} has not set up Shiprocket credentials.`
        );
      }

      // Authenticate with Shiprocket using seller's credentials
      const { data: tokenData } = await axios.post(
        "https://apiv2.shiprocket.in/v1/external/auth/login",
        {
          email: seller.shiprocketEmail,
          password: seller.shiprocketPassword,
        }
      );
      const authToken = tokenData.token;
      if (!authToken) {
        res.status(401).json({
          message: "Seller's Shiprocket Authentication Failed",
          success: false,
        });
      }
      // Prepare shipment request
      const shipmentRequest = {
        order_id: order.id,
        order_date: new Date().toISOString(),
        pickup_location: seller.name, // Use seller's name as pickup location
        billing_customer_name: order.shippingAddress.street,
        billing_customer_phone: order.shippingAddress.phoneNumber,
        billing_address: order.shippingAddress.street,
        billing_city: order.shippingAddress.city,
        billing_pincode: order.shippingAddress.postalCode,
        billing_state: order.shippingAddress.state,
        billing_country: order.shippingAddress.country,
        shipping_is_billing: true,
        order_items: [
          {
            name: product.name,
            sku: product.slug,
            units: quantity,
            selling_price: price,
          },
        ],
        payment_method: order.paymentMethod === "COD" ? "COD" : "Prepaid",
      };

      // Create shipment with Shiprocket
      const { data: shipmentData } = await axios.post(
        "https://apiv2.shiprocket.in/v1/external/orders/create/adhoc",
        shipmentRequest,
        {
          headers: { Authorization: `Bearer ${authToken}` },
        }
      );
      if (!shipmentData) {
        res.status(405).json({
          success: false,
          message: "Delivery Service is failed to create a delivery.",
        });
      }
      // Save tracking details in the database
      await prisma.delivery.create({
        data: {
          orderItemId: item.id,
          sellerId: seller.id,
          deliveryService: "Shiprocket",
          trackingId: shipmentData.tracking_id,
          deliveryStatus: "SHIPPED",
        },
      });
    });

    await Promise.all(deliveryPromises).catch((err) => {
      res.status(404).json({ message: err.message, success: false });
    });
    res
      .status(200)
      .json({ message: "Delivery triggered successfully for all sellers." });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: error.message });
  }
};
