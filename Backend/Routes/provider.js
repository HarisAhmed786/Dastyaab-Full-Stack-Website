const express  = require("express");
const router   = express.Router();
const mongoose = require("mongoose");
const path     = require("path");
const fs       = require("fs");
const User     = require("../Models/user");
const Booking  = require("../Models/booking");
const Review   = require("../Models/review");
const { requireAuth, requireSelf } = require("../Middleware/auth");


/* ============================================================
   1. UPGRADE USER TO PROVIDER
   Called from provider.html after login.
   PATCH /api/upgrade-to-provider/:id
   Auth: must be logged in as the user being upgraded.
   ============================================================ */
router.patch("/upgrade-to-provider/:id", requireAuth, requireSelf("id"), async (req, res) => {
  const { id } = req.params;
  const { service, location, experience, contact, bio, price, availability } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: "Invalid User ID format" });
  }

  try {
    const updatedUser = await User.findByIdAndUpdate(
      id,
      { role: "provider", service, location, experience, contact, bio, price, availability, isVerified: false },
      { new: true }
    ).select("-password");

    if (!updatedUser) return res.status(404).json({ error: "User not found" });

    res.status(200).json({ message: "You are now a Provider!", user: updatedUser });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});


/* ============================================================
   2. SEARCH PROVIDERS
   Public — anyone can browse providers, logged in or not.
   GET /api/providers
   ============================================================ */
