// import axios from "axios";
// import prisma from "../prisma/prisma.js";

// export const createDelivery = async (req, res) => {
//   const { orderId } = req.params;
//   const { pickupLocation, packetDimensions } = req.body;

//   try {
//     const seller = await prisma.seller.findUnique({
//       where: { id: req.user.id },
//     });

//     if (!seller) {
//       return res
//         .status(404)
//         .json({ success: false, message: "Seller not found" });
//     }

//     const order = await prisma.order.findUnique({
//       where: { id: orderId },
//       include: {
//         orderItems: {
//           where: {
//             product: {
//               sellerId: req.user.id,
//             },
//           },
//           include: {
//             product: true,
//           },
//         },
//         shippingAddress: true,
//       },
//     });

//     if (!order || !order.orderItems.length) {
//       return res
//         .status(404)
//         .json({ success: false, message: "Order or items not found" });
//     }

//     const shipmentRequest = {
//       order_id: order.id,
//       order_date: new Date().toISOString(),
//       pickup_location: pickupLocation || seller.pickupLocation || seller.name, // Use provided pickup location or default
//       billing_customer_name: order.shippingAddress.name,
//       billing_customer_phone: order.shippingAddress.phoneNumber,
//       billing_address: order.shippingAddress.street,
//       billing_city: order.shippingAddress.city,
//       billing_pincode: order.shippingAddress.postalCode,
//       billing_state: order.shippingAddress.state,
//       billing_country: order.shippingAddress.country,
//       shipping_is_billing: true,
//       order_items: order.orderItems.map((item) => ({
//         name: item.product.name,
//         sku: item.product.slug,
//         units: item.quantity,
//         selling_price: item.price,
//       })),
//       payment_method: order.paymentMethod === "COD" ? "COD" : "Prepaid",
//       length: packetDimensions.length,
//       breadth: packetDimensions.breadth,
//       height: packetDimensions.height,
//       weight: packetDimensions.weight,
//     };

//     // Call Shiprocket API to create delivery
//     const { data: shipmentData } = await axios.post(
//       "https://apiv2.shiprocket.in/v1/external/orders/create/adhoc",
//       shipmentRequest,
//       {
//         headers: { Authorization: `Bearer ${seller.authToken}` },
//       }
//     );

//     if (!shipmentData) {
//       throw new Error("Failed to create delivery with Shiprocket.");
//     }

//     // Save delivery details in database
//     await prisma.delivery.create({
//       data: {
//         orderId: order.id,
//         sellerId: seller.id,
//         deliveryService: "Shiprocket",
//         trackingId: shipmentData.tracking_id,
//         deliveryStatus: "SHIPPED",
//         pickupLocation,
//         packetDimensions: JSON.stringify(packetDimensions), // Save dimensions for record
//       },
//     });

//     res.status(200).json({
//       success: true,
//       message: "Delivery created successfully.",
//       trackingId: shipmentData.tracking_id,
//     });
//   } catch (error) {
//     console.error(error.message);
//     res.status(500).json({ success: false, error: error.message });
//   }
// };

import axios from "axios";
import prisma from "../prisma/prisma.js";

export const createDelivery = async (req, res) => {
  const { orderId } = req.params;
  const { pickupLocation, packetDimensions } = req.body;

  try {
    const seller = await prisma.seller.findUnique({
      where: { id: req.user.id },
    });

    if (!seller) {
      return res
        .status(404)
        .json({ success: false, message: "Seller not found" });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        orderItems: {
          where: {
            product: {
              sellerId: req.user.id,
            },
          },
          include: { product: true },
        },
        shippingAddress: true,
      },
    });

    if (!order || !order.orderItems.length) {
      return res
        .status(404)
        .json({ success: false, message: "Order or items not found" });
    }

    // 1. Check Courier Service Availability
    const availabilityCheck = await axios.post(
      "https://apiv2.shiprocket.in/v1/external/courier/serviceability",
      {
        pickup_postcode: seller.pickupPincode,
        delivery_postcode: order.shippingAddress.postalCode,
        weight: packetDimensions.weight,
      },
      {
        headers: { Authorization: `Bearer ${seller.authToken}` },
      }
    );

    if (!availabilityCheck.data.available) {
      return res.status(400).json({
        success: false,
        message: "No courier service available for the provided address.",
      });
    }

    // 2. Create Delivery
    const shipmentRequest = {
      order_id: order.id,
      order_date: new Date().toISOString(),
      pickup_location: pickupLocation || seller.pickupLocation || seller.name,
      billing_customer_name: order.shippingAddress.name,
      billing_customer_phone: order.shippingAddress.phoneNumber,
      billing_address: order.shippingAddress.street,
      billing_city: order.shippingAddress.city,
      billing_pincode: order.shippingAddress.postalCode,
      billing_state: order.shippingAddress.state,
      billing_country: order.shippingAddress.country,
      shipping_is_billing: true,
      order_items: order.orderItems.map((item) => ({
        name: item.product.name,
        sku: item.product.slug,
        units: item.quantity,
        selling_price: item.price,
      })),
      payment_method: order.paymentMethod === "COD" ? "COD" : "Prepaid",
      length: packetDimensions.length,
      breadth: packetDimensions.breadth,
      height: packetDimensions.height,
      weight: packetDimensions.weight,
    };

    const { data: shipmentData } = await axios.post(
      "https://apiv2.shiprocket.in/v1/external/orders/create/adhoc",
      shipmentRequest,
      {
        headers: { Authorization: `Bearer ${seller.authToken}` },
      }
    );

    if (!shipmentData) {
      throw new Error("Failed to create delivery with Shiprocket.");
    }

    // 3. Fetch Label
    const labelResponse = await axios.get(
      `https://apiv2.shiprocket.in/v1/external/courier/generate/label?shipment_id=${shipmentData.shipment_id}`,
      {
        headers: { Authorization: `Bearer ${seller.authToken}` },
      }
    );

    if (!labelResponse.data.label_url) {
      throw new Error("Failed to generate label for the shipment.");
    }

    // 4. Save Delivery Details in Database
    await prisma.delivery.create({
      data: {
        orderId: order.id,
        sellerId: seller.id,
        deliveryService: "Shiprocket",
        trackingId: shipmentData.tracking_id,
        deliveryStatus: "SHIPPED",
        pickupLocation,
        packetDimensions: JSON.stringify(packetDimensions),
        labelUrl: labelResponse.data.label_url, // Save the label URL
      },
    });

    res.status(200).json({
      success: true,
      message: "Delivery created successfully.",
      trackingId: shipmentData.tracking_id,
      labelUrl: labelResponse.data.label_url, // Return label for frontend use
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, error: error.message });
  }
};
