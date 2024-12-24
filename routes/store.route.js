import { Router } from "express";
import {
  getFilterProducts,
  getCollections,
  getNewArrivals,
  getProductDetails,
  getProductsByCategory,
  getFiltersList,
} from "../controllers/store.controller.js";
import {
  getCartProducts,
  getUserProfileDetails,
} from "../controllers/user.controller.js";
import { isAuthenticated } from "../middlewares/authenticated.js";

const router = Router();

router.get("/products", getFilterProducts);
router.get("/collections", getCollections);
router.get("/category", getProductsByCategory);
router.get("/product/:id", getProductDetails);
router.get("/newarrivals", getNewArrivals);
router.get("/filterlist", getFiltersList);
// get the details of user
router.post("/cart", getCartProducts);

// get the user profile details
router.get("/profile/me", isAuthenticated, getUserProfileDetails);

export default router;
