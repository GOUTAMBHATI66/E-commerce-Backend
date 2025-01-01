import express from "express";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.route.js";
import adminRoutes from "./routes/admin.route.js";
import imagesRoutes from "./routes/imageRoutes.js";
import storeRoutes from "./routes/store.route.js";
import userRoutes from "./routes/user.route.js";
import passport from "./config/passport.js";
import cors from "cors";
import MongoStore from "connect-mongo";
import cookieparser from "cookie-parser";

import { isSeller, isAuthenticatedAdmin } from "./middlewares/authenticated.js";
import { razorpayWebhookHandler } from "./controllers/payment.controller.js";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 4000;

const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  process.env.FRONTEND_URL,
];

app.use(cookieparser());
// cors
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

app.use(express.json({ limit: "50mb" }));

// Passport Middleware
app.use(passport.initialize());

app.get("/", (req, res) => {
  if (req.isAuthenticated()) {
    res.send("<a href='/auth/logout'>Logout</a>" + req.user.name);
  } else {
    res.send("<a href='/auth/google'>Login with google</a> <br>");
  }
});

app.use("/auth", authRoutes);
// admin or seller routes
app.use("/api/admin", isAuthenticatedAdmin, adminRoutes);
app.use("/api/admin/user", isAuthenticatedAdmin, userRoutes);
app.use("/api/image", isAuthenticatedAdmin, imagesRoutes);
// store routes
app.use("/api/store", storeRoutes);
// razorpay verification routes for the webhook
app.post("/verification", razorpayWebhookHandler);

app.listen(PORT, () => {
  console.log("Backend is running on port " + PORT);
});
