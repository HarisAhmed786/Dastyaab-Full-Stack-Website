const mongoose = require("mongoose");

/* ============================================================
   Message Schema
   Each document = one chat message.
   Grouped by bookingId (each booking has its own chat room).
   Retained for minimum 6 months per FR-RC-06.
   ============================================================ */
const messageSchema = new mongoose.Schema({

  /* Which booking this chat belongs to */
  bookingId:  { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: true },

  /* Sender info */
  senderId:   { type: mongoose.Schema.Types.ObjectId, ref: "User",    required: true },
  senderName: { type: String, required: true },
  senderRole: { type: String, enum: ["customer", "provider"], required: true },

  /* Message content — text or image (FR-RC-03, FR-RC-04) */
  type:       { type: String, enum: ["text", "image"], default: "text" },
  text:       { type: String, maxlength: 1000 },   /* FR-RC-03: 1000 char limit */
  imageUrl:   { type: String },                    /* FR-RC-04: image path */

  /* Delivery status — Sent → Delivered → Read (FR-RC-05) */
  status: {
    type: String,
    enum: ["Sent", "Delivered", "Read"],
    default: "Sent"
  },

  /* Soft-delete flag — keeps message in DB but hides from UI */
  isDeleted:  { type: Boolean, default: false }

}, { timestamps: true });

/* Index for fast lookup by booking room */
messageSchema.index({ bookingId: 1, createdAt: 1 });

/* Auto-expire messages after 6 months (180 days) per FR-RC-06 */
messageSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 180 });

module.exports = mongoose.model("Message", messageSchema);