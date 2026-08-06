const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

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
  reviewCount: { type: Number, default: 0 },

  // Customers can save providers they like (heart icon on search results)
  favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

  // Providers can showcase past work — displayed on their public profile
  portfolio: [{
    url:        { type: String, required: true },
    caption:    { type: String, default: "" },
    uploadedAt: { type: Date, default: Date.now }
  }]

}, { timestamps: true });

// Hash the password automatically whenever it's set/changed, so every
// route (register, admin scripts, etc.) gets this for free instead of
// having to remember to hash manually.
userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Instance method used by the login route to check a plaintext password
// against the stored hash without ever exposing the hash itself.
userSchema.methods.comparePassword = function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model("User", userSchema);