import express from "express";
import {
  createDelivery,
  deleteDelivery,
  getPickupLocation,
} from "../controllers/delivery.controller.js";
const router = express.Router();

router.post("/trigger-delivery/:id", createDelivery);
router.get("/addresses", getPickupLocation);
router.get("/addresses", getPickupLocation);
router.delete("/delete/:id", deleteDelivery);

export default router;
