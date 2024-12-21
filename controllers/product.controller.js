import prisma from "../prisma/prisma.js";
import cloudinary from "../config/cloudinary.js";
// Utility function to generate a slug
const generateSlug = (name) => {
  return `${name
    .toLowerCase()
    .replace(/ /g, "-")
    .replace(/[^a-z0-9-]/g, "")}-${Date.now()}`;
};

// Create Product Controller
export const createProduct = async (req, res) => {
  try {
    const {
      name,
      description,
      price,
      categoryId,
      discountPercent,
      isFeatured,
      isPublished = true,
    } = req.body;
    // Validate required fields
    if (!name || !price || !categoryId) {
      return res.status(400).json({
        success: false,
        message: "Name, price, and categoryId are required fields.",
      });
    }

    // Check if category exists
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
    });
    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found. Please provide a valid categoryId.",
      });
    }

    // Create a unique slug for the product
    const slug = generateSlug(name);

    // create a product
    const product = await prisma.product.create({
      data: {
        name,
        description: description || null,
        price: parseFloat(price),
        categoryId,
        slug,
        isFeatured,
        discountPercent: parseFloat(discountPercent),
        sellerId: req.user.id,
        isPublished,
      },
    });
    if (!product) {
      console.log(product, "error creating");
    }

    return res.status(201).json({
      success: true,
      message: "Product created successfully.",
      data: product,
    });
  } catch (error) {
    console.error("Error creating product:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while creating the product.",
      error: error.message,
    });
  }
};
// create variants controller
export const createVariant = async (req, res) => {
  try {
    const { variantData, productId } = req.body; // The array of variants and product ID

    // Validate required fields for each variant
    for (const variant of variantData) {
      const { color, images, attributes } = variant;

      if (
        !color ||
        !images ||
        !Array.isArray(attributes) ||
        attributes.length === 0 ||
        !productId
      ) {
        return res.status(400).json({
          success: false,
          message: "Color and attributes are required for all variants.",
        });
      }
    }

    let totalNewStock = 0;
    // Create the variants with their attributes and uploaded images
    const newVariants = await Promise.all(
      variantData.map(async ({ color, images, attributes }) => {
        const variantStock = attributes.reduce(
          (sum, attr) => sum + attr.stock,
          0
        );
        totalNewStock += variantStock;

        // Create the variant with the uploaded image URLs
        const createdVariant = await prisma.variant.create({
          data: {
            color,
            images,
            productId,
            attributes: {
              create: attributes.map((attribute) => ({
                size: attribute.size,
                stock: attribute.stock,
                price: attribute.price,
                sku: attribute.sku,
              })),
            },
          },
        });

        return createdVariant;
      })
    );

    // Update the total quantity of the product
    await prisma.product.update({
      where: { id: productId },
      data: {
        totalQuantity: {
          increment: totalNewStock,
        },
      },
    });

    return res.status(201).json({
      success: true,
      message: "Variants created successfully.",
      data: newVariants, // Send the newly created variants
    });
  } catch (error) {
    console.error("Error creating variant:", error);

    // Handle any unexpected errors
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

// get all products
export const getSellerAllProducts = async (req, res) => {
  try {
    const { id: sellerId } = req.user;
    // Validate seller ID
    if (!sellerId) {
      return res.status(400).json({
        success: false,
        message: "Seller ID is required.",
      });
    }

    // Fetch all products for the seller with basic details
    const products = await prisma.product.findMany({
      where: {
        sellerId,
        isDeleted: false,
      },
      select: {
        id: true,
        name: true,
        price: true,
        isPublished: true,
        discountPercent: true,
        isFeatured: true,
        totalQuantity: true,
        status: true,
        slug: true,
        category: {
          select: {
            name: true,
          },
        },
      },
    });
    if (products.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No products found for the seller.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Products retrieved successfully.",
      data: products,
    });
  } catch (error) {
    console.error("Error fetching seller's products:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while fetching products.",
      error: error.message,
    });
  }
};
// get specific product
export const getSpecificProduct = async (req, res) => {
  try {
    const { id } = req.params;
    // Validate product ID
    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Product ID is required.",
      });
    }

    // Fetch the product with details
    const product = await prisma.product.findUnique({
      where: { slug: id },
      include: {
        category: true,
        variants: {
          include: {
            attributes: true,
          },
        },
        seller: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Check if the product exists
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Product retrieved successfully.",
      data: product,
    });
  } catch (error) {
    console.error("Error fetching product:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while fetching the product.",
      error: error.message,
    });
  }
};

