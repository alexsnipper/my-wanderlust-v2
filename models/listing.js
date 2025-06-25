const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const Review = require("./review.js");

// Listing schema definition
const listingSchema = new Schema({
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    default: "",
  },
  image: {
    url: {
      type: String,
      required: true,
    },
    filename: {
      type: String,
      required: true,
    },
  },
  price: {
    type: Number,
    required: true,
  },
  location: {
    type: String,
    default: "",
  },
  country: {
    type: String,
    default: "",
  },
  category: {
    type: String,
    required: true,
    enum: [
      "Trending",
      "Rooms",
      "Iconic Cities",
      "Castles",
      "Mountain Views",
      "Camping",
      "Amazing Nature",
      "Arctic",
      "Boats",
    ],
  },
  review: [
    {
      type: Schema.Types.ObjectId,
      ref: "Review",
    },
  ],
  reservations: [
    {
      reservedFrom: {
        type: Date,
        required: true,
      },
      reservedTo: {
        type: Date,
        required: true,
      },
      reservedBy: {
        type: Schema.Types.ObjectId,
        ref: "user",
        required: true,
      },
    },
  ],
  owner: {
    type: Schema.Types.ObjectId,
    ref: "user",
    required: true,
  },
  geometry: {
    type: {
      type: String,
      enum: ["Point"],
      required: true,
    },
    coordinates: {
      type: [Number],
      required: true,
    },
  },
});

// Delete associated reviews when a listing is deleted
listingSchema.post("findOneAndDelete", async (listing) => {
  if (listing) {
    await Review.deleteMany({ _id: { $in: listing.review } });
  }
});

const Listing = mongoose.model("Listing", listingSchema);
module.exports = Listing;
