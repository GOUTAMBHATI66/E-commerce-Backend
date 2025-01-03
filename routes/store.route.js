import { Router } from "express";
import {
  getFilterProducts,
  getNewArrivals,
  getProductDetails,
  getProductsByCategory,
  getFiltersList,
  getFeaturedProducts,
  getSearchProduct,
  getDiscountendProducts,
} from "../controllers/store.controller.js";
import {
  deleteUserAddress,
  getCartProducts,
  getUserOrders,
  getUserProfileDetails,
  upsertUserAddress,
  userLogout,
} from "../controllers/user.controller.js";
import { isAuthenticatedStore } from "../middlewares/authenticated.js";
import {
  createOrder,
  deleteOrder,
  verifyPayment,
} from "../controllers/payment.controller.js";

const router = Router();

router.get("/products", getFilterProducts);
router.get("/discountedproducts", getDiscountendProducts);
router.get("/category", getProductsByCategory);
router.get("/product/:id", getProductDetails);
router.get("/newarrivals", getNewArrivals);
router.get("/featuredproducts", getFeaturedProducts);
router.get("/filterlist", getFiltersList);
// search product
router.get("/search", getSearchProduct);
// get the details of user
router.post("/cart", getCartProducts);

// get the user profile details
router.get("/profile/me", isAuthenticatedStore, getUserProfileDetails);
router.post("/profile/logout", isAuthenticatedStore, userLogout);
router.get("/profile/orders/:id", isAuthenticatedStore, getUserOrders);
router.post("/profile/create/address", isAuthenticatedStore, upsertUserAddress);
router.delete(
  "/profile/address/delete/:id",
  isAuthenticatedStore,
  deleteUserAddress
);
// order routes with authenticated users
router.post("/order/payment", isAuthenticatedStore, createOrder);
router.post("/order/payment/verify", isAuthenticatedStore, verifyPayment);
// ==============delete the order if payment fails
router.delete("/order/payment/delete/:id", isAuthenticatedStore, deleteOrder);

export default router;
