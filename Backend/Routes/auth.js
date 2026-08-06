const express = require("express")
const router = express.Router()
const jwt = require("jsonwebtoken")
const rateLimit = require("express-rate-limit")
const User = require("../Models/user")

// Limits brute-force attempts on login/register from a single IP.
// 20 attempts per 15 minutes is generous for a real user, tight for a script.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: "Too many attempts. Please try again in a few minutes." },
  standardHeaders: true,
  legacyHeaders: false,
})

function signToken(user) {
  return jwt.sign(
    { id: user._id.toString(), role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "1d" }
  )
}

// Strips fields that should never go back to the client, regardless of route.
function toSafeUser(user) {
  const obj = user.toObject ? user.toObject() : user
  delete obj.password
  return obj
}

// Register
router.post("/register", authLimiter, async (req, res) => {
  const { name, email, password, role } = req.body

  if (!name || !email || !password) {
    return res.status(400).json({ message: "Name, email, and password are required." })
  }
  if (password.length < 8) {
    return res.status(400).json({ message: "Password must be at least 8 characters." })
  }

  try {
    // role defaults to 'customer' via the Model if not provided.
    // Password is hashed automatically by the pre-save hook in Models/user.js.
    const user = new User({ name, email, password, role })
    await user.save()

    const token = signToken(user)
    res.status(201).json({
      message: "User registered successfully",
      token,
      user: toSafeUser(user),
    })
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: "An account with that email already exists." })
    }
    res.status(400).json({ error: err.message })
  }
})

// Login
router.post("/login", authLimiter, async (req, res) => {
  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required." })
  }

  try {
    // Explicitly select password since it's fine to include here — we need
    // it for comparison — but every other route selects it out by default
    // isn't set on the schema, so we rely on toSafeUser() below instead.
    const user = await User.findOne({ email })
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" })
    }

    const isMatch = await user.comparePassword(password)
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" })
    }

    const token = signToken(user)
    res.json({
      message: "Login successful",
      token,
      user: toSafeUser(user),
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
