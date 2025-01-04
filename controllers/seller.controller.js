import axios from "axios";
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
    console.log("Received request body:", req.body);

    const { shiprocketEmail, shiprocketPassword } = req.body;
    if (!shiprocketEmail || !shiprocketPassword) {
      return res.status(400).json({
        success: false,
        message: "Shiprocket email and password are required",
      });
    }

    const { data: tokenData } = await axios.post(
      "https://apiv2.shiprocket.in/v1/external/auth/login",
      {
        email: shiprocketEmail,
        password: shiprocketPassword,
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    console.log("Shiprocket API Response:", tokenData);

    if (!tokenData || !tokenData.token) {
      return res.status(404).json({
        success: false,
        message: "Invalid Shiprocket credentials",
      });
    }

    const seller = await prisma.seller.update({
      where: { id: req.user.id },
      data: { ...req.body },
    });

    return res.status(200).json({
      success: true,
      message: "Seller registered successfully",
      data: seller,
    });
  } catch (error) {
    console.error("Error in registerSeller:", error.message);

    if (error.response && error.response.status === 401) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: Invalid Shiprocket credentials",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Server Error: Error in registering seller",
      error: error.message,
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
