import express from "express";
import session from "express-session";
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

import { isSeller, isAuthenticated } from "./middlewares/authenticated.js";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 4000;

app.use(express.json({ limit: "50mb" })); // 50 MB limit for JSON requests
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
// Session Middleware
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.DATABASE_URL,
    }),
    cookie: {
      maxAge: 1000 * 60 * 60 * 48,
    },
  })
);

// Passport Middleware
app.use(passport.initialize());
app.use(passport.session());

app.get("/", (req, res) => {
  if (req.isAuthenticated()) {
    res.send("<a href='/auth/logout'>Logout</a>" + req.user.name);
  } else {
    res.send("<a href='/auth/google'>Login with google</a> <br>");
  }
});

app.use("/auth", authRoutes);
// admin or seller routes
app.use("/api/admin", isAuthenticated, adminRoutes);
app.use("/api/admin/user", isAuthenticated, userRoutes);
app.use("/api/image", isAuthenticated, imagesRoutes);
// store routes
app.use("/api/store", storeRoutes);

app.listen(PORT, () => {
  console.log("Backend is running on port " + PORT);
});
