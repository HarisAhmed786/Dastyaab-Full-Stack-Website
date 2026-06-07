const express  = require("express");
const router   = express.Router();
const mongoose = require("mongoose");
const path     = require("path");
const fs       = require("fs");

/* ── Import Models ── */
const Message  = require("../Models/message");
const Booking  = require("../Models/booking");

/* ============================================================
   1. GET ALL CONVERSATIONS
   ============================================================ */
router.get("/chat/conversations/:userId", async (req, res) => {
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
   ============================================================ */
router.get("/chat/:bookingId", async (req, res) => {
  const { bookingId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(bookingId)) {
    return res.status(400).json({ error: "Invalid booking ID" });
  }

  try {
    const messages = await Message.find({ bookingId, isDeleted: { $ne: true } }).sort({ createdAt: 1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ============================================================
   3. CHECK CHAT ACCESS
   ============================================================ */
router.get("/chat/access/:bookingId", async (req, res) => {
  const { bookingId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(bookingId)) {
    return res.status(400).json({ error: "Invalid booking ID" });
  }

  try {
    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ error: "Booking not found" });

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
    res.status(500).json({ error: err.message });
  }
});

/* ============================================================
   4. POST IMAGE UPLOAD (FIXED: NO DUPLICATION)
   ============================================================ */
router.post("/chat/upload-image", async (req, res) => {
  try {
    const { base64, filename } = req.body;

    // Check directory
    const uploadDir = path.join(__dirname, "../uploads/chat");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Validation
    const ext = path.extname(filename).toLowerCase();
    if (![".jpg", ".jpeg", ".png"].includes(ext)) {
      return res.status(400).json({ error: "Only JPG and PNG are allowed." });
    }

    // Save File to disk
    const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
    const filePath   = path.join(uploadDir, uniqueName);
    const base64Data = base64.replace(/^data:image\/\w+;base64,/, "");

    fs.writeFileSync(filePath, Buffer.from(base64Data, "base64"));
    const imageUrl = `/uploads/chat/${uniqueName}`;

    // IMPORTANT: We do NOT create a Message record here. 
    // We just return the URL so the frontend can emit it via Socket.
    res.status(201).json({ imageUrl });

  } catch (err) {
    console.error("Upload Error:", err);
    res.status(500).json({ error: "Failed to upload image." });
  }
});

module.exports = router;