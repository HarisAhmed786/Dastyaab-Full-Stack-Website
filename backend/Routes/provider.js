const express  = require("express");
const router   = express.Router();
const mongoose = require("mongoose");
const User     = require("../Models/user");
const Booking  = require("../Models/booking");
const Review   = require("./review");


/* ============================================================
   1. UPGRADE USER TO PROVIDER
   Called from provider.html after login.
   Requires userId in the request body.
   PATCH /api/upgrade-to-provider/:id
   ============================================================ */
router.patch("/upgrade-to-provider/:id", async (req, res) => {
  const { id } = req.params;
  const { service, location, experience, contact, bio, price, availability } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: "Invalid User ID format" });
  }

  try {
    const updatedUser = await User.findByIdAndUpdate(
      id,
      { role: "provider", service, location, experience, contact, bio, price, availability,  isVerified: false },
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
   Searches User collection for role === 'provider'.
   Supports ?service= query param.
   GET /api/providers
   ============================================================ */
router.get("/providers", async (req, res) => {
  const { service } = req.query;
  try {
    const providers = await User.find({
      role: "provider",
      service: { $regex: service || "", $options: "i" }
    }).select("name service location experience contact isVerified price avgRating bio profilePic availability"); // 👈 ADD bio AND profilePic HERE

    res.json(providers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


/* ============================================================
   3. CREATE A BOOKING
   Sent from search.html booking modal.
   POST /api/bookings
   ============================================================ */
router.post("/bookings", async (req, res) => {
  try {
    const newBooking = new Booking(req.body);
    await newBooking.save();
    res.status(201).json({ message: "Booking request sent!", booking: newBooking });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


/* ============================================================
   4. GET BOOKINGS FOR PROVIDER DASHBOARD
   Used by dashboard.html to show incoming service requests.
   GET /api/provider-bookings/:pid
   ============================================================ */
router.get("/provider-bookings/:pid", async (req, res) => {
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

router.get("/my-bookings/:uid", async (req, res) => {
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
   ============================================================ */
router.patch("/bookings/:id", async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: "Invalid Booking ID" });
  }

  try {
    const updated = await Booking.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


/* ============================================================
   7. SUBMIT A REVIEW
   Called after a booking is Completed.
   POST /api/reviews
   ============================================================ */
router.post("/reviews", async (req, res) => {
  const { userId, userName, providerId, rating, comment } = req.body;

  if (!userId || !providerId || !rating || !comment) {
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

router.get("/providers/:id", async (req, res) => {
  try {
    // 1. Get the provider data
    const provider = await User.findById(req.params.id).select("-password").lean();
    
    if (!provider) {
      return res.status(404).json({ error: "Provider not found" });
    }

    // 2. Count COMPLETED bookings for this provider
    const jobsDoneCount = await Booking.countDocuments({ 
      providerId: req.params.id, 
      status: "Completed" 
    });

    // 3. Send combined data back to frontend
    res.json({
      ...provider,
      jobsDone: jobsDoneCount
    });

  } catch (err) {
    console.error("Profile Fetch Error:", err);
    res.status(500).json({ error: "Server error fetching provider data" });
  }
});

// UPDATE PROVIDER PROFILE (Used by profile.html Save button)
router.put("/providers/:id", async (req, res) => {
  try {
    const updatedProvider = await User.findByIdAndUpdate(
      req.params.id, 
      { $set: req.body }, 
      { new: true }
    ).select("-password");

    res.json(updatedProvider);
  } catch (err) {
    res.status(500).json({ error: "Update failed" });
  }
});


module.exports = router;