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
import leaveRoutes from "./routes/leave.routes.js";
import dashboardRoutes from "./routes/dashboard.js";
import holidaysRoutes from "./routes/holidays.js";
import announcementsRoutes from "./routes/announcements.js";

dotenv.config({ path: "config.env" });

const app = express();
const httpServer = http.createServer(app);

const DB = process.env.DATABASE_URL || process.env.DATABASE;
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
const connectWithRetry = async (retries = 5, delayMs = 2000) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      if (!DB) throw new Error("DATABASE_URL is not set");
      await mongoose.connect(DB);
      console.log("✅ MongoDB Connected");
      return;
    } catch (err) {
      console.error(`❌ MongoDB connection error (attempt ${attempt}/${retries}):`, err?.message || err);
      if (attempt === retries) throw err;
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
};

connectWithRetry().catch((err) => {
  console.error("Failed to connect to MongoDB after retries:", err?.message || err);
  process.exit(1);
});

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
app.use("/api/leaves", leaveRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/holidays", holidaysRoutes);
app.use("/api/announcements", announcementsRoutes);

app.get("/", (_req, res) => res.send("API is up ✅"));

// 404 handler with logging to help debug missing routes
app.use((req, res, _next) => {
  console.warn("[404]", req.method, req.originalUrl);
  res.status(404).json({ message: "Route not found", method: req.method, path: req.originalUrl });
});

// Global error handler
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err, _req, res, _next) => {
  console.error("[500] Unhandled error:", err?.message || err);
  res.status(500).json({ message: "Internal Server Error" });
});

// ---------------------------
// Log registered routes at startup
// ---------------------------
const logRoutes = () => {
  try {
    const routes = [];
    app._router?.stack?.forEach?.((m) => {
      if (m.route && m.route.path) {
        const methods = Object.keys(m.route.methods)
          .filter((k) => m.route.methods[k])
          .map((k) => k.toUpperCase())
          .join(",");
        routes.push(`${methods} ${m.route.path}`);
      } else if (m.name === 'router' && m.handle?.stack) {
        const base = m.regexp?.source
          ?.replace('^\\', '/')
          ?.replace('(?:', '')
          ?.replace('(?=\\/|$)', '')
          ?.replace('\\/?$', '')
          ?.replace('\\/', '/') || '';
        m.handle.stack.forEach((h) => {
          if (h.route && h.route.path) {
            const methods = Object.keys(h.route.methods)
              .filter((k) => h.route.methods[k])
              .map((k) => k.toUpperCase())
              .join(",");
            routes.push(`${methods} ${base}${h.route.path}`);
          }
        });
      }
    });
    console.log("\nRegistered routes:\n" + routes.sort().join('\n'));
  } catch (e) {
    console.warn("Failed to list routes:", e?.message || e);
  }
};

logRoutes();

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

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Rejection:", reason);
});
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
});
