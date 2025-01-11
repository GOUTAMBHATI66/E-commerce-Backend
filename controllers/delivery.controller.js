import axios from "axios";
import prisma from "../prisma/prisma.js";
import { join } from "@prisma/client/runtime/library";

// create the order in the shiprocket
export const createDelivery = async (req, res) => {
  const { id: subOrderId } = req.params;
  const { pickupLocation, packetDimensions } = req.body;

  try {
    // 1. Authenticate Seller
    const seller = await prisma.seller.findUnique({
      where: { id: req.user.id },
    });
    if (!seller || !seller.shipRocketToken) {
      return res.status(404).json({
        success: false,
        message: "Seller not found or seller is not authenticate to shipRocket",
      });
    }

    // 2. Fetch SubOrder and Related Data
    const subOrder = await prisma.subOrder.findUnique({
      where: { id: subOrderId },
      include: {
        parentOrder: {
          include: {
            shippingAddress: true,
            user: true,
          },
        },
        orderItems: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!subOrder || subOrder.sellerId !== seller.id) {
      return res.status(404).json({
        success: false,
        message: "SubOrder not found or access denied",
      });
    }

    if (!subOrder.orderItems.length) {
      return res
        .status(400)
        .json({ success: false, message: "No order items in SubOrder" });
    }

    const shippingAddress = subOrder.parentOrder.shippingAddress;
    const shipmentRequest = {
      order_id: `${seller.name.slice(0, 2).toUpperCase()}-${subOrder.id}-${
        new Date().getHours() +
        new Date().getDate() +
        new Date().getMinutes() +
        new Date().getSeconds()
      }`,
      order_date: new Date().toISOString(),
      pickup_location: pickupLocation || "Primary",
      billing_address: shippingAddress.street,
      billing_customer_name: subOrder.parentOrder.user.name, // TODO:later update name for the shipping user.
      billing_last_name: subOrder.parentOrder.user.name,
      billing_city: shippingAddress.city,
      billing_pincode: parseInt(shippingAddress.postalCode), // Ensure numeric postal code
      billing_email: subOrder.parentOrder.user.email,
      billing_phone: shippingAddress.phoneNumber.slice(2),
      billing_state: shippingAddress.state,
      billing_country: shippingAddress.country,
      shipping_is_billing: true,
      order_items: subOrder.orderItems.map((item) => ({
        name: item.product.name,
        sku: item.product.slug,
        units: item.quantity,
        selling_price: item.price,
      })),
      payment_method: subOrder.paymentMethod === "COD" ? "COD" : "Prepaid",
      sub_total: subOrder.totalAmount,
      length: parseFloat(packetDimensions.length), // Convert to number
      breadth: parseFloat(packetDimensions.breath),
      height: parseFloat(packetDimensions.height),
      weight: parseFloat(packetDimensions.weight) / 1000,
    };
    try {
      const { data: shipmentData } = await axios.post(
        "https://apiv2.shiprocket.in/v1/external/orders/create/adhoc",
        shipmentRequest,
        {
          headers: {
            Authorization: `Bearer ${seller.shipRocketToken}`,
            "Content-Type": "application/json",
          },
        }
      );
      if (!shipmentData) {
        throw new Error("Failed to create delivery with Shiprocket.");
      }

      // 6. Save Delivery Details to Database
      const delivery = await prisma.delivery.create({
        data: {
          subOrderId: subOrder.id,
          sellerId: seller.id,
          deliveryService: "Shiprocket",
          shipmentId: JSON.stringify(shipmentData.shipment_id),
          ship_order_id: JSON.stringify(shipmentData.order_id),
          channelOrderId: shipmentData.channel_order_id,
          deliveryStatus: shipmentData.status, // e.g., "NEW"cls
          estimatedDelivery: null, // Update when Shiprocket provides an estimate
        },
      });

      return res.status(201).json({
        success: true,
        message: "Delivery created successfully",
        delivery,
      });
    } catch (err) {
      console.error("Shiprocket API Error:", err.response?.data || err.message);
      return res.status(500).json({
        success: false,
        message: "Shiprocket API error",
        error: err.response?.data,
      });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Failed to create delivery",
      error: error.message,
    });
  }
};

// fetch picup location of the seller according to shipRocket
export const getPickupLocation = async (req, res) => {
  try {
    const seller = await prisma.seller.findUnique({
      where: { id: req.user.id },
    });

    if (!seller || !seller.shipRocketToken) {
      return res.status(404).json({
        success: false,
        message: "Seller not found or seller is not authenticate to shipRocket",
      });
    }

    const { data: pickupLocations } = await axios.get(
      "https://apiv2.shiprocket.in/v1/external/settings/company/pickup",
      {
        headers: { Authorization: `Bearer ${seller.shipRocketToken}` },
      }
    );
    if (!pickupLocations) {
      return res.status(400).json({
        success: false,
        message: "Pickup location not found in Shiprocket account.",
      });
    }
    return res.status(200).json({
      success: true,
      message: "Pickup location of seller according to shipRocket",
      data: pickupLocations.data.shipping_address,
    });
  } catch (err) {
    console.error("Shiprocket API Error:", err.response?.data || err.message);
    return res.status(500).json({
      success: false,
      message: "Shiprocket API error in getting the pickup location",
      error: err.response?.data,
    });
  }
};

// Delete a delivery and cancel the corresponding Shiprocket order.

export const deleteDelivery = async (req, res) => {
  const { id } = req.params;
  try {
    // 1. Authenticate Seller
    const seller = await prisma.seller.findUnique({
      where: { id: req.user.id },
    });
    if (!seller || !seller.shipRocketToken) {
      return res.status(404).json({
        success: false,
        message: "Seller not found or seller is not authenticate to shipRocket",
      });
    }

    const delivery = await prisma.delivery.findUnique({
      where: { id },
    });

    if (!delivery) {
      return res
        .status(404)
        .json({ success: false, message: "Delivery not found." });
    }

    await prisma.delivery.delete({
      where: { id },
    });

    res.status(200).json({
      message: "Delivery deleted and Shiprocket order canceled successfully.",
      success: true,
    });
  } catch (error) {
    console.error("Error deleting delivery:", error);

    res.status(500).json({
      error: "An error occurred while deleting the delivery.",
      success: false,
    });
  }
};

// webhook for the shiprocket api integration
export const handleShiprocketWebhook = async (req, res) => {
  try {
    // Extract payload from the webhook
    const { shipment_id, status, channel_order_id, estimated_delivery_date } =
      req.body;

    // Validate payload
    if (!shipment_id || !status || !channel_order_id) {
      return res.status(400).json({ error: "Invalid payload" });
    }

    // Map Shiprocket's status to your DeliveryStatus enum
    const deliveryStatusMap = {
      Pending: "PENDING",
      Shipped: "SHIPPED",
      "Out for Delivery": "OUT_FOR_DELIVERY",
      Delivered: "DELIVERED",
    };

    const mappedStatus = deliveryStatusMap[status];
    if (!mappedStatus) {
      return res.status(400).json({ error: `Invalid status: ${status}` });
    }

    // Update the Delivery record
    const updatedDelivery = await prisma.delivery.updateMany({
      where: { shipmentId: shipment_id },
      data: {
        deliveryStatus: mappedStatus,
        estimatedDelivery: estimated_delivery_date
          ? new Date(estimated_delivery_date)
          : null,
      },
    });

    if (updatedDelivery.count === 0) {
      return res.status(404).json({ error: "Delivery not found" });
    }

    // Retrieve the associated SubOrder
    const delivery = await prisma.delivery.findFirst({
      where: { shipmentId: shipment_id },
      include: { subOrder: true },
    });

    if (!delivery) {
      return res.status(404).json({ error: "Delivery not found" });
    }

    // Update SubOrder status
    await prisma.subOrder.update({
      where: { id: delivery.subOrderId },
      data: { deliveryStatus: mappedStatus },
    });

    // Check if all SubOrders of the Order are delivered
    const subOrders = await prisma.subOrder.findMany({
      where: { parentOrderId: delivery.subOrder.parentOrderId },
    });

    const allDelivered = subOrders.every(
      (subOrder) => subOrder.deliveryStatus === "DELIVERED"
    );

    // If all suborders are delivered, update the Order's delivery status
    if (allDelivered) {
      await prisma.order.update({
        where: { id: delivery.subOrder.parentOrderId },
        data: { deliveryStatus: "DELIVERED" },
      });
    }

    // Respond with success
    res.status(200).json({ message: "Delivery status updated successfully" });
  } catch (error) {
    console.error("Error handling Shiprocket webhook:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
