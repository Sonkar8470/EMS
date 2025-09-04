import mongoose from "mongoose";
import Leave from "../models/leave.model.js";
import WFH from "../models/wfh.model.js";
import User from "../models/user.model.js";

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

export const applyLeave = async (req, res) => {
  try {
    const employeeId = req.user?._id;
    const { startDate, endDate, reason } = req.body || {};

    // Debug logging
    console.log("[applyLeave] user:", req.user && { id: req.user._id?.toString?.(), email: req.user.email, role: req.user.role });
    console.log("[applyLeave] body:", req.body);

    if (!employeeId) return res.status(401).json({ message: "Unauthorized" });
    if (!startDate || !endDate || !reason) {
      return res.status(400).json({ message: "startDate, endDate and reason are required" });
    }

    // Normalize dates
    const parsedStart = new Date(startDate);
    const parsedEnd = new Date(endDate);
    if (Number.isNaN(parsedStart.getTime()) || Number.isNaN(parsedEnd.getTime())) {
      return res.status(400).json({ message: "Invalid date format for startDate or endDate" });
    }

    const leave = await Leave.create({
      employeeId,
      startDate: parsedStart,
      endDate: parsedEnd,
      reason,
      status: "pending",
    });

    res.status(201).json({ message: "Leave applied successfully", leave });
  } catch (err) {
    console.error("applyLeave error:", err);
    res.status(500).json({ message: err?.message || "Server error" });
  }
};

export const applyWFH = async (req, res) => {
  try {
    const employeeId = req.user?._id;
    const { startDate, endDate, reason } = req.body || {};

    // Debug logging
    console.log("[applyWFH] user:", req.user && { id: req.user._id?.toString?.(), email: req.user.email, role: req.user.role });
    console.log("[applyWFH] body:", req.body);

    if (!employeeId) return res.status(401).json({ message: "Unauthorized" });
    if (!startDate || !endDate || !reason) {
      return res.status(400).json({ message: "startDate, endDate and reason are required" });
    }

    // Normalize dates
    const parsedStart = new Date(startDate);
    const parsedEnd = new Date(endDate);
    if (Number.isNaN(parsedStart.getTime()) || Number.isNaN(parsedEnd.getTime())) {
      return res.status(400).json({ message: "Invalid date format for startDate or endDate" });
    }

    const wfh = await WFH.create({
      employeeId,
      startDate: parsedStart,
      endDate: parsedEnd,
      reason,
      status: "pending",
    });

    res.status(201).json({ message: "WFH applied successfully", wfh });
  } catch (err) {
    console.error("applyWFH error:", err);
    res.status(500).json({ message: err?.message || "Server error" });
  }
};

export const getEmployeeLeaves = async (req, res) => {
  try {
    const employeeId = req.user?._id;
    const leaves = await Leave.find({ employeeId })
      .populate({ path: "history.adminId", select: "name email employeeId" })
      .sort({ appliedAt: -1 });
    res.json(leaves);
  } catch (err) {
    console.error("getEmployeeLeaves error:", err);
    res.status(500).json({ message: err?.message || "Server error" });
  }
};

export const getEmployeeWFH = async (req, res) => {
  try {
    const employeeId = req.user?._id;
    const wfhs = await WFH.find({ employeeId })
      .populate({ path: "history.adminId", select: "name email employeeId" })
      .sort({ appliedAt: -1 });
    res.json(wfhs);
  } catch (err) {
    console.error("getEmployeeWFH error:", err);
    res.status(500).json({ message: err?.message || "Server error" });
  }
};

export const getAllLeaveApplications = async (_req, res) => {
  try {
    const leaves = await Leave.find({})
      .populate({ path: "employeeId", select: "name email employeeId" })
      .populate({ path: "history.adminId", select: "name email employeeId" })
      .sort({ appliedAt: -1 });
    res.json(leaves);
  } catch (err) {
    console.error("getAllLeaveApplications error:", err);
    res.status(500).json({ message: err?.message || "Server error" });
  }
};

export const getAllWFHApplications = async (_req, res) => {
  try {
    const wfhs = await WFH.find({})
      .populate({ path: "employeeId", select: "name email employeeId" })
      .populate({ path: "history.adminId", select: "name email employeeId" })
      .sort({ appliedAt: -1 });
    res.json(wfhs);
  } catch (err) {
    console.error("getAllWFHApplications error:", err);
    res.status(500).json({ message: err?.message || "Server error" });
  }
};

export const updateLeaveStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!isValidObjectId(id)) return res.status(400).json({ message: "Invalid id" });
    if (!status || !["approved", "rejected"].includes(status)) {
      return res.status(400).json({ message: "status must be approved or rejected" });
    }
    const updated = await Leave.findOne({ _id: id });
    if (!updated) return res.status(404).json({ message: "Leave not found" });
    if (updated.status !== "pending") {
      return res.status(400).json({ message: "Already processed" });
    }
    updated.status = status;
    updated.history = updated.history || [];
    updated.history.push({ action: status, adminId: req.user?._id, date: new Date() });
    await updated.save();
    await updated.populate({ path: "history.adminId", select: "name email employeeId" });
    res.json({ message: "Leave status updated", leave: updated });
  } catch (err) {
    console.error("updateLeaveStatus error:", err);
    res.status(500).json({ message: err?.message || "Server error" });
  }
};

export const updateWFHStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!isValidObjectId(id)) return res.status(400).json({ message: "Invalid id" });
    if (!status || !["approved", "rejected"].includes(status)) {
      return res.status(400).json({ message: "status must be approved or rejected" });
    }
    const updated = await WFH.findOne({ _id: id });
    if (!updated) return res.status(404).json({ message: "WFH application not found" });
    if (updated.status !== "pending") {
      return res.status(400).json({ message: "Already processed" });
    }
    updated.status = status;
    updated.history = updated.history || [];
    updated.history.push({ action: status, adminId: req.user?._id, date: new Date() });
    await updated.save();
    await updated.populate({ path: "history.adminId", select: "name email employeeId" });
    res.json({ message: "WFH status updated", wfh: updated });
  } catch (err) {
    console.error("updateWFHStatus error:", err);
    res.status(500).json({ message: err?.message || "Server error" });
  }
};


