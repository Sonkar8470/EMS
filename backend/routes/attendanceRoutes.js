// routes/attendanceRoutes.js
import express from "express";
import Attendance from "../models/attendance.model.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// Get attendance records with query parameters (for frontend compatibility)
router.get("/", authMiddleware, async (req, res) => {
  try {
    const { employeeId, date, _sort, _order, _limit } = req.query;
    
    console.log("GET / - Query params:", { employeeId, date, _sort, _order, _limit });
    
    // If employeeId is provided, use it; otherwise use logged-in user's ID
    const userId = employeeId || req.user._id;
    
    let query = { employeeId: userId };
    
    // Add date filter if provided
    if (date) {
      query.date = date;
    }
    
    console.log("GET / - Final query:", query);
    
    let attendanceQuery = Attendance.find(query);
    
    // Add sorting
    if (_sort) {
      const sortOrder = _order === 'desc' ? -1 : 1;
      attendanceQuery = attendanceQuery.sort({ [_sort]: sortOrder });
    }
    
    // Add limit
    if (_limit) {
      attendanceQuery = attendanceQuery.limit(parseInt(_limit));
    }
    
    const records = await attendanceQuery.exec();
    console.log("GET / - Found records:", records.length, records);
    
    // Add id field for frontend compatibility
    const recordsWithId = records.map(record => ({
      ...record.toObject(),
      id: record._id
    }));
    
    res.json(recordsWithId);
  } catch (err) {
    console.error("Error fetching attendance:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Get today's attendance of logged-in user
router.get("/today", authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id; // jo login hai uska id
    const today = new Date().toISOString().split("T")[0];
    const record = await Attendance.findOne({
      employeeId: userId,
      date: today,
    });
    res.json(record || null);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// Get history of logged-in user
router.get("/history", authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;
    const history = await Attendance.find({ employeeId: userId })
      .sort({ date: -1 })
      .limit(30);
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// Create new attendance record (for frontend compatibility)
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { employeeId, date, status, inTime, outTime, location, workedHours } = req.body;
    
    // Use provided employeeId or logged-in user's ID
    const userId = employeeId || req.user._id;
    
    // Check if record already exists for this date
    const existingRecord = await Attendance.findOne({ 
      employeeId: userId, 
      date: date 
    });
    
    if (existingRecord) {
      return res.status(400).json({ message: "Attendance record already exists for this date" });
    }
    
    const newRecord = new Attendance({
      employeeId: userId,
      date,
      status: status || "Present",
      inTime,
      outTime,
      location,
      workedHours
    });
    
    await newRecord.save();
    
    // Add id field for frontend compatibility
    const recordWithId = {
      ...newRecord.toObject(),
      id: newRecord._id
    };
    
    res.status(201).json(recordWithId);
  } catch (err) {
    console.error("Error creating attendance record:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Update attendance record (for frontend compatibility)
router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { employeeId, date, status, inTime, outTime, location, workedHours } = req.body;
    
    console.log("PUT /:id - Request:", {
      id,
      employeeId,
      date,
      status,
      inTime,
      outTime,
      location,
      workedHours
    });
    
    // Use provided employeeId or logged-in user's ID
    const userId = employeeId || req.user._id;
    
    console.log("PUT /:id - Updating record:", {
      recordId: id,
      userId,
      updateData: {
        employeeId: userId,
        date,
        status,
        inTime,
        outTime,
        location,
        workedHours
      }
    });
    
    const updatedRecord = await Attendance.findByIdAndUpdate(
      id,
      {
        employeeId: userId,
        date,
        status,
        inTime,
        outTime,
        location,
        workedHours
      },
      { new: true, runValidators: true }
    );
    
    if (!updatedRecord) {
      console.log("PUT /:id - Record not found:", id);
      return res.status(404).json({ message: "Attendance record not found" });
    }
    
    console.log("PUT /:id - Successfully updated:", updatedRecord);
    
    // Add id field for frontend compatibility
    const recordWithId = {
      ...updatedRecord.toObject(),
      id: updatedRecord._id
    };
    
    res.json(recordWithId);
  } catch (err) {
    console.error("Error updating attendance record:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Check-in
router.post("/checkin", authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;
    const today = new Date().toISOString().split("T")[0];
    let record = await Attendance.findOne({ employeeId: userId, date: today });
    if (record && record.inTime) {
      return res.status(400).json({ message: "Already checked in" });
    }

    const { latitude, longitude } = req.body.location;

    if (!record) {
      record = new Attendance({
        employeeId: userId,
        date: today,
        status: "Present",
      });
    }
    record.inTime = req.body.inTime;
    record.location = { latitude, longitude };

    await record.save();
    res.json(record);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// Check-out
router.post("/checkout", authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;
    const today = new Date().toISOString().split("T")[0];

    const record = await Attendance.findOne({
      employeeId: userId,
      date: today,
    });
    if (!record || !record.inTime) {
      return res.status(400).json({ message: "Please check in first" });
    }
    if (record.outTime) {
      return res.status(400).json({ message: "Already checked out" });
    }

    const { latitude, longitude } = req.body.location;
    record.outTime = req.body.outTime;
    record.location = { latitude, longitude };

    await record.save();
    res.json(record);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
