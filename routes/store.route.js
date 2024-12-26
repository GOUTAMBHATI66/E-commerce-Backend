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
  deleteUserAddress,
  getCartProducts,
  getUserOrders,
  getUserProfileDetails,
  upsertUserAddress,
} from "../controllers/user.controller.js";
import { isAuthenticated } from "../middlewares/authenticated.js";
import {
  createOrder,
  deleteOrder,
  verifyPayment,
} from "../controllers/payment.controller.js";

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
router.get("/profile/orders/:id", isAuthenticated, getUserOrders);
router.post("/profile/create/address", isAuthenticated, upsertUserAddress);
router.delete(
  "/profile/address/delete/:id",
  isAuthenticated,
  deleteUserAddress
);
// order routes with authenticated users
router.post("/order/payment", isAuthenticated, createOrder);
router.post("/order/payment/verify", isAuthenticated, verifyPayment);
// ==============delete the order if payment fails
router.delete("/order/payment/delete/:id", isAuthenticated, deleteOrder);

export default router;
