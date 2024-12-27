import dotenv from "dotenv";
import jwt from "jsonwebtoken";
dotenv.config();

// checkign user is authenticated
// export const isAuthenticated = (req, res, next) => {
//   if (req.isAuthenticated()) {
//     return next();
//   }
//   res.status(401).json({ success: false, message: "Unauthorized" });
// };
export const isAuthenticatedAdmin = (req, res, next) => {
  const token = req.cookies.admin;
  if (!token) {
    return res.status(401).json({
      success: false,
      message: "You are not authorized to visit this website",
    });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_ADMIN_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ success: false, message: "Invalid token" });
  }
};
export const isAuthenticatedStore = (req, res, next) => {
  try {
    const token = req.cookies.store;
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "You are not authorized to visit this website",
      });
    }
    const decoded = jwt.verify(token, process.env.JWT_STORE_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ success: false, message: "Invalid token" });
  }
};

// checkign user is seller or not
const adminEmails = process.env.ADMIN_EMAILS
  ? process.env.ADMIN_EMAILS.split(",")
  : [];

export const isSeller = (req, res, next) => {
  if (req.isAuthenticated() && adminEmails.includes(req.user.email)) {
    return next();
  }
  res
    .status(403)
    .json({ success: false, message: "Access denied. Admins only." });
};
