import prisma from "../prisma/prisma.js";

export const getSellerDetails = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await prisma.seller.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json({
      id: user.id,
      name: user.name,
      email: user.email,
    });
  } catch (error) {
    console.log("Error in getting seller", error.message);
    res.status(500).json({
      success: false,
      message: "Not authenticated seller " + error.message,
    });
  }
};

export const logout = (req, res) => {
  try {
    console.log("sdjflsdjf");
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
