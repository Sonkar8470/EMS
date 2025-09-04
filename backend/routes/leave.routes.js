import express from "express";
import auth from "../middleware/authMiddleware.js";
import {
  applyLeave,
  applyWFH,
  getEmployeeLeaves,
  getEmployeeWFH,
  getAllLeaveApplications,
  getAllWFHApplications,
  updateLeaveStatus,
  updateWFHStatus,
} from "../controllers/leave.controller.js";

const router = express.Router();

// Simple admin guard using req.user.role populated by auth middleware
const isAdmin = (req, res, next) => {
  if (req?.user?.role === "admin") return next();
  return res.status(403).json({ message: "Admin access required" });
};

// Employee routes
router.post("/apply-leave", auth, applyLeave);
router.post("/apply-wfh", auth, applyWFH);
router.get("/my-leaves", auth, getEmployeeLeaves);
router.get("/my-wfh", auth, getEmployeeWFH);

// Admin routes
router.get("/admin/leave", auth, isAdmin, getAllLeaveApplications);
router.get("/admin/wfh", auth, isAdmin, getAllWFHApplications);
router.put("/admin/leave/:id", auth, isAdmin, updateLeaveStatus);
router.put("/admin/wfh/:id", auth, isAdmin, updateWFHStatus);

export default router;


