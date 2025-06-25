const Listing = require("./models/listing");
const Review = require("./models/review");
const ExpressError = require("./utils/ExpressError.js");
const { listingSchema, reviewSchema } = require("./schema.js");

// Checks if user is logged in
module.exports.isLoggedIn = (req, res, next) => {
  if (!req.isAuthenticated()) {
    req.session.redirectUrl = req.originalUrl;
    req.flash("error", "You must be logged in to create a listing!");
    return res.redirect("/login");
  }
  next();
};

// Saves original URL to redirect after login
module.exports.saveRedirectUrl = (req, res, next) => {
  if (req.session.redirectUrl) {
    res.locals.redirectUrl = req.session.redirectUrl;
  }
  next();
};

// Checks if user is owner of the listing
module.exports.isOwner = async (req, res, next) => {
  const { id } = req.params;
  const listing = await Listing.findById(id);

  if (!listing || !listing.owner.equals(res.locals.currUser._id)) {
    req.flash("error", "Only the owner has permission to make changes!");
    return res.redirect(`/listings/${id}`);
  }

  next();
};

// Validates listing
module.exports.validateListing = (req, res, next) => {
  const isEditRoute = req.method === "PUT";

  if (!req.body.listing) {
    req.flash("error", "Form data not submitted correctly.");
    return isEditRoute
      ? res.redirect(`/listings/${req.params.id}/edit`)
      : res.redirect("/listings/new");
  }

  if (!isEditRoute && !req.file) {
    req.flash("error", "Image upload is required.");
    return res.redirect("/listings/new");
  }

  const { error } = listingSchema.validate(req.body);
  if (error) {
    const errMsg = error.details.map((el) => el.message).join(", ");
    throw new ExpressError(400, errMsg);
  }

  next();
};

// Validates review
module.exports.validateReview = (req, res, next) => {
  const { error } = reviewSchema.validate(req.body);
  if (error) {
    const errMsg = error.details.map((el) => el.message).join(", ");
    throw new ExpressError(400, errMsg);
  }
  next();
};

// Checks if user is review author
module.exports.isReviewAuthor = async (req, res, next) => {
  const { id, reviewId } = req.params;
  const review = await Review.findById(reviewId);

  if (!review || !review.author.equals(res.locals.currUser._id)) {
    req.flash("error", "Only the author can modify this review!");
    return res.redirect(`/listings/${id}`);
  }

  next();
};
