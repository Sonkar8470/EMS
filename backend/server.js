import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";

import cors from "cors";
import cookieParser from "cookie-parser";

// import models
import Attendance from "./models/attendance.model.js";

// import routes
import userRoutes from "./routes/userRoutes.js";
import attendanceRoutes from "./routes/attendanceRoutes.js";
import wfhRoutes from "./routes/wfhRoutes.js";

dotenv.config({ path: "config.env" });

const app = express();

const DB = process.env.DATABASE;
const port = process.env.PORT || 3001;

// ---------------------------
// Middleware
// ---------------------------
app.use(express.json());
app.use(
  cors({
    origin: "http://localhost:5173", // allow frontend dev server
    credentials: true,
  })
);
app.use(cookieParser()); // Add cookie parser middleware

// ---------------------------
// Connect DB
// ---------------------------
mongoose
  .connect(DB)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// ---------------------------
// Routes
// ---------------------------
app.use("/api/users", userRoutes);
app.use("/api/attendances", attendanceRoutes);
app.use("/api/wfh", wfhRoutes);

app.get("/", (_req, res) => res.send("API is up ✅"));

// ---------------------------
// 🔔 Auto Checkout Cron Job - REMOVED
// Users can now check out anytime after checking in
// ---------------------------

// ---------------------------
// Start server
// ---------------------------
app.listen(port, () => {
  console.log(`🚀 Server running on http://localhost:${port}`);
});
