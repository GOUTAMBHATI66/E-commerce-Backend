import express from "express";
import { createDelivery } from "../controllers/delivery.controller.js";
import prisma from "../prisma/prisma.js";
const router = express.Router();
router.post("/trigger-delivery/:orderId", createDelivery);
router.get("/data", async (req, res) => {
  console.log(req.user.id);
  const order = await prisma.order.findUnique({
    where: { id: "6777b1b888a0730d28284055" },
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
  res.json({ order: order });
});
export default router;
