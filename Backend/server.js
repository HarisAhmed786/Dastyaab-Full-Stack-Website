require("dotenv").config();

const express    = require("express");
const mongoose   = require("mongoose");
const cors       = require("cors");
const http       = require("http");
const path       = require("path");
const { Server } = require("socket.io");

const Message = require("./Models/message");

const app    = express();
const server = http.createServer(app);

/* ── CORS — reads allowed origin from .env ── */
const allowedOrigin = process.env.FRONTEND_URL || "*";

const io = new Server(server, {
  cors: {
    origin: allowedOrigin,
    methods: ["GET", "POST"]
  }
});

/* ── Middleware ── */
app.use(cors({ origin: allowedOrigin }));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

/* ── MongoDB — reads URI from .env ── */
mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/dastyaab")
  .then(() => console.log("✅ MongoDB connected"))
  .catch(err => console.log("❌ MongoDB error:", err));

/* ── Health check (Render needs this to confirm service is up) ── */
app.get("/", (req, res) => {
  res.json({ status: "Dastyaab API is running 🚀", version: "2.0.0" });
});

/* ── REST Routes ── */
app.use("/api", require("./Routes/auth"));
app.use("/api", require("./Routes/provider"));
app.use("/api", require("./Routes/chat"));
app.use("/api", require("./Routes/review"));

/* ── Socket.io ── */
const onlineUsers = new Map();

io.on("connection", (socket) => {
  console.log("🔌 New Socket Connected:", socket.id);

  socket.on("user:online", ({ userId, userName }) => {
    if (!userId) return;
    onlineUsers.set(userId, socket.id);
    socket.userId   = userId;
    socket.userName = userName;
    console.log(`👤 User Online: ${userName}`);
  });

  socket.on("chat:join", async ({ bookingId, userId }) => {
    socket.join(bookingId);
    socket.currentRoom = bookingId;

    await Message.updateMany(
      { bookingId, senderId: { $ne: userId }, status: "Sent" },
      { status: "Delivered" }
    );
    socket.to(bookingId).emit("message:delivered", { bookingId });
  });

  socket.on("chat:read", async ({ bookingId, userId }) => {
    await Message.updateMany(
      { bookingId, senderId: { $ne: userId }, status: { $in: ["Sent", "Delivered"] } },
      { status: "Read" }
    );
    socket.to(bookingId).emit("message:read", { bookingId });
  });

  socket.on("message:send", async (data) => {
    const { bookingId, senderId, senderName, senderRole, text, type, imageUrl } = data;

    if (type === "text" && (!text || text.trim().length === 0)) {
      socket.emit("message:error", { error: "Message cannot be empty." });
      return;
    }
    if (text && text.length > 1000) {
      socket.emit("message:error", { error: "Message must be under 1000 characters." });
      return;
    }

    try {
      const message = new Message({
        bookingId, senderId, senderName, senderRole,
        type: type || "text",
        text: text ? text.trim() : "",
        imageUrl: imageUrl || null,
        status: "Sent"
      });
      await message.save();

      io.to(bookingId).emit("message:received", message);

      onlineUsers.forEach((sid, uid) => {
        if (uid !== senderId) {
          const recipientSocket = io.sockets.sockets.get(sid);
          if (recipientSocket && recipientSocket.currentRoom !== bookingId) {
            const preview = type === "image"
              ? "📷 Sent an image"
              : (text.length > 50 ? text.slice(0, 50) + "…" : text);
            io.to(sid).emit("notification:new_message", { bookingId, senderName, preview });
          }
        }
      });
    } catch (err) {
      console.error("❌ Send Error:", err);
      socket.emit("message:error", { error: "Failed to send message." });
    }
  });

  socket.on("chat:typing",      ({ bookingId, senderName }) => socket.to(bookingId).emit("chat:typing", { senderName }));
  socket.on("chat:stop_typing", ({ bookingId })             => socket.to(bookingId).emit("chat:stop_typing"));
  socket.on("chat:leave",       ({ bookingId })             => { socket.leave(bookingId); socket.currentRoom = null; });

  socket.on("disconnect", () => {
    if (socket.userId) {
      console.log(`👋 Offline: ${socket.userName}`);
      onlineUsers.delete(socket.userId);
    }
  });
});

/* ── Start ── */
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});





