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
    failureRedirect: "/login", // Redirect to failure page
  }),
  (req, res) => {
    res.redirect("http://localhost:3000/admin"); // Redirect seller to admin panel
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
    failureRedirect: "/login", // Redirect to failure page
  }),
  (req, res) => {
    res.redirect("http://localhost:3000/store"); // Redirect user to store
  }
);

export default router;
