import { Router } from "express";
import dotenv from "dotenv";
import { getSellerDetails, logout } from "../controllers/seller.controller.js";
import { registerSeller } from "../controllers/seller.controller.js";
const router = Router();
dotenv.config();

router.get("/me", getSellerDetails);
router.put("/register", registerSeller);
router.post("/logout", logout);

export default router;
