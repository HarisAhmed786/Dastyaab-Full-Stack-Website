const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema({
  // Who wrote the review
  userId:       { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  userName:     { type: String, required: true },

  // Which provider is being reviewed
  providerId:   { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

  // Review content
  rating:       { type: Number, required: true, min: 1, max: 5 },
  comment:      { type: String, required: true, trim: true }

}, { timestamps: true });

// Prevent a user from reviewing the same provider twice
reviewSchema.index({ userId: 1, providerId: 1 }, { unique: true });

module.exports = mongoose.model("Review", reviewSchema);
