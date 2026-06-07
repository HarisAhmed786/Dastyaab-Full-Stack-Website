const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  // Core auth fields
  name:     { type: String, required: true },
  email:    { type: String, unique: true, required: true },
  password: { type: String, required: true },

  // Role: customer (default) or provider
  role: {
    type: String,
    enum: ["customer", "provider"],
    default: "customer"
  },

  // Provider-specific fields (filled when role becomes "provider")
  service:    { type: String },
  location:   { type: String },
  experience: { type: Number },
  contact:    { type: String },
  bio:        { type: String },
  price:      { type: Number },
  availability: { type: [String],default: []},
  profilePic: { type: String }, // Base64 string or URL
  isVerified: { type: Boolean, default: false },

  // Calculated from Reviews collection (FR-RR-04)
  avgRating:   { type: Number, default: 0 },
  reviewCount: { type: Number, default: 0 }   

}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);