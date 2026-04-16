const express = require("express")
const mongoose = require("mongoose")
const cors = require("cors")

const app = express()

app.use(cors())
app.use(express.json())

mongoose.connect("mongodb://127.0.0.1:27017/dastyaab")
.then(() => console.log("MongoDB connected"))
.catch(err => console.log(err))

app.get("/", (req, res) => {
  res.send("Dastyaab Server Running")
})
const authRoutes = require("./Routes/auth")
const providerRoutes = require("./Routes/provider")

app.use("/api", authRoutes)
app.use("/api", providerRoutes)
app.listen(5000, () => {
  console.log("Server running on port 5000")
})