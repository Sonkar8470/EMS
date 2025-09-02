import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";

import cors from "cors";
import cookieParser from "cookie-parser";
import http from "http";
import { Server as SocketIOServer } from "socket.io";

// import models
import Attendance from "./models/attendance.model.js";

// import routes
import userRoutes from "./routes/userRoutes.js";
import authRoutes from "./routes/userRoutes.js";
import attendanceRoutes from "./routes/attendanceRoutes.js";
import wfhRoutes from "./routes/wfhRoutes.js";
import dashboardRoutes from "./routes/dashboard.js";
import holidaysRoutes from "./routes/holidays.js";

dotenv.config({ path: "config.env" });

const app = express();
const httpServer = http.createServer(app);

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
// Socket.IO
// ---------------------------
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: "http://localhost:5173",
    credentials: true,
  },
});

// Make io available to routes
app.set("io", io);

io.on("connection", (socket) => {
  // Client should emit 'join' with { employeeId } (Mongo _id) to join their personal room
  socket.on("join", (data) => {
    try {
      const employeeId = data?.employeeId?.toString();
      if (employeeId) {
        socket.join(employeeId);
      }
    } catch {}
  });

  socket.on("disconnect", () => {
    // no-op for now
  });
});

// ---------------------------
// Routes
// ---------------------------
app.use("/api/users", userRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/attendances", attendanceRoutes);
app.use("/api/wfh", wfhRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/holidays", holidaysRoutes);

app.get("/", (_req, res) => res.send("API is up ✅"));

// ---------------------------
// 🔔 Auto Checkout Cron Job - REMOVED
// Users can now check out anytime after checking in
// ---------------------------

// ---------------------------
// Start server
// ---------------------------
httpServer.listen(port, () => {
  console.log(`🚀 Server running on http://localhost:${port}`);
});
