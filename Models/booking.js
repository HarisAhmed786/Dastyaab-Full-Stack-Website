const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema({
  // Customer info
  customerId:   { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  customerName: { type: String, required: true },

  // Provider info — ref changed from "Provider" to "User" (providers live in User collection)
  providerId:   { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  providerName: { type: String },

  // Service details
  serviceType:   { type: String },
  date:          { type: String, required: true },
  time:          { type: String, required: true },

  // Status tracking
  status: {
    type: String,
    enum: ["Pending", "Accepted", "Rejected", "Completed"],
    default: "Pending"
  },

  // Emergency & Priority booking support
  isEmergency:   { type: Boolean, default: false },
  priorityLevel: { type: String, enum: ["Normal", "High", "Emergency"], default: "Normal" }

}, { timestamps: true });

module.exports = mongoose.model("booking", bookingSchema);