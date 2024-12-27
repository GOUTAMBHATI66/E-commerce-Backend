// import { Router } from "express";
// import passport from "passport";

// const router = Router();

// router.get(
//   "/google",
//   passport.authenticate("google", {
//     scope: [
//       "https://www.googleapis.com/auth/userinfo.profile",
//       "https://www.googleapis.com/auth/userinfo.email",
//     ],
//   })
// );
// router.get(
//   "/google/callback",
//   passport.authenticate("google", {
//     successRedirect: "http://localhost:3000/",
//     failureRedirect: "/",
//   })
// );

// export default router;

import { Router } from "express";
import passport from "passport";
import dotenv from "dotenv";
dotenv.config();
const router = Router();

// Seller login route
router.get(
  "/google/seller",
  passport.authenticate("google-seller", {
    scope: [
      "https://www.googleapis.com/auth/userinfo.profile",
      "https://www.googleapis.com/auth/userinfo.email",
    ],
  })
);

// Seller callback
router.get(
  "/google/seller/callback",
  passport.authenticate("google-seller", {
    session: false,
  }),
  (req, res) => {
    const token = req.user.token;
    // res.cookie("admin", token, {
    //   maxAge: 15 * 24 * 60 * 60 * 1000,
    //   httpOnly: true,
    //   secure: process.env.NODE_ENV === "production",
    //   sameSite: "None",
    // });
    res.cookie("admin", token, {
      maxAge: 15 * 24 * 60 * 60 * 1000,
    });
    res.redirect("http://localhost:3000");
  }
);

// User login route
router.get(
  "/google/user",
  passport.authenticate("google-user", {
    scope: [
      "https://www.googleapis.com/auth/userinfo.profile",
      "https://www.googleapis.com/auth/userinfo.email",
    ],
  })
);

// User callback
router.get(
  "/google/user/callback",
  passport.authenticate("google-user", {
    session: false,
  }),

  (req, res) => {
    const token = req.user.token;
    res.cookie("store", token, {
      maxAge: 15 * 24 * 60 * 60 * 1000,
    });
    res.redirect("http://localhost:5173/profile");
  }
);

export default router;
