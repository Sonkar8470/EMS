import express from "express";
import WFH from "../models/wfh.model.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// Get WFH data for a specific user
router.get("/:userId", authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Check if user is requesting their own data or is admin
    if (req.user.role !== "admin" && req.user.id !== userId) {
      return res.status(403).json({ message: "Access denied" });
    }
    
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    
    // Get WFH requests for current month
    const monthRequests = await WFH.find({
      user: userId,
      date: {
        $gte: new Date(currentYear, currentMonth, 1),
        $lte: new Date(currentYear, currentMonth + 1, 0)
      }
    }).sort({ date: -1 });
    
    // Calculate remaining days (max 4 per month)
    const usedDays = monthRequests.length;
    const remainingDays = Math.max(0, 4 - usedDays);
    
    res.json({
      remaining: remainingDays,
      requests: monthRequests.map(req => ({
        requestId: req._id,
        employeeId: req.user,
        date: req.date.toISOString().split('T')[0],
        reason: req.reason,
        status: "Pending", // You can add status field to WFH model if needed
        requestedOn: req.createdAt.toISOString().split('T')[0]
      }))
    });
  } catch (err) {
    console.error("Error fetching WFH data:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Create WFH request
router.post("/request", authMiddleware, async (req, res) => {
  try {
    const { employeeId, date, reason } = req.body;
    
    // Check if user is requesting for themselves or is admin
    if (req.user.role !== "admin" && req.user.id !== employeeId) {
      return res.status(403).json({ message: "Access denied" });
    }
    
    const requestDate = new Date(date);
    
    // Check if WFH limit is reached for the month
    const canApply = await WFH.canApplyWFH(employeeId, requestDate);
    if (!canApply) {
      return res.status(400).json({ 
        message: "Monthly WFH limit reached (max 4 days per month)" 
      });
    }
    
    // Check if request already exists for this date
    const existingRequest = await WFH.findOne({
      user: employeeId,
      date: requestDate
    });
    
    if (existingRequest) {
      return res.status(400).json({ 
        message: "WFH request already exists for this date" 
      });
    }
    
    const newRequest = new WFH({
      user: employeeId,
      date: requestDate,
      reason: reason || "Work from home request"
    });
    
    await newRequest.save();
    
    res.status(201).json({
      message: "WFH request submitted successfully",
      request: newRequest
    });
  } catch (err) {
    console.error("Error creating WFH request:", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
