import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cron from "node-cron";
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
// 🔔 Auto Checkout Cron Job
// ---------------------------
cron.schedule("59 23 * * *", async () => {
  console.log("⏰ Running auto-checkout job...");

  try {
    const today = new Date().toISOString().split("T")[0];

    // Find employees who checked in but not checked out
    const records = await Attendance.find({
      date: today,
      inTime: { $exists: true },
      outTime: { $exists: false },
    });

    for (let record of records) {
      const checkInTime = new Date(`${today}T${record.inTime}`);

      // Default checkout = 9 hours after checkin
      const autoCheckOutTime = new Date(
        checkInTime.getTime() + 9 * 60 * 60 * 1000
      );

      record.outTime = autoCheckOutTime.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      record.workedHours = 9; // mark as full 9 hrs

      await record.save();
      console.log(`✅ Auto-checked out employee ${record.employeeId}`);
    }
  } catch (err) {
    console.error("❌ Error in auto-checkout cron:", err);
  }
});

// ---------------------------
// Start server
// ---------------------------
app.listen(port, () => {
  console.log(`🚀 Server running on http://localhost:${port}`);
});
