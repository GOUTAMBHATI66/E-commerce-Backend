import { Router } from "express";
import passport from "passport";
import { getSellerDetails, logout } from "../controllers/auth.controller.js";

const router = Router();

router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);
router.get(
  "/google/callback",
  passport.authenticate("google", {
    successRedirect: "http://localhost:3000/",
    failureRedirect: "/",
  })
);

router.get("/me", getSellerDetails);
router.post("/logout", logout);
export default router;
