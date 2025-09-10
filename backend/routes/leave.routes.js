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

// Simple admin/hr guard using req.user.role populated by auth middleware
const isAdminOrHr = (req, res, next) => {
  if (req?.user?.role === "admin" || req?.user?.role === "hr") return next();
  return res.status(403).json({ message: "Admin/HR access required" });
};

// Employee routes
router.post("/apply-leave", auth, applyLeave);
router.post("/apply-wfh", auth, applyWFH);
router.get("/my-leaves", auth, getEmployeeLeaves);
router.get("/my-wfh", auth, getEmployeeWFH);

// Admin/HR routes
router.get("/admin/leave", auth, isAdminOrHr, getAllLeaveApplications);
router.get("/admin/wfh", auth, isAdminOrHr, getAllWFHApplications);
router.put("/admin/leave/:id", auth, isAdminOrHr, updateLeaveStatus);
router.put("/admin/wfh/:id", auth, isAdminOrHr, updateWFHStatus);

export default router;


