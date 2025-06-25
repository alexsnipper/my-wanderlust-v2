const express = require("express");
const router = express.Router();
const wrapAsync = require("../utils/wrapAsync");
const passport = require("passport");
const { saveRedirectUrl } = require("../middleware.js");
const userContorller = require("../controllers/users.js");

// User signup routes
router
  .route("/signup")
  .get(userContorller.rendersignupForm)
  .post(wrapAsync(userContorller.signup));

// User login routes
router
  .route("/login")
  .get(userContorller.renderLoginForm)
  .post(
    saveRedirectUrl,
    passport.authenticate("local", {
      failureRedirect: "/login",
      failureFlash: true,
    }),
    userContorller.login
  );

// Logout route
router.get("/logout", userContorller.logout);

module.exports = router;
