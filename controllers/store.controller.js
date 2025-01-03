import prisma from "../prisma/prisma.js";

// get product details
export const getProductDetails = async (req, res) => {
  try {
    const { id: slug } = req.params;
    const product = await prisma.product.findUnique({
      where: { slug: slug, isPublished: true, isDeleted: false },
      include: {
        category: true,
        seller: { select: { name: true, contact: true } },
        variants: { include: { attributes: true } },
      },
    });

    if (!product || product.isDeleted || !product.isPublished) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found." });
    }

    res.status(200).json({ success: true, data: product });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch product details." });
  }
};

// get the collectinks
export const getDiscountendProducts = async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      where: {
        isDeleted: false,
        isPublished: true,
        discountPercent: { not: null },
      },
      select: {
        id: true,
        name: true,
        discountPercent: true,
        price: true,
        slug: true,
        totalQuantity: true,
        isFeatured: true,
        variants: {
          select: {
            images: true,
          },
          take: 1,
        },
      },
      orderBy: {
        discountPercent: "desc",
      },
      take: 8,
    });

    res.status(200).json({
      success: true,
      data: products,
      message: "Discounted products fetch successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch discounted products.",
    });
  }
};

export const getProductsByCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const category = await prisma.category.findUnique({
      where: { id: categoryId },
      include: { subcategories: true },
    });

    if (!category) {
      return res
        .status(404)
        .json({ success: false, message: "Category not found." });
    }

    const subcategoryIds = category.subcategories.map((sub) => sub.id);

    const products = await prisma.product.findMany({
      where: {
        isDeleted: false,
        isPublished: true,
        OR: [{ categoryId }, { categoryId: { in: subcategoryIds } }],
      },
      skip: (page - 1) * limit,
      take: parseInt(limit),
      include: {
        category: true,
        seller: { select: { name: true } },
      },
    });

    const totalProducts = await prisma.product.count({
      where: {
        isDeleted: false,
        isPublished: true,
        OR: [{ categoryId }, { categoryId: { in: subcategoryIds } }],
      },
    });

    res.status(200).json({
      success: true,
      data: products,
      total: totalProducts,
      pages: Math.ceil(totalProducts / limit),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch products by category.",
    });
  }
};

// get new arrivals products
export const getNewArrivals = async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      where: {
        isDeleted: false,
        isPublished: true,
        createdAt: {
          gte: new Date(new Date().setDate(new Date().getDate() - 30)),
        },
      },
      select: {
        name: true,
        id: true,
        price: true,
        slug: true,
        discountPercent: true,
        category: {
          select: {
            name: true,
          },
        },
        variants: {
          select: {
            images: true,
          },
          take: 1,
        },
      },
      take: 10,
    });
    res.status(200).json({
      success: true,
      message: "Fetch new Arrivals Successfully.",
      data: products,
    });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch new Arrivals." });
  }
};
// get featured products
export const getFeaturedProducts = async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      where: {
        isDeleted: false,
        isPublished: true,
        isFeatured: true,
      },
      select: {
        name: true,
        id: true,
        price: true,
        slug: true,
        discountPercent: true,
        category: {
          select: {
            name: true,
          },
        },
        variants: {
          select: {
            images: true,
          },
          take: 1,
        },
      },
      take: 6,
      orderBy: {
        createdAt: "desc",
      },
    });
    res.status(200).json({
      success: true,
      message: "Fetch new feature products Successfully.",
      data: products,
    });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch featured products." });
  }
};

// filter list to filter products
export const getFiltersList = async (req, res) => {
  try {
    // Run both queries concurrently to optimize the response time.
    const [category, variant] = await Promise.all([
      prisma.category.findMany({
        select: { name: true, id: true },
      }),
      prisma.variant.findMany({
        select: {
          color: true,
          attributes: {
            select: {
              size: true,
            },
          },
        },
      }),
    ]);

    if (!category.length) {
      return res.status(404).json({
        success: false,
        message: "Category not found.",
      });
    }

    if (!variant.length) {
      return res.status(404).json({
        success: false,
        message: "Variants not found.",
      });
    }

    const colors = [...new Set(variant.map((v) => v.color))];

    // const sizes = new Set();
    // variant.forEach((v) => {
    //   v.attributes.forEach((item) => {
    //     sizes.add(item.size.toUpperCase());
    //   });
    // });

    // const sizeArray = [...sizes].sort((a, b) =>
    //   a.toUpperCase().localeCompare(b.toUpperCase())
    // );
    const sizeArray = ["S", "M", "L", "XL", "XXL"];

    res.status(200).json({
      success: true,
      message: "Fetch filter list successfully.",
      data: { category, colors, sizes: sizeArray },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch filter list.",
    });
  }
};

// Filter Product

export const getFilterProducts = async (req, res) => {
  try {
    const {
      category_id,
      size,
      color,
      min_price,
      max_price,
      page = 1,
      limit = 10,
    } = req.query;
    // Construct the filters object
    let filters = {};
    filters.isDeleted = false;
    filters.isPublished = true;

    // Filter by category if provided
    if (category_id) {
      filters.categoryId = category_id;
    }

    // Filter by price range (using the Product model price)
    if (min_price || max_price) {
      filters.price = {
        ...(min_price && { gte: parseFloat(min_price) }),
        ...(max_price && { lte: parseFloat(max_price) }),
      };
    }

    const whereCondition = {
      ...filters,
      variants: {
        some: {
          AND: [
            color ? { color: color } : {},
            // If size is provided, filter by size in attributes within the variant
            size
              ? {
                  attributes: {
                    some: { size: size },
                  },
                }
              : {},
          ],
        },
      },
    };
    // Query the products with relations to variants and category
    const products = await prisma.product.findMany({
      where: whereCondition,
      skip: (page - 1) * limit,
      take: parseInt(limit),
      include: {
        category: {
          select: {
            name: true,
            id: true,
          },
        },
        variants: {
          include: {
            attributes: {
              select: {
                size: true,
                price: true,
                stock: true,
                id: true,
              },
            },
          },
        },
      },
    });

    const modifiedProducts = products.map((product) => {
      const matchingVariant = product.variants.find(
        (variant) => variant.color === color
      );

      // Get the image from the first matching variant, you may adjust this to better match your database structure
      const image = matchingVariant ? matchingVariant.images[0] : null; // Assuming images is an array

      return {
        ...product,
        variants: image,
      };
    });

    // Count the total number of products based on filters
    const totalProducts = await prisma.product.count({
      where: filters,
    });
    // Return the response with products, pagination, and total count
    res.status(200).json({
      success: true,
      data: products,
      total: totalProducts,
      pages: Math.ceil(totalProducts / limit),
      hasNextPage: page < Math.ceil(totalProducts / limit),
    });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch products." });
  }
};

// search product by category name and product name
export const getSearchProduct = async (req, res) => {
  try {
    const { search } = req.query;
    const products = await prisma.product.findMany({
      where: {
        OR: [
          {
            name: {
              contains: search,
              mode: "insensitive",
            },
          },
          {
            category: {
              name: {
                contains: search,
                mode: "insensitive",
              },
            },
          },
        ],
      },
      include: {
        category: true,
        variants: {
          take: 1,
        },
      },
    });
    res.status(200).json({
      success: true,
      message: "Products fetched successfully.",
      data: products,
    });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch products." });
  }
};
