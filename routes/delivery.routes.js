import express from "express";
import {
  createDelivery,
  getPickupLocation,
} from "../controllers/delivery.controller.js";
const router = express.Router();

router.post("/trigger-delivery/:id", createDelivery);
router.get("/addresses", getPickupLocation);

export default router;
