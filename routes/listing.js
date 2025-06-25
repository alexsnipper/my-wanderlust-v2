const express = require("express");
const router = express.Router();
const wrapAsync = require("../utils/wrapAsync.js");
const { isLoggedIn, isOwner, validateListing } = require("../middleware.js");
const multer = require("multer");
const { storage } = require("../cloudConfig.js");
const upload = multer({ storage });

const listingController = require("../controllers/listings.js");
const Razorpay = require("razorpay");
const Listing = require("../models/listing.js");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// View listings owned by the current user
router.get(
  "/my-listings",
  isLoggedIn,
  wrapAsync(async (req, res) => {
    const listings = await Listing.find({ owner: req.user._id });
    res.render("listings/myListings", { listings });
  })
);

// View reservations made by the current user
router.get(
  "/my-reservations",
  isLoggedIn,
  wrapAsync(async (req, res) => {
    const listings = await Listing.find({
      "reservations.reservedBy": req.user._id,
    });
    res.render("listings/myReservations", { listings });
  })
);

// Start reservation process
router.post(
  "/:id/reserve",
  isLoggedIn,
  wrapAsync(async (req, res) => {
    const { reservedFrom, reservedTo } = req.body;
    const listing = await Listing.findById(req.params.id);

    if (!reservedFrom || !reservedTo) {
      req.flash("error", "Please select valid dates.");
      return res.redirect(`/listings/${req.params.id}`);
    }

    const newFrom = new Date(reservedFrom);
    const newTo = new Date(reservedTo);

    const isOverlap = listing.reservations.some((res) => {
      return (
        newFrom <= new Date(res.reservedTo) &&
        newTo >= new Date(res.reservedFrom)
      );
    });

    if (isOverlap) {
      req.flash(
        "error",
        "Selected dates are unavailable. Choose different dates."
      );
      return res.redirect(`/listings/${req.params.id}`);
    }

    req.session.reservedFrom = reservedFrom;
    req.session.reservedTo = reservedTo;
    res.redirect(`/listings/${req.params.id}/payment`);
  })
);

// Payment page after date selection
router.get(
  "/:id/payment",
  isLoggedIn,
  wrapAsync(async (req, res) => {
    const listing = await Listing.findById(req.params.id);
    if (!listing) {
      req.flash("error", "Listing not found.");
      return res.redirect("/listings");
    }

    const { reservedFrom, reservedTo } = req.session;
    if (!reservedFrom || !reservedTo) {
      req.flash("error", "Reservation dates missing.");
      return res.redirect(`/listings/${req.params.id}`);
    }

    const fromDate = new Date(reservedFrom);
    const toDate = new Date(reservedTo);
    const days = Math.ceil((toDate - fromDate) / (1000 * 60 * 60 * 24)) || 1;
    const totalPrice = listing.price * days;

    const order = await razorpay.orders.create({
      amount: totalPrice * 100,
      currency: "INR",
      receipt: `order_rcptid_${Date.now()}`,
    });

    res.render("listings/payment", {
      listing,
      order,
      key_id: process.env.RAZORPAY_KEY_ID,
      reservedFrom,
      reservedTo,
      numberOfDays: days,
      totalPrice,
    });
  })
);

// Finalize reservation after successful payment
router.post(
  "/:id/payment-success",
  isLoggedIn,
  wrapAsync(async (req, res) => {
    const listing = await Listing.findById(req.params.id);
    if (!listing) {
      req.flash("error", "Listing not found.");
      return res.redirect("/listings");
    }

    const { reservedFrom, reservedTo } = req.session;
    if (!reservedFrom || !reservedTo) {
      req.flash("error", "Reservation dates missing.");
      return res.redirect(`/listings/${req.params.id}`);
    }

    const newFrom = new Date(reservedFrom);
    const newTo = new Date(reservedTo);

    const isOverlap = listing.reservations.some((res) => {
      return (
        newFrom <= new Date(res.reservedTo) &&
        newTo >= new Date(res.reservedFrom)
      );
    });

    if (isOverlap) {
      req.flash("error", "The selected dates are already reserved.");
      return res.redirect(`/listings/${req.params.id}`);
    }

    listing.reservations.push({
      reservedFrom: newFrom,
      reservedTo: newTo,
      reservedBy: req.user._id,
    });

    await listing.save();
    delete req.session.reservedFrom;
    delete req.session.reservedTo;

    req.flash("success", "Reservation successful!");
    res.redirect(`/listings/${req.params.id}`);
  })
);

// Render refund confirmation page
router.get(
  "/:id/cancel/:reservationId",
  isLoggedIn,
  wrapAsync(async (req, res) => {
    const { id, reservationId } = req.params;
    const listing = await Listing.findById(id).populate(
      "reservations.reservedBy"
    );

    if (!listing) {
      req.flash("error", "Listing not found.");
      return res.redirect("/listings");
    }

    const reservation = listing.reservations.id(reservationId);
    if (!reservation || !reservation.reservedBy.equals(req.user._id)) {
      req.flash("error", "Unauthorized or reservation not found.");
      return res.redirect(`/listings/${id}`);
    }

    res.render("listings/refund", { listing, reservation });
  })
);

// Process refund and remove reservation
router.post(
  "/:id/refund/:reservationId",
  isLoggedIn,
  wrapAsync(async (req, res) => {
    const { id, reservationId } = req.params;
    const listing = await Listing.findById(id);

    if (!listing) {
      req.flash("error", "Listing not found.");
      return res.redirect("/listings");
    }

    const reservation = listing.reservations.id(reservationId);
    if (!reservation || !reservation.reservedBy.equals(req.user._id)) {
      req.flash("error", "Unauthorized or reservation not found.");
      return res.redirect(`/listings/${id}`);
    }

    reservation.deleteOne();
    await listing.save();

    res.render("listings/refundConfirmation", { listing });
  })
);

// -------------------- CRUD Routes --------------------
router.get("/", wrapAsync(listingController.index));
router.get("/new", isLoggedIn, listingController.renderNewForm);
router.post(
  "/",
  isLoggedIn,
  upload.single("image"),
  validateListing,
  wrapAsync(listingController.createListing)
);
router.get("/:id", wrapAsync(listingController.showListing));
router.get(
  "/:id/edit",
  isLoggedIn,
  isOwner,
  wrapAsync(listingController.renderEditForm)
);
router.put(
  "/:id",
  isLoggedIn,
  isOwner,
  upload.single("listing[image]"),
  validateListing,
  wrapAsync(listingController.updateListing)
);
router.delete(
  "/:id",
  isLoggedIn,
  isOwner,
  wrapAsync(listingController.destroyListing)
);

module.exports = router;
