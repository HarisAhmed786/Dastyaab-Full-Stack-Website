const express = require("express")
const router = express.Router()
const User = require("../Models/user")

// Register
router.post("/register", async (req, res) => {
  // FIX: Destructure 'role' from body so it can be saved
  const { name, email, password, role } = req.body
  try {
    // role will default to 'customer' if not provided based on the Model
    const user = new User({ name, email, password, role })
    await user.save()
    res.status(201).json({ message: "User registered successfully" })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// Login
router.post("/login", async (req, res) => {
  const { email, password } = req.body
  try {
    const user = await User.findOne({ email, password })
    if (!user) {
        return res.status(400).json({ message: "Invalid credentials" })
    }


    res.json({ 
        message: "Login successful", 
        user: {
            _id: user._id,
            name: user.name,
            role: user.role // Now Zaid's script can see if it's 'provider' or 'customer'
        } 
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router