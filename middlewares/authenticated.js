import dotenv from "dotenv";

dotenv.config();

// checkign user is authenticated
export const isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ success: false, message: "Unauthorized" });
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
