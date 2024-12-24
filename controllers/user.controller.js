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

export const getUserProfileDetails = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      return res
        .status(404)
        .json({ message: "User not found", success: false });
    }

    res.status(200).json({
      id: user.id,
      name: user.name,
      email: user.email,
    });
  } catch (error) {
    console.log("Error in getting user", error.message);
    res
      .status(500)
      .json({ error: "Server Error " + error.message, success: false });
  }
};