// edit product
export const updateProduct = async (req, res) => {
  const { id } = req.params;
  const {
    name,
    description,
    price,
    categoryId,
    status,
    isPublished,
    isFeatured,
    discountPercent,
  } = req.body;
  try {
    if (!name || !price || !categoryId || !status) {
      return res.status(400).json({
        success: false,
        message: "Name, price, and categoryId are required fields.",
      });
    }
    const existingProduct = await prisma.product.findUnique({
      where: { id },
    });
    if (!existingProduct) {
      return res.status(404).json({
        success: false,
        message: "Product not found.",
      });
    }
    const slug = generateSlug(name);
    const updatedProduct = await prisma.product.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(slug && { slug }),
        ...(description && { description }),
        ...(price !== undefined && { price: parseFloat(price) }),
        ...(discountPercent !== undefined && {
          discountPercent: parseFloat(discountPercent),
        }),
        ...(categoryId && { categoryId }),
        ...(status && { status }),
        ...(typeof isPublished === "boolean" && { isPublished }),
        ...(typeof isFeatured === "boolean" && { isFeatured }),
      },
    });

    return res.status(200).json({
      success: true,
      message: "Product updated successfully.",
      data: updatedProduct,
    });
  } catch (error) {
    console.error("Error updating product:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

export const updateVariant = async (req, res) => {
  try {
    const { variantData, productId } = req.body;
    if (!variantData || !productId) {
      return res.status(400).json({
        success: false,
        message: "Product ID and variant data are required.",
      });
    }

    // Check if the product exists
    const product = await prisma.product.findUnique({
      where: {
        slug: productId,
      },
    });
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found.",
      });
    }
    // delete the product images from the cloudinary server
    for (let variants of variantData) {
      for (let imageToRemove of variants.images) {
        await cloudinary.uploader.destroy(
          imageToRemove.split("/").pop().split(".")[0]
        );
      }
    }
    // Start the update transaction
    await prisma.$transaction(
      async (prisma) => {
        // Delete all existing variants and their attributes
        await prisma.variant.deleteMany({
          where: { productId: product.id },
        });

        // Create new variants with attributes
        const totalQuantity = variantData
          .map((variant) => variant.attributes.map((att) => att.stock))
          .flat()
          .reduce((acc, stock) => acc + stock, 0);

        await prisma.product.update({
          where: { id: product.id },
          data: {
            variants: {
              create: variantData.map((variant) => ({
                color: variant.color,
                images: { set: variant.images },
                attributes: {
                  create: variant.attributes.map((attribute) => ({
                    size: attribute.size,
                    stock: attribute.stock,
                    price: attribute.price,
                  })),
                },
              })),
            },
            totalQuantity,
          },
        });
      },
      { timeout: 15000 }
    );

    return res.status(200).json({
      success: true,
      message: "Product variants and attributes updated successfully.",
    });
  } catch (error) {
    console.error("Error updating product variants:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to update product variants. Please try again later.",
    });
  }
};

export const publishUnpublishProduct = async (req, res) => {
  const { id } = req.params;
  try {
    // Check if the product exists
    const product = await prisma.product.findUnique({
      where: { id: id },
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found.",
      });
    }

    await prisma.product.update({
      where: {
        id: id,
      },
      data: {
        isPublished: product.isPublished ? false : true,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Product is available to sell",
    });
  } catch (error) {
    console.error("Error publishing product", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to publish Product Please try again later.",
    });
  }
};

export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    // Check if the product exists
    const product = await prisma.product.findUnique({
      where: { id: id },
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found.",
      });
    }

    await prisma.product.update({
      where: {
        id: id,
      },
      data: {
        isDeleted: product.isDeleted ? false : true,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Product deleted successfully.",
    });
  } catch (error) {
    console.error("Error publishing product", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to delete the  Product Please try again later.",
    });
  }
};

// get all products
export const getSellerDeletedProducts = async (req, res) => {
  try {
    const { id: sellerId } = req.user;
    // Validate seller ID
    if (!sellerId) {
      return res.status(400).json({
        success: false,
        message: "Seller ID is required.",
      });
    }

    // Fetch all products for the seller with basic details
    const products = await prisma.product.findMany({
      where: {
        sellerId,
        isDeleted: true,
      },
      select: {
        id: true,
        name: true,
      },
    });
    if (products.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No deleted products found for the seller.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Products recycled from trash successfully.",
      data: products,
    });
  } catch (error) {
    console.error("Error fetching seller's deleted products:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while fetching deleting products.",
      error: error.message,
    });
  }
};

// delete product permanently and delete all images uploaded in the cloudinary
export const deleteProductPermanently = async (req, res) => {
  try {
    const { id } = req.params;
    // Check if the product exists
    const product = await prisma.product.findUnique({
      where: { id: id },
      include: {
        variants: true,
      },
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found.",
      });
    }
    // delete product uploaded on the cloudinary
    for (const variants of product.variants) {
      for (const image of variants.images) {
        await cloudinary.uploader.destroy(image.split("/").pop().split(".")[0]);
      }
      await prisma.attribute.deleteMany({
        where: {
          variantId: variants.id,
        },
      });
    }
    await prisma.variant.deleteMany({
      where: {
        productId: id,
      },
    });
    await prisma.product.delete({
      where: {
        id: id,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Product deleted permanently successfully.",
    });
  } catch (error) {
    console.error("Error publishing product", error.message);
    return res.status(500).json({
      success: false,
      message:
        "Failed to delete the  Product permanently ,Please try again later.",
    });
  }
};
