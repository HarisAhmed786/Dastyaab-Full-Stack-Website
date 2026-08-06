require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");

const app = express();

/* ── CORS ── */
const allowedOrigin = process.env.FRONTEND_URL || "*";

/* ── Middleware ── */
app.use(cors({ origin: allowedOrigin }));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

/* ── MongoDB Connection (Optimized for Serverless) ── */
let isConnected = false;

const connectDB = async () => {
  if (isConnected) return;
  try {
    const db = await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    isConnected = db.connections[0].readyState;
    console.log("✅ MongoDB connected");
  } catch (err) {
    console.error("❌ MongoDB error:", err);
  }
};

// Ensure DB is connected on every request
app.use(async (req, res, next) => {
  await connectDB();
  next();
});

/* ── Health check ── */
app.get("/", (req, res) => {
  res.json({ status: "Dastyaab API is running 🚀", version: "2.0.0" });
});

/* ── REST Routes ── */
app.use("/api", require("./Routes/auth"));
app.use("/api", require("./Routes/provider"));
app.use("/api", require("./Routes/chat"));
app.use("/api", require("./Routes/review"));

/* ── Local Development Listener ── */
if (process.env.NODE_ENV !== "production") {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
}

/* ── Export for Vercel Serverless Function ── */
module.exports = app;