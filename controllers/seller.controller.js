import prisma from "../prisma/prisma.js";

export const getSellerDetails = async (req, res) => {
  try {
    const userId = req.user.id;
    const seller = await prisma.seller.findUnique({ where: { id: userId } });
    if (!seller) {
      return res.status(404).json({ message: "Seller not found" });
    }
    res.status(200).json(seller);
  } catch (error) {
    console.log("Error in getting seller", error.message);
    res.status(500).json({
      success: false,
      message: "Not authenticated seller " + error.message,
    });
  }
};

export const registerSeller = async (req, res) => {
  try {
    console.log(req.body);
    const seller = await prisma.seller.update({
      where: {
        id: req.user.id,
      },
      data: {
        ...req.body,
      },
    });
    console.log("updateed seller", seller);
    return res.status(200).json({
      success: true,
      message: "Seller registered successfully",
      data: seller,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server Error: Error in registering seller ",
    });
  }
};
export const logout = (req, res) => {
  try {
    res.clearCookie(
      "admin"
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
