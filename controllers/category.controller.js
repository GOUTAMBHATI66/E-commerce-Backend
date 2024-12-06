import prisma from "../prisma/prisma.js";

export const createCategory = async (req, res) => {
  const { name, description, parentId } = req.body;

  try {
    // Check if parent category exists (if parentId is provided)
    if (parentId) {
      const parentCategory = await prisma.category.findUnique({
        where: { id: parentId },
      });

      if (!parentCategory) {
        return res.status(404).json({
          success: false,
          message: "Parent category not found.",
        });
      }
    }

    // Create the category
    const category = await prisma.category.create({
      data: {
        name,
        description,
        parentId: parentId || null, // Optional parentId
      },
    });

    res.status(201).json({
      success: true,
      message: "Category created successfully.",
      data: category,
    });
  } catch (error) {
    console.error("Error creating category:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while creating the category.",
    });
  }
};

// Update an existing category
export const updateCategory = async (req, res) => {
  const { id } = req.params;
  const { name, description, parentId } = req.body;

  try {
    // Validate if the category exists
    const category = await prisma.category.findUnique({
      where: { id },
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found.",
      });
    }

    // Validate parentId if provided
    if (parentId && parentId !== id) {
      const parentCategory = await prisma.category.findUnique({
        where: { id: parentId },
      });

      if (!parentCategory) {
        return res.status(404).json({
          success: false,
          message: "Parent category not found.",
        });
      }
    }

    // Update the category
    const updatedCategory = await prisma.category.update({
      where: { id },
      data: {
        name,
        description,
        parentId: parentId || null,
      },
    });

    res.status(200).json({
      success: true,
      message: "Category updated successfully.",
      data: updatedCategory,
    });
  } catch (error) {
    console.error("Error updating category:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while updating the category.",
    });
  }
};

export const deleteCategory = async (req, res) => {
  const { id } = req.params;

  try {
    // Validate if the category exists
    const category = await prisma.category.findUnique({
      where: { id },
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found.",
      });
    }
    await prisma.category.delete({
      where: { id },
    });

    res.status(200).json({
      success: true,
      message: "Category and its subcategories deleted successfully.",
    });
  } catch (error) {
    console.error("Error deleting category:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while deleting the category.",
    });
  }
};
export const getAllCategory = async (req, res) => {
  try {
    const category = await prisma.category.findMany();
    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found.",
      });
    }

    res.status(200).json({
      success: true,
      categories: category,
      message: "Category and sub-category",
    });
  } catch (error) {
    console.error("Error getting category:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while getting all  category.",
    });
  }
};
