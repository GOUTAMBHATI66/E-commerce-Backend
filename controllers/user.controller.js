import prisma from "../prisma/prisma.js";

export const getCartProducts = async (req, res) => {
  try {
    const { items } = req.body;

    // Fetch only the required data
    const products = await Promise.all(
      items.map(async (item) => {
        const product = await prisma.product.findUnique({
          where: { id: item.productId },
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