router.get("/providers", async (req, res) => {
  const { service } = req.query;
  try {
    const providers = await User.find({
      role: "provider",
      service: { $regex: service || "", $options: "i" }
    }).select("name service location experience contact isVerified price avgRating bio profilePic availability");

    res.json(providers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


/* ============================================================
   3. CREATE A BOOKING
   Sent from search.html booking modal.
   POST /api/bookings
   Auth: must be logged in. customerId is taken from the token,
   not trusted from the request body, so a user can't create a
   booking on someone else's behalf.
   ============================================================ */
router.post("/bookings", requireAuth, async (req, res) => {
  try {
    const provider = await User.findById(req.body.providerId).select("price");
    const newBooking = new Booking({
      ...req.body,
      customerId: req.user.id,
      amount: provider?.price || 0
    });
    await newBooking.save();

    // Notify the provider in real time if they're online
    const io = req.app.get("io");
    const onlineUsers = req.app.get("onlineUsers");
    const providerSocketId = onlineUsers?.get(req.body.providerId);
    if (io && providerSocketId) {
      io.to(providerSocketId).emit("notification:new_booking", {
        bookingId: newBooking._id,
        customerName: newBooking.customerName,
        serviceType: newBooking.serviceType,
        isEmergency: newBooking.isEmergency
      });
    }

    res.status(201).json({ message: "Booking request sent!", booking: newBooking });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


/* ============================================================
   4. GET BOOKINGS FOR PROVIDER DASHBOARD
   Used by dashboard.html to show incoming service requests.
   GET /api/provider-bookings/:pid
   Auth: only that provider can see their own incoming bookings.
   ============================================================ */
router.get("/provider-bookings/:pid", requireAuth, requireSelf("pid"), async (req, res) => {
  const { pid } = req.params;

  if (!mongoose.Types.ObjectId.isValid(pid)) {
    return res.status(400).json({ error: "Invalid or missing Provider ID" });
  }

  try {
    const bookings = await Booking.find({ providerId: pid }).sort({ createdAt: -1 });
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* Auth: only that customer can see their own booking history. */
router.get("/my-bookings/:uid", requireAuth, requireSelf("uid"), async (req, res) => {
  const { uid } = req.params;

  if (!mongoose.Types.ObjectId.isValid(uid)) {
    return res.status(400).json({ error: "Invalid User ID" });
  }

  try {
    const bookings = await Booking.find({ customerId: uid }).sort({ createdAt: -1 });
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


/* ============================================================
   6. UPDATE BOOKING STATUS (Accept / Reject / Complete)
   Used by dashboard.html provider actions.
   PATCH /api/bookings/:id
   Auth: only the provider assigned to this specific booking can
   change its status — checked against the booking record itself,
   not just "is logged in".
   ============================================================ */
router.patch("/bookings/:id", requireAuth, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: "Invalid Booking ID" });
  }

  const allowedStatuses = ["Pending", "Accepted", "Rejected", "Completed"];
  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({ error: "Invalid status value." });
  }

  try {
    const booking = await Booking.findById(id);
    if (!booking) return res.status(404).json({ error: "Booking not found" });

    if (booking.providerId.toString() !== req.user.id) {
      return res.status(403).json({ error: "Only the assigned provider can update this booking." });
    }

    booking.status = status;
    await booking.save();

    const io = req.app.get("io");
    const onlineUsers = req.app.get("onlineUsers");
    const customerSocketId = onlineUsers?.get(booking.customerId?.toString());
    if (io && customerSocketId) {
      io.to(customerSocketId).emit("notification:booking_status", {
        bookingId: booking._id,
        status: booking.status,
        providerName: booking.providerName
      });
    }

    res.json(booking);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


/* ============================================================
   7. SUBMIT A REVIEW
   Called after a booking is Completed.
   POST /api/reviews
   Auth: userId is taken from the token, not the request body, so
   a user can't post a review pretending to be someone else.
   ============================================================ */
router.post("/reviews", requireAuth, async (req, res) => {
  const { userName, providerId, rating, comment } = req.body;
  const userId = req.user.id;

  if (!providerId || !rating || !comment) {
    return res.status(400).json({ error: "All fields are required." });
  }

  try {
    const review = new Review({ userId, userName, providerId, rating, comment });
    await review.save();

    // Recalculate and update the provider's average rating
    const allReviews = await Review.find({ providerId });
    const count = allReviews.length;
    const avg = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;

    await User.findByIdAndUpdate(providerId, { avgRating: avg.toFixed(1), reviewCount: count });

    res.status(201).json({ message: "Review submitted!", review });
  } catch (err) {
    // Duplicate review error
    if (err.code === 11000) {
      return res.status(400).json({ error: "You have already reviewed this provider." });
    }
    res.status(500).json({ error: err.message });
  }
});


/* ============================================================
   8. GET REVIEWS FOR A PROVIDER
   Used on the provider detail / search card.
   GET /api/reviews/:providerId
   Public.
   ============================================================ */
router.get("/reviews/:providerId", async (req, res) => {
  const { providerId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(providerId)) {
    return res.status(400).json({ error: "Invalid Provider ID" });
  }

  try {
    const reviews = await Review.find({ providerId }).sort({ createdAt: -1 });
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* Public — provider profile pages are meant to be browsable by anyone. */
router.get("/providers/:id", async (req, res) => {
  try {
    const provider = await User.findById(req.params.id).select("-password").lean();

    if (!provider) {
      return res.status(404).json({ error: "Provider not found" });
    }

    const jobsDoneCount = await Booking.countDocuments({
      providerId: req.params.id,
      status: "Completed"
    });

    res.json({
      ...provider,
      jobsDone: jobsDoneCount
    });

  } catch (err) {
    console.error("Profile Fetch Error:", err);
    res.status(500).json({ error: "Server error fetching provider data" });
  }
});

/* ============================================================
   UPDATE PROVIDER PROFILE (Used by profile.html Save button)
   PUT /api/providers/:id
   Auth: only that user can edit their own profile.
   Fixed mass-assignment bug — only a specific, safe set of fields
   can be updated this way. A client can no longer send
   { "role": "provider", "isVerified": true, "avgRating": 5 } and
   have it silently written to the database.
   ============================================================ */
router.put("/providers/:id", requireAuth, requireSelf("id"), async (req, res) => {
  const allowedFields = ["name", "service", "contact", "price", "bio", "availability", "profilePic", "location", "experience"];
  const updates = {};
  for (const field of allowedFields) {
    if (req.body[field] !== undefined) updates[field] = req.body[field];
  }

  try {
    const updatedProvider = await User.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    ).select("-password");

    res.json(updatedProvider);
  } catch (err) {
    res.status(500).json({ error: "Update failed" });
  }
});


/* ============================================================
   PROVIDER DASHBOARD ANALYTICS
   GET /api/provider-stats/:id
   Auth: only that provider can see their own stats.
   Returns totals + a 6-month trend for the dashboard mini-charts.
   ============================================================ */
router.get("/provider-stats/:id", requireAuth, requireSelf("id"), async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: "Invalid Provider ID" });
  }

  try {
    const bookings = await Booking.find({ providerId: id });

    const totalBookings   = bookings.length;
    const completed       = bookings.filter(b => b.status === "Completed");
    const totalEarnings   = completed.reduce((sum, b) => sum + (b.amount || 0), 0);
    const avgBookingValue = completed.length ? Math.round(totalEarnings / completed.length) : 0;

    const statusBreakdown = {
      Pending:   bookings.filter(b => b.status === "Pending").length,
      Accepted:  bookings.filter(b => b.status === "Accepted").length,
      Completed: completed.length,
      Rejected:  bookings.filter(b => b.status === "Rejected").length,
    };

    // Last 6 months trend (bookings count + earnings), oldest first
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ year: d.getFullYear(), month: d.getMonth(), label: d.toLocaleString("default", { month: "short" }) });
    }

    const monthlyTrend = months.map(m => {
      const inMonth = bookings.filter(b => {
        const bd = new Date(b.createdAt);
        return bd.getFullYear() === m.year && bd.getMonth() === m.month;
      });
      const monthEarnings = inMonth
        .filter(b => b.status === "Completed")
        .reduce((sum, b) => sum + (b.amount || 0), 0);
      return { label: m.label, bookings: inMonth.length, earnings: monthEarnings };
    });

    res.json({
      totalBookings,
      totalEarnings,
      avgBookingValue,
      completedCount: completed.length,
      statusBreakdown,
      monthlyTrend
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


/* ============================================================
   PROVIDER PORTFOLIO GALLERY
   Auth: only the provider themself can add/remove their own
   portfolio images.
   ============================================================ */
router.post("/providers/:id/portfolio", requireAuth, requireSelf("id"), async (req, res) => {
  const { base64, filename, caption } = req.body;
  if (!base64 || !filename) {
    return res.status(400).json({ error: "Missing image data." });
  }

  const ext = path.extname(filename).toLowerCase();
  if (![".jpg", ".jpeg", ".png", ".webp"].includes(ext)) {
    return res.status(400).json({ error: "Only JPG, PNG, or WEBP images are allowed." });
  }

  const approxBytes = base64.length * 0.75;
  if (approxBytes > 8 * 1024 * 1024) {
    return res.status(400).json({ error: "Image must be under 8MB." });
  }

  try {
    const uploadDir = path.join(__dirname, "../uploads/portfolio");
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

    const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
    const filePath   = path.join(uploadDir, uniqueName);
    const base64Data = base64.replace(/^data:image\/\w+;base64,/, "");
    fs.writeFileSync(filePath, Buffer.from(base64Data, "base64"));

    const imageUrl = `/uploads/portfolio/${uniqueName}`;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $push: { portfolio: { url: imageUrl, caption: caption || "" } } },
      { new: true }
    ).select("portfolio");

    res.status(201).json({ portfolio: user.portfolio });
  } catch (err) {
    res.status(500).json({ error: "Upload failed." });
  }
});

router.delete("/providers/:id/portfolio/:itemId", requireAuth, requireSelf("id"), async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $pull: { portfolio: { _id: req.params.itemId } } },
      { new: true }
    ).select("portfolio");

    res.json({ portfolio: user.portfolio });
  } catch (err) {
    res.status(500).json({ error: "Delete failed." });
  }
});


/* ============================================================
   FAVORITES / SAVED PROVIDERS
   Auth: every route here operates on the logged-in user's own list.
   ============================================================ */
router.get("/favorites", requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate("favorites", "name service location price avgRating reviewCount profilePic isVerified");
    res.json(user.favorites || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/favorites/:providerId", requireAuth, async (req, res) => {
  const { providerId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(providerId)) {
    return res.status(400).json({ error: "Invalid Provider ID" });
  }
  try {
    await User.findByIdAndUpdate(req.user.id, { $addToSet: { favorites: providerId } });
    res.status(201).json({ message: "Added to favorites." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/favorites/:providerId", requireAuth, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user.id, { $pull: { favorites: req.params.providerId } });
    res.json({ message: "Removed from favorites." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


module.exports = router;
