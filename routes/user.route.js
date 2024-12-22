import { Router } from "express";
import dotenv from "dotenv";
import { getSellerDetails, logout } from "../controllers/auth.controller.js";
const router = Router();
dotenv.config();

router.get("/me", getSellerDetails);
router.post("/logout", logout);

export default router;
