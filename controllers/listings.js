const Listing = require("../models/listing");
const mbxGeocoding = require("@mapbox/mapbox-sdk/services/geocoding");
const mapToken = process.env.MAP_TOKEN;
const geocodingClient = mbxGeocoding({ accessToken: mapToken });

// Show all listings
module.exports.index = async (req, res) => {
  const allListings = await Listing.find({});
  res.render("listings/index.ejs", { allListings });
};

// Render form to create a new listing
module.exports.renderNewForm = (req, res) => {
  res.render("listings/new.ejs");
};

// Show details for a single listing
module.exports.showListing = async (req, res) => {
  const { id } = req.params;

  const listing = await Listing.findById(id)
    .populate("owner")
    .populate({
      path: "reservations.reservedBy",
      select: "username",
    })
    .populate({
      path: "review",
      populate: { path: "author", select: "username" },
    });

  if (!listing) {
    req.flash("error", "Listing you requested does not exist");
    return res.redirect("/listings");
  }

  res.render("listings/show.ejs", {
    listing,
    currUser: req.user,
    reservedFrom: req.session.tempReservation?.reservedFrom || null,
    reservedTo: req.session.tempReservation?.reservedTo || null,
    mapToken: process.env.MAP_TOKEN,
  });
};

// Create a new listing with geolocation and image
module.exports.createListing = async (req, res, next) => {
  const response = await geocodingClient
    .forwardGeocode({
      query: req.body.listing.location,
      limit: 1,
    })
    .send();

  if (!req.user) {
    req.flash("error", "You must be logged in to create a listing.");
    return res.redirect("/login");
  }

  if (!req.file) {
    req.flash("error", "Image upload failed or image not provided.");
    return res.redirect("/listings/new");
  }

  const newListing = new Listing(req.body.listing);
  newListing.owner = req.user._id;
  newListing.image = {
    url: req.file.path,
    filename: req.file.filename,
  };
  newListing.geometry = response.body.features[0].geometry;

  await newListing.save();

  req.flash("success", "New listing created!");
  res.redirect(`/listings/${newListing._id}`);
};

// Render edit form for a listing
module.exports.renderEditForm = async (req, res) => {
  const { id } = req.params;
  const listing = await Listing.findById(id);

  if (!listing) {
    req.flash("error", "Listing you requested does not exist");
    return res.redirect("/listings");
  }

  res.render("listings/edit.ejs", { listing });
};

// Update an existing listing
module.exports.updateListing = async (req, res) => {
  const { id } = req.params;
  const updatedData = req.body.listing;
  const listing = await Listing.findById(id);

  if (!listing) {
    req.flash("error", "Listing not found.");
    return res.redirect("/listings");
  }

  listing.title = updatedData.title;
  listing.description = updatedData.description;
  listing.price = updatedData.price;
  listing.country = updatedData.country;
  listing.location = updatedData.location;

  // Update geometry if location was changed
  if (listing.isModified("location")) {
    const geoData = await geocodingClient
      .forwardGeocode({
        query: updatedData.location,
        limit: 1,
      })
      .send();

    listing.geometry = geoData.body.features[0].geometry;
  }

  // Update image if a new one is uploaded
  if (req.file) {
    listing.image = {
      url: req.file.path,
      filename: req.file.filename,
    };
  }

  await listing.save();
  req.flash("success", "Listing Updated!");
  res.redirect(`/listings/${id}`);
};

// Delete a listing
module.exports.destroyListing = async (req, res) => {
  const { id } = req.params;
  await Listing.findByIdAndDelete(id);
  req.flash("success", "Listing deleted");
  res.redirect("/listings");
};

// Cancel a reservation made by the current user
module.exports.cancelReservation = async (req, res) => {
  const listing = await Listing.findById(req.params.id);
  if (!listing) {
    req.flash("error", "Listing not found.");
    return res.redirect("/listings");
  }

  const beforeCount = listing.reservations.length;

  listing.reservations = listing.reservations.filter(
    (r) => !r.reservedBy.equals(req.user._id)
  );

  if (listing.reservations.length === beforeCount) {
    req.flash("error", "You can only cancel your own reservation.");
    return res.redirect(`/listings/${listing._id}`);
  }

  await listing.save();
  req.flash("success", "Reservation cancelled.");
  res.redirect(`/listings/${listing._id}`);
};
