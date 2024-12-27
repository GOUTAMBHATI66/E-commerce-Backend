// import passport from "passport";
// import prisma from "../prisma/prisma.js";
// import dotenv from "dotenv";
// import GoogleStrategy from "passport-google-oauth20";
// dotenv.config();

// passport.use(
//   new GoogleStrategy.Strategy(
//     {
//       clientID: process.env.GOOGLE_CLIENT_ID,
//       clientSecret: process.env.GOOGLE_CLIENT_SECRET,
//       callbackURL: "/auth/google/callback",
//     },
//     async (accessToken, refreshToken, profile, done) => {
//       try {
//         let user = await prisma.seller.findUnique({
//           where: { googleId: profile.id },
//         });
//         if (!user) {
//           user = await prisma.seller.create({
//             data: {
//               googleId: profile.id,
//               email: profile.emails[0].value,
//               name: profile.displayName,
//             },
//           });
//         }
//         return done(null, user);
//       } catch (err) {
//         return done(err);
//       }
//     }
//   )
// );

// passport.serializeUser((user, done) => done(null, user.id));
// passport.deserializeUser(async (id, done) => {
//   try {
//     const user = await prisma.seller.findUnique({ where: { id } });
//     done(null, user);
//   } catch (err) {
//     done(err, null);
//   }
// });

// export default passport;

// secondway

// import passport from "passport";
// import prisma from "../prisma/prisma.js";
// import dotenv from "dotenv";
// import { Strategy as GoogleStrategy } from "passport-google-oauth20";

// dotenv.config();

// // Define strategy loader dynamically
// const initializeGoogleStrategy = (role) => {
//   return new GoogleStrategy(
//     {
//       clientID: process.env.GOOGLE_CLIENT_ID,
//       clientSecret: process.env.GOOGLE_CLIENT_SECRET,
//       callbackURL: `/auth/google/${role}/callback`,
//     },
//     async (accessToken, refreshToken, profile, done) => {
//       try {
//         let user;

//         console.log("data of the user profile ", profile);
//         if (role === "seller") {
//           user = await prisma.seller.findUnique({
//             where: { googleId: profile.id },
//           });
//           if (!user) {
//             user = await prisma.seller.create({
//               data: {
//                 googleId: profile.id,
//                 email: profile.emails[0].value,
//                 name: profile.displayName,
//               },
//             });
//           }
//         } else if (role === "user") {
//           user = await prisma.user.findUnique({
//             where: { googleId: profile.id },
//           });
//           if (!user) {
//             user = await prisma.user.create({
//               data: {
//                 googleId: profile.id,
//                 email: profile.emails[0].value,
//                 name: profile.displayName,
//               },
//             });
//           }
//         }

//         return done(null, { ...user, role });
//       } catch (err) {
//         return done(err);
//       }
//     }
//   );
// };

// // Add both strategies
// passport.use("google-seller", initializeGoogleStrategy("seller"));
// passport.use("google-user", initializeGoogleStrategy("user"));

// passport.serializeUser((user, done) =>
//   done(null, { id: user.id, role: user.role })
// );
// passport.deserializeUser(async ({ id, role }, done) => {
//   try {
//     const user =
//       role === "seller"
//         ? await prisma.seller.findUnique({ where: { id } })
//         : await prisma.user.findUnique({ where: { id } });
//     done(null, user);
//   } catch (err) {
//     done(err, null);
//   }
// });

// export default passport;
import passport from "passport";
import prisma from "../prisma/prisma.js";
import dotenv from "dotenv";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import jwt from "jsonwebtoken";

dotenv.config();

// Define strategy loader dynamically
const initializeGoogleStrategy = (role) => {
  return new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: `/auth/google/${role}/callback`,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        let user;
        if (role === "seller") {
          user = await prisma.seller.findUnique({
            where: { googleId: profile.id },
          });
          if (!user) {
            user = await prisma.seller.create({
              data: {
                googleId: profile.id,
                email: profile.emails[0].value,
                name: profile.displayName,
              },
            });
          }
          // Generate JWT
          const payload = { id: user.id, email: user.email };
          const token = jwt.sign(payload, process.env.JWT_ADMIN_SECRET, {
            expiresIn: "7d",
          });
          // Attach token to the user object
          user.token = token;
        } else if (role === "user") {
          user = await prisma.user.findUnique({
            where: { googleId: profile.id },
          });
          if (!user) {
            user = await prisma.user.create({
              data: {
                googleId: profile.id,
                email: profile.emails[0].value,
                name: profile.displayName,
              },
            });
          }
          // Generate JWT
          const payload = { id: user.id, email: user.email };
          const token = jwt.sign(payload, process.env.JWT_STORE_SECRET, {
            expiresIn: "7d",
          });
          // Attach token to the user object the store
          user.token = token;
        }

        return done(null, { ...user, role });
      } catch (err) {
        return done(err);
      }
    }
  );
};

// Add both strategies
passport.use("google-seller", initializeGoogleStrategy("seller"));
passport.use("google-user", initializeGoogleStrategy("user"));

passport.serializeUser((user, done) =>
  done(null, { id: user.id, role: user.role })
);
passport.deserializeUser(async ({ id, role }, done) => {
  try {
    const user =
      role === "seller"
        ? await prisma.seller.findUnique({ where: { id } })
        : await prisma.user.findUnique({ where: { id } });
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

export default passport;
