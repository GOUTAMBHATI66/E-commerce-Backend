import prisma from "../prisma/prisma.js";

// work for the store users

export const getCartProducts = async (req, res) => {
  try {
    const { items } = req.body;
    // Fetch only the required data
    const products = await Promise.all(
      items.map(async (item) => {
        const product = await prisma.product.findUnique({
          where: { id: item.productId, isPublished: true, isDeleted: false },
          select: {
            id: true,
            name: true,
            slug: true,
            price: true,
            status: true,
            discountPercent: true,
            totalQuantity: true,
            category: {
              select: { name: true },
            },
            variants: {
              where: { id: item.variantId },
              select: {
                id: true,
                color: true,
                images: true,
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
          return null;
        }
        return { ...product, quantity: item.quantity };
      })
    );
    // Filter out null values (e.g., for items where the product was not found)
    const filteredProducts = products.filter(Boolean);

    return res.status(200).json({
      message: "Products data retrieved successfully.",
      success: true,
      data: filteredProducts,
    });
  } catch (error) {
    console.error("Error fetching cart products:", error);
    return res.status(500).json({
      message: "Error fetching the cart products.",
      success: false,
    });
  }
};

// get the orders details of the user

// export const getUserOrders = async (req, res) => {
//   try {
//     const user = await prisma.user.findUnique({
//       where: { id: req.user.id },
//       include: {
//         orders: {
//           include: {
//             SubOrder: {
//               include: {
//                 product: true,
//                 attribute: true,
//                 variant: true,
//               },
//             },
//           },
//           orderBy: {
//             createdAt: "desc",
//           },
//         },
//       },
//     });
//     if (!user) {
//       return res
//         .status(404)
//         .json({ message: "Orders not found", success: false });
//     }

//     res.status(200).json({
//       success: true,
//       message: "order get successful",
//       data: user.orders,
//     });
//   } catch (error) {
//     console.log("Error in getting Orders", error.message);
//     res
//       .status(500)
//       .json({ error: "Server Error " + error.message, success: false });
//   }
// };

export const getUserOrders = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        orders: {
          select: {
            id: true,
            deliveryStatus: true,
            paymentMethod: true,
            razorpayOrderId: true,
            totalAmount: true,
            status: true,
            razorpayPaymentId: true,
            createdAt: true,
            SubOrder: {
              select: {
                id: true,
                orderItems: {
                  select: {
                    id: true,
                    price: true,
                    quantity: true,
                    product: {
                      select: {
                        name: true,
                        price: true,
                        discountPercent: true,
                      },
                    },
                    variant: {
                      select: {
                        id: true,
                        color: true,
                        images: true,
                      },
                    },
                    attribute: {
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
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    if (!user) {
      return res
        .status(404)
        .json({ message: "Orders not found", success: false });
    }

    res.status(200).json({
      success: true,
      message: "Orders retrieved successfully",
      data: user.orders,
    });
  } catch (error) {
    console.log("Error in getting Orders", error.message);
    res
      .status(500)
      .json({ error: "Server Error " + error.message, success: false });
  }
};

export const getUserProfileDetails = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        addresses: true,
      },
    });

    if (!user) {
      return res
        .status(404)
        .json({ message: "User not found", success: false });
    }

    res.status(200).json({
      id: user.id,
      name: user.name,
      email: user.email,
      addresses: user.addresses,
    });
  } catch (error) {
    console.log("Error in getting user", error.message);
    res
      .status(500)
      .json({ error: "Server Error " + error.message, success: false });
  }
};

// create Addressexport
export const upsertUserAddress = async (req, res) => {
  try {
    const { street, city, state, postalCode, country, phoneNumber, id } =
      req.body;
    const userId = req.user.id;
    console.log(req.user, "data of the store user");

    let address;
    if (id) {
      address = await prisma.address.findUnique({
        where: { id },
      });
      if (address) {
        address = await prisma.address.update({
          where: { id },
          data: {
            street,
            city,
            state,
            postalCode,
            country,
            phoneNumber,
          },
        });
      }
      return res.status(201).json({
        message: "Address updated successfully",
        success: true,
        data: address,
      });
    } else {
      if (
        !street ||
        !city ||
        !state ||
        !postalCode ||
        !country ||
        !phoneNumber
      ) {
        return res.status(400).json({
          success: false,
          message:
            "All address fields are required: street, city, state, postalCode, country, and phoneNumber.",
        });
      }
      address = await prisma.address.create({
        data: {
          userId: userId,
          street,
          city,
          state,
          postalCode,
          country,
          phoneNumber,
        },
      });
      return res.status(200).json({
        success: true,
        message: "User delivery address created successfully.",
        data: address,
      });
    }
  } catch (error) {
    console.error("Error creating or updating user address:", error);
    return res.status(500).json({
      success: false,
      message:
        "An error occurred while creating or updating the user delivery address.",
      error: error.message,
    });
  }
};

// delete a user address
export const deleteUserAddress = async (req, res) => {
  try {
    const { id } = req.params;
    // Check if the product exists
    const address = await prisma.address.findUnique({
      where: { id: id },
    });

    if (!address) {
      return res.status(404).json({
        success: false,
        message: "Address not found.",
      });
    }

    await prisma.address.delete({
      where: {
        id: id,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Address deleted successfully.",
    });
  } catch (error) {
    console.error("Error deleting address", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to delete the  address. Please try again later.",
    });
  }
};

// logout user from the page
export const userLogout = (req, res) => {
  try {
    res.clearCookie(
      "store" //TODO: remoe the commend to make a secure cookie
      // {
      // httpOnly: true,
      // secure: process.env.NODE_ENV === "production",
      // sameSite: "None",
      // }
    );

    return res
      .status(200)
      .json({ success: true, message: "Logged out successfully" });
  } catch (error) {
    console.error("Error in logout:", error.message);
    return res
      .status(500)
      .json({ success: false, message: "Server Error: " + error.message });
  }
};
