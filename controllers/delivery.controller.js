import axios from "axios";
import prisma from "../prisma/prisma.js";

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
    // const { data: tokenData } = await axios.post(
    //   "https://apiv2.shiprocket.in/v1/external/auth/login",
    //   {
    //     email: seller.shiprocketEmail,
    //     password: seller.shiprocketPassword,
    //   },
    //   {
    //     headers: {
    //       "Content-Type": "application/json",
    //     },
    //   }
    // );

    // if (!seller) {
    //   return res
    //     .status(404)
    //     .json({ success: false, message: "Seller not found" });
    // }

    // if (!tokenData) {
    //   return res.status(404).json({
    //     success: false,
    //     message: "Shiprocket authorization data is invalid",
    //   });
    // }

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
      order_id: `${seller.name.slice(0, 2).toUpperCase()}-${
        subOrder.id
      }-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}`,
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
      console.log(shipmentData, "data of the shiprocket  ");
      if (!shipmentData) {
        throw new Error("Failed to create delivery with Shiprocket.");
      }

      // 6. Save Delivery Details to Database
      // await prisma.delivery.create({
      //   data: {
      //     orderItemId: subOrder.orderItems[0].id, // Assuming delivery is tracked by first orderItem
      //     sellerId: seller.id,
      //     deliveryService: "Shiprocket",
      //     trackingId: shipmentData.tracking_id,
      //     deliveryStatus: "PENDING",
      //     estimatedDelivery: shipmentData.estimated_delivery_date || null,
      //   },
      // });

      return res.status(201).json({
        success: true,
        message: "Delivery created successfully",
        // trackingId: shipmentData.tracking_id,
        // labelUrl: labelResponse.data.label_url,
      });

      // console.log(shipmentData.data, "data of the peickjslkdfjskldfjlksdjf ");
    } catch (err) {
      console.error("Shiprocket API Error:", err.response?.data || err.message);
      return res.status(500).json({
        success: false,
        message: "Shiprocket API error",
        error: err.response?.data,
      });
    }

    // 5. Generate Shipping Label
    // const labelResponse = await axios.get(
    //   `https://apiv2.shiprocket.in/v1/external/courier/generate/label?shipment_id=${shipmentData.shipment_id}`,
    //   {
    //     headers: { Authorization: `Bearer ${seller.shipRocketToken}` },
    //   }
    // );

    // if (!labelResponse.data.label_url) {
    //   throw new Error("Failed to generate label for the shipment.");
    // }
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
