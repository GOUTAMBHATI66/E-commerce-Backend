import { Router } from "express";
import {
  createCategory,
  deleteCategory,
  getAllCategory,
  updateCategory,
} from "../controllers/category.controller.js";
import {
  createProduct,
  createVariant,
  getSellerAllProducts,
  getSpecificProduct,
  updateVariant,
  updateProduct,
  getSellerDeletedProducts,
  publishUnpublishProduct,
  deleteProduct,
  deleteProductPermanently,
} from "../controllers/product.controller.js";
import deliveryRoutes from "../routes/delivery.routes.js";
import sellerRoutes from "../routes/seller.route.js";
import {
  getSellerAllOrders,
  getSellerParticularOrder,
  updateOrderDeliveryStatus,
} from "../controllers/order.controller.js";
import { getSellerDashboardData } from "../controllers/dashboard.controller.js";

const router = Router();

// category routes
router.get("/categories", getAllCategory);
router.post("/category/create", createCategory);
router.put("/category/update/:id", updateCategory);
router.delete("/category/delete/:id", deleteCategory);
// dashboard routes
router.get("/dashboard", getSellerDashboardData);

// products page routes
router.get("/products", getSellerAllProducts);
router.get("/product/:id", getSpecificProduct);
router.get("/products/trash", getSellerDeletedProducts);
router.post("/product/create", createProduct);
router.post("/product/createvariant", createVariant);
router.post("/product/update/:id", updateProduct);
router.post("/product/update/variant/:id", updateVariant);
router.put("/product/update/publish/:id", publishUnpublishProduct);
router.delete("/product/update/delete/:id", deleteProduct);
router.delete("/product/trash/delete/:id", deleteProductPermanently);

// orders page routes
router.get("/orders", getSellerAllOrders);
router.get("/orders/:id", getSellerParticularOrder);
router.put("/order/update/:id", updateOrderDeliveryStatus);

// delivery routes with the separate files
router.use("/delivery", deliveryRoutes);
// separate seller routes
router.use("/seller", sellerRoutes);

export default router;
