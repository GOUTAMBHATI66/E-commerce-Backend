// import axios from "axios";
// import prisma from "../prisma/prisma.js";

// export const createDelivery = async (req, res) => {
//   const { orderId } = req.params;
//   const seller = await prisma.seller.findUnique({
//     where: {
//       id: req.user.id,
//     },
//   });
//   if (!seller) {
//     res.status(404).json({ success: false, message: "Seller no found" });
//   }
//   try {
//     const order = await prisma.order.findUnique({
//       where: { id: orderId },
//       include: {
//         orderItems: {
//           where: {
//             product: {
//               sellerId: req.user.id, // get products only for the particular seller
//             },
//           },
//           include: {
//             product: true,
//           },
//         },
//         shippingAddress: true,
//       },
//     });
//     console.log("order detalist", order);

//     if (!order || !order.product.seller) {
//       res.status(404).json({ success: false, message: "Order not found" });
//     }

//     const deliveryPromises = order.orderItems.map(async (item) => {
//       const { product, quantity, price } = item;

//       // // Check if seller has Shiprocket credentials
//       // if (!seller.shiprocketEmail || !seller.shiprocketPassword) {
//       //   throw new Error(
//       //     `Seller ${seller.name} has not set up Shiprocket credentials.`
//       //   );
//       // }

//       // // Authenticate with Shiprocket using seller's credentials
//       // const { data: tokenData } = await axios.post(
//       //   "https://apiv2.shiprocket.in/v1/external/auth/login",
//       //   {
//       //     email: seller.shiprocketEmail,
//       //     password: seller.shiprocketPassword,
//       //   }
//       // );
//       // const authToken = tokenData.token;
//       // if (!authToken) {
//       //   res.status(401).json({
//       //     message: "Seller's Shiprocket Authentication Failed",
//       //     success: false,
//       //   });
//       // }
//       // Prepare shipment request
//       const shipmentRequest = {
//         order_id: order.id,
//         order_date: new Date().toISOString(),
//         pickup_location: seller.name, // Use seller's name as pickup location
//         billing_customer_name: order.shippingAddress.street,
//         billing_customer_phone: order.shippingAddress.phoneNumber,
//         billing_address: order.shippingAddress.street,
//         billing_city: order.shippingAddress.city,
//         billing_pincode: order.shippingAddress.postalCode,
//         billing_state: order.shippingAddress.state,
//         billing_country: order.shippingAddress.country,
//         shipping_is_billing: true,
//         order_items: [
//           {
//             name: product.name,
//             sku: product.slug,
//             units: quantity,
//             selling_price: price,
//           },
//         ],
//         payment_method: order.paymentMethod === "COD" ? "COD" : "Prepaid",
//       };

//       // Create shipment with Shiprocket
//       const { data: shipmentData } = await axios.post(
//         "https://apiv2.shiprocket.in/v1/external/orders/create/adhoc",
//         shipmentRequest,
//         {
//           headers: { Authorization: `Bearer ${authToken}` },
//         }
//       );
//       if (!shipmentData) {
//         res.status(405).json({
//           success: false,
//           message: "Delivery Service is failed to create a delivery.",
//         });
//       }
//       // Save tracking details in the database
//       await prisma.delivery.create({
//         data: {
//           orderItemId: item.id,
//           sellerId: seller.id,
//           deliveryService: "Shiprocket",
//           trackingId: shipmentData.tracking_id,
//           deliveryStatus: "SHIPPED",
//         },
//       });
//     });

//     await Promise.all(deliveryPromises).catch((err) => {
//       res.status(404).json({ message: err.message, success: false });
//     });
//     res
//       .status(200)
//       .json({ message: "Delivery triggered successfully for all sellers." });
//   } catch (error) {
//     console.error(error.message);
//     res.status(500).json({ error: error.message });
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
          include: {
            product: true,
          },
        },
        shippingAddress: true,
      },
    });

    if (!order || !order.orderItems.length) {
      return res
        .status(404)
        .json({ success: false, message: "Order or items not found" });
    }

    const shipmentRequest = {
      order_id: order.id,
      order_date: new Date().toISOString(),
      pickup_location: pickupLocation || seller.pickupLocation || seller.name, // Use provided pickup location or default
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

    // Call Shiprocket API to create delivery
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

    // Save delivery details in database
    await prisma.delivery.create({
      data: {
        orderId: order.id,
        sellerId: seller.id,
        deliveryService: "Shiprocket",
        trackingId: shipmentData.tracking_id,
        deliveryStatus: "SHIPPED",
        pickupLocation,
        packetDimensions: JSON.stringify(packetDimensions), // Save dimensions for record
      },
    });

    res.status(200).json({
      success: true,
      message: "Delivery created successfully.",
      trackingId: shipmentData.tracking_id,
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, error: error.message });
  }
};
