const express  = require("express");
const router   = express.Router();
const mongoose = require("mongoose");
const path     = require("path");
const fs       = require("fs");

/* ── Import Models ── */
const Message  = require("../Models/message");
const Booking  = require("../Models/booking");
const { requireAuth, requireSelf } = require("../Middleware/auth");

/* Small helper: confirms the logged-in user is actually a participant
   (customer or provider) on the given booking before letting them read
   or write chat data for it. */
async function assertParticipant(bookingId, userId) {
  if (!mongoose.Types.ObjectId.isValid(bookingId)) {
    const err = new Error("Invalid booking ID");
    err.status = 400;
    throw err;
  }
  const booking = await Booking.findById(bookingId);
  if (!booking) {
    const err = new Error("Booking not found");
    err.status = 404;
    throw err;
  }
  const isParticipant =
    booking.customerId?.toString() === userId ||
    booking.providerId?.toString() === userId;

  if (!isParticipant) {
    const err = new Error("You don't have access to this conversation.");
    err.status = 403;
    throw err;
  }
  return booking;
}

/* ============================================================
   1. GET ALL CONVERSATIONS
   Auth: only that user can see their own inbox.
   ============================================================ */
router.get("/chat/conversations/:userId", requireAuth, requireSelf("userId"), async (req, res) => {
  const { userId } = req.params;
  const { role }   = req.query;

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ error: "Invalid User ID" });
  }

  try {
    const query = (role === "provider") ? { providerId: userId } : { customerId: userId };
    const bookings = await Booking.find(query).sort({ updatedAt: -1 });

    const conversationList = await Promise.all(bookings.map(async (b) => {
      const lastMsg = await Message.findOne({ bookingId: b._id }).sort({ createdAt: -1 });

      const partnerName = (role === "provider") ? b.customerName : (b.providerName || "Provider");
      const partnerRole = (role === "provider") ? "customer" : "provider";

      return {
        bookingId: b._id.toString(),
        partnerName: partnerName,
        partnerRole: partnerRole,
        serviceType: b.serviceType || "General Service",
        lastMessage: lastMsg ? (lastMsg.type === 'image' ? "📷 Photo" : lastMsg.text) : "No messages yet",
        lastMessageAt: lastMsg ? lastMsg.createdAt : b.updatedAt,
        lastMessageType: lastMsg ? lastMsg.type : "text",
        lastStatus: lastMsg ? lastMsg.status : "Sent",
        lastSenderId: lastMsg ? lastMsg.senderId : null,
        unreadCount: 0,
        canChat: b.status !== "Rejected"
      };
    }));

    res.json(conversationList);
  } catch (err) {
    console.error("Inbox Fetch Error:", err);
    res.status(500).json({ error: "Internal server error loading conversations" });
  }
});

/* ============================================================
   2. GET CHAT HISTORY
   Auth: only a participant in this booking can read its messages.
   ============================================================ */
router.get("/chat/:bookingId", requireAuth, async (req, res) => {
  const { bookingId } = req.params;

  try {
    await assertParticipant(bookingId, req.user.id);
    const messages = await Message.find({ bookingId, isDeleted: { $ne: true } }).sort({ createdAt: 1 });
    res.json(messages);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

/* ============================================================
   3. CHECK CHAT ACCESS
   Auth: only a participant in this booking can check access to it.
   ============================================================ */
router.get("/chat/access/:bookingId", requireAuth, async (req, res) => {
  const { bookingId } = req.params;

  try {
    const booking = await assertParticipant(bookingId, req.user.id);

    let canChat = true;
    let reason  = "";

    if (booking.status === "Completed") {
      const hoursSince = (Date.now() - new Date(booking.updatedAt)) / (1000 * 60 * 60);
      if (hoursSince > 48) {
        canChat = false;
        reason  = "Chat is closed (48-hour limit).";
      }
    }

    if (booking.status === "Rejected") {
      canChat = false;
      reason  = "Chat unavailable for rejected bookings.";
    }

    res.json({ canChat, reason, booking });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

/* ============================================================
   4. POST IMAGE UPLOAD
   Auth: must be logged in to upload a chat image.
   ============================================================ */
router.post("/chat/upload-image", requireAuth, async (req, res) => {
  try {
    const { base64, filename } = req.body;

    if (!base64 || !filename) {
      return res.status(400).json({ error: "Missing image data." });
    }

    // Check directory
    const uploadDir = path.join(__dirname, "../uploads/chat");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Validation — extension check (kept from original implementation).
    // NOTE: this only checks the filename extension, not the actual file
    // content/magic bytes. Real content-type validation is tracked in
    // Phase 3 (Backend Hardening).
    const ext = path.extname(filename).toLowerCase();
    if (![".jpg", ".jpeg", ".png"].includes(ext)) {
      return res.status(400).json({ error: "Only JPG and PNG are allowed." });
    }

    // Basic size guard: reject base64 payloads over ~8MB decoded.
    const approxBytes = base64.length * 0.75;
    if (approxBytes > 8 * 1024 * 1024) {
      return res.status(400).json({ error: "Image must be under 8MB." });
    }

    // Save File to disk
    const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
    const filePath   = path.join(uploadDir, uniqueName);
    const base64Data = base64.replace(/^data:image\/\w+;base64,/, "");

    fs.writeFileSync(filePath, Buffer.from(base64Data, "base64"));
    const imageUrl = `/uploads/chat/${uniqueName}`;

    // We do NOT create a Message record here — the frontend emits it via
    // Socket.io once it has this URL back.
    res.status(201).json({ imageUrl });

  } catch (err) {
    console.error("Upload Error:", err);
    res.status(500).json({ error: "Failed to upload image." });
  }
});

module.exports = router;
