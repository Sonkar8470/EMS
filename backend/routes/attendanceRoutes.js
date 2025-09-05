// routes/attendanceRoutes.js
import express from "express";
import Attendance from "../models/attendance.model.js";
import authMiddleware from "../middleware/authMiddleware.js";
import Holiday from "../models/holiday.model.js";
import User from "../models/user.model.js";

const router = express.Router();

// util helpers
const toYmd = (d) => new Date(d).toISOString().split("T")[0];
const startOfDayUtc = (dateInput) => {
  const d = dateInput ? new Date(dateInput) : new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
};

const isSunday = (d) => d.getUTCDay() === 0;
const isSecondOrFourthSaturday = (d) => {
  const day = d.getUTCDay();
  if (day !== 6) return false; // 6 = Saturday
  const date = d.getUTCDate();
  const occurrence = Math.ceil(date / 7); // 1..5
  return occurrence === 2 || occurrence === 4;
};

const buildDateRange = (startDate, endDate) => {
  const start = startOfDayUtc(startDate);
  const end = startOfDayUtc(endDate);
  const dates = [];
  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    dates.push(new Date(d));
  }
  return dates;
};

// Check-in - MUST come before the general GET route
router.post("/checkin", authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;
    const todayStart = startOfDayUtc(new Date());
    let record = await Attendance.findOne({ employeeId: userId, date: todayStart });
    if (record && record.inTime) {
      return res.status(400).json({ message: "Already checked in" });
    }

    const { latitude, longitude } = req.body.location;

    if (!record) {
      record = new Attendance({
        employeeId: userId,
        date: todayStart,
        status: "Present",
      });
    }
    record.inTime = req.body.inTime;
    record.location = { latitude, longitude };

    await record.save();
    const out = record.toObject();
    out.id = record._id;
    out.date = toYmd(record.date);
    try {
      const io = req.app.get("io");
      if (io) io.to(String(userId)).emit("attendanceUpdated", { employeeId: String(userId), updatedRecord: out });
    } catch {}
    res.json(out);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// Check-out - MUST come before the general GET route
router.post("/checkout", authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;
    const todayStart = startOfDayUtc(new Date());

    const record = await Attendance.findOne({
      employeeId: userId,
      date: todayStart,
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
    const out = record.toObject();
    out.id = record._id;
    out.date = toYmd(record.date);
    try {
      const io = req.app.get("io");
      if (io) io.to(String(userId)).emit("attendanceUpdated", { employeeId: String(userId), updatedRecord: out });
    } catch {}
    res.json(out);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// Get today's attendance of logged-in user
router.get("/today", authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;
    const todayStart = startOfDayUtc(new Date());
    const record = await Attendance.findOne({
      employeeId: userId,
      date: todayStart,
    });
    const out = record
      ? { ...record.toObject(), id: record._id, date: toYmd(record.date) }
      : null;
    res.json(out);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// Get history of logged-in user
router.get("/history", authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Get all attendance records sorted by date descending
    const history = await Attendance.find({ employeeId: userId })
      .sort({ date: -1 });
    
    // Remove duplicates by keeping only the latest record for each date
    const uniqueRecords = [];
    const seenDates = new Set();
    
    for (const record of history) {
      const dateKey = toYmd(record.date);
      if (!seenDates.has(dateKey)) {
        seenDates.add(dateKey);
        uniqueRecords.push(record);
      }
    }
    
    // Limit to 30 records and format response
    const out = uniqueRecords
      .slice(0, 30)
      .map((r) => ({ ...r.toObject(), id: r._id, date: toYmd(r.date) }));
    
    res.json(out);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// Get attendance records with query parameters (for frontend compatibility)
router.get("/", authMiddleware, async (req, res) => {
  try {
    const { employeeId, date, startDate, endDate, _sort, _order, _limit } = req.query;
    
    console.log("GET / - Query params:", { employeeId, date, _sort, _order, _limit });
    
    // If employeeId is provided, allow only admins to query others
    let userId = req.user._id;
    if (employeeId && String(employeeId) !== String(req.user._id)) {
      if (req.user.role !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }
      userId = employeeId;
    }
    
    let query = { employeeId: userId };
    
    // Add date filter if provided
    if (date) {
      query.date = startOfDayUtc(date);
    } else if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = startOfDayUtc(startDate);
      if (endDate) query.date.$lte = startOfDayUtc(endDate);
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
    console.log("GET / - Found records:", records.length);

    // Build response with holidays and weekly offs
    let response = records.map((record) => ({
      ...record.toObject(),
      id: record._id,
      date: toYmd(record.date),
    }));

    // If a range is requested, supplement with holidays and weekly offs
    if (startDate && endDate) {
      const allDates = buildDateRange(startDate, endDate);

      // Fetch holidays in range
      const holidays = await Holiday.find({
        date: { $gte: startOfDayUtc(startDate), $lte: startOfDayUtc(endDate) },
        applicable: true,
      });

      const holidayMap = new Map(
        holidays.map((h) => [toYmd(h.date), h.holidayName])
      );

      const existingByDate = new Map(response.map((r) => [r.date, r]));

      for (const d of allDates) {
        const ymd = toYmd(d);
        const hasRecord = existingByDate.has(ymd);

        // Fixed holiday overlay (non-editable on frontend)
        if (holidayMap.has(ymd)) {
          if (!hasRecord) {
            response.push({
              employeeId: employeeId || req.user._id,
              date: ymd,
              status: "Holiday",
              holidayName: holidayMap.get(ymd),
              id: `holiday-${ymd}`,
            });
          } else {
            const rec = existingByDate.get(ymd);
            rec.status = "Holiday";
            rec.holidayName = holidayMap.get(ymd);
          }
          continue;
        }

        // Weekly Offs: Sundays and 2nd/4th Saturdays
        if (isSunday(d) || isSecondOrFourthSaturday(d)) {
          if (!hasRecord) {
            response.push({
              employeeId: userId,
              date: ymd,
              status: "W/O",
              id: `wo-${ymd}`,
            });
          }
        }
      }

      // Do not auto-mark missing days as Absent; only return actual records, holidays and weekly offs
    }

    res.json(response);
  } catch (err) {
    console.error("Error fetching attendance:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Create new attendance record (for frontend compatibility)
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { employeeId, date, status, inTime, outTime, location, workedHours } = req.body;
    
    // Use provided employeeId only if admin; otherwise logged-in user's ID
    let userId = req.user._id;
    if (employeeId && String(employeeId) !== String(req.user._id)) {
      if (req.user.role !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }
      userId = employeeId;
    }
    
    // Prevent edits on fixed holidays
    const holiday = await Holiday.findOne({ date: startOfDayUtc(date), applicable: true });
    if (holiday) {
      return res.status(400).json({ message: "Cannot create attendance on a fixed holiday" });
    }

    // Check if record already exists for this date
    const existingRecord = await Attendance.findOne({ 
      employeeId: userId, 
      date: startOfDayUtc(date) 
    });
    
    if (existingRecord) {
      return res.status(400).json({ message: "Attendance record already exists for this date" });
    }
    
    const newRecord = new Attendance({
      employeeId: userId,
      date: startOfDayUtc(date),
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
      id: newRecord._id,
      date: toYmd(newRecord.date)
    };
    
    try {
      const io = req.app.get("io");
      if (io) io.to(String(userId)).emit("attendanceUpdated", { employeeId: String(userId), updatedRecord: recordWithId });
    } catch {}
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
    
    // Only admins can change another user's record; employees can only update their own existing record
    let userId = req.user._id;
    if (employeeId && String(employeeId) !== String(req.user._id)) {
      if (req.user.role !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }
      userId = employeeId;
    }
    
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
    
    // Prevent edits on fixed holidays
    if (date) {
      const holiday = await Holiday.findOne({ date: startOfDayUtc(date), applicable: true });
      if (holiday) {
        return res.status(400).json({ message: "Cannot edit attendance on a fixed holiday" });
      }
    }

    const updatedRecord = await Attendance.findByIdAndUpdate(
      id,
      {
        employeeId: userId,
        date: date ? startOfDayUtc(date) : undefined,
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
      id: updatedRecord._id,
      date: toYmd(updatedRecord.date)
    };
    
    try {
      const io = req.app.get("io");
      if (io) io.to(String(userId)).emit("attendanceUpdated", { employeeId: String(userId), updatedRecord: recordWithId });
    } catch {}
    res.json(recordWithId);
  } catch (err) {
    console.error("Error updating attendance record:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// New required endpoints per spec
// GET /attendance/me -> merged attendance + holidays + weekly offs
router.get("/me", authMiddleware, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const userId = req.user._id;
    let query = { employeeId: userId };
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = startOfDayUtc(startDate);
      if (endDate) query.date.$lte = startOfDayUtc(endDate);
    }
    const records = await Attendance.find(query).exec();
    let response = records.map((record) => ({
      ...record.toObject(),
      id: record._id,
      date: toYmd(record.date),
    }));

    if (startDate && endDate) {
      const allDates = buildDateRange(startDate, endDate);
      const holidays = await Holiday.find({
        date: { $gte: startOfDayUtc(startDate), $lte: startOfDayUtc(endDate) },
        applicable: true,
      });
      const holidayMap = new Map(holidays.map((h) => [toYmd(h.date), h.holidayName]));
      const existingByDate = new Map(response.map((r) => [r.date, r]));

      for (const d of allDates) {
        const ymd = toYmd(d);
        const hasRecord = existingByDate.has(ymd);
        if (holidayMap.has(ymd)) {
          if (!hasRecord) {
            response.push({
              employeeId: userId,
              date: ymd,
              status: "Holiday",
              holidayName: holidayMap.get(ymd),
              id: `holiday-${ymd}`,
            });
          } else {
            const rec = existingByDate.get(ymd);
            rec.status = "Holiday";
            rec.holidayName = holidayMap.get(ymd);
          }
          continue;
        }
        if (isSunday(d) || isSecondOrFourthSaturday(d)) {
          if (!hasRecord) {
            response.push({
              employeeId: userId,
              date: ymd,
              status: "W/O",
              id: `wo-${ymd}`,
            });
          }
        }
      }

      // Do not auto-mark missing days as Absent in /me
    }

    res.json(response);
  } catch (err) {
    console.error("Error in /me:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /attendance/mark -> mark check-in/out based on presence of inTime/outTime
router.post("/mark", authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;
    const todayStart = startOfDayUtc(new Date());
    let record = await Attendance.findOne({ employeeId: userId, date: todayStart });
    const { inTime, outTime, location } = req.body;

    if (inTime) {
      if (record && record.inTime) return res.status(400).json({ message: "Already checked in" });
      if (!record) record = new Attendance({ employeeId: userId, date: todayStart, status: "Present" });
      record.inTime = inTime;
      if (location) record.location = location;
    }

    if (outTime) {
      if (!record || !record.inTime) return res.status(400).json({ message: "Please check in first" });
      if (record.outTime) return res.status(400).json({ message: "Already checked out" });
      record.outTime = outTime;
    }

    await record.save();
    const out = record.toObject();
    out.id = record._id;
    out.date = toYmd(record.date);
    try {
      const io = req.app.get("io");
      if (io) io.to(String(userId)).emit("attendanceUpdated", { employeeId: String(userId), updatedRecord: out });
    } catch {}
    res.json(out);
  } catch (err) {
    console.error("Error in /mark:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// PUT /attendance/update/:id -> admin updates any user's attendance
router.put("/update/:id", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "admin") return res.status(403).json({ message: "Forbidden" });
    const { id } = req.params;
    const { employeeId, date, status, inTime, outTime, location, workedHours } = req.body;
    const update = {
      ...(employeeId ? { employeeId } : {}),
      ...(date ? { date: startOfDayUtc(date) } : {}),
      ...(status ? { status } : {}),
      ...(inTime ? { inTime } : {}),
      ...(outTime ? { outTime } : {}),
      ...(location ? { location } : {}),
      ...(workedHours !== undefined ? { workedHours } : {}),
    };
    // Prevent edits on fixed holidays
    if (update.date) {
      const holiday = await Holiday.findOne({ date: update.date, applicable: true });
      if (holiday) return res.status(400).json({ message: "Cannot edit attendance on a fixed holiday" });
    }
    const updated = await Attendance.findByIdAndUpdate(id, update, { new: true, runValidators: true });
    if (!updated) return res.status(404).json({ message: "Attendance record not found" });
    const out = { ...updated.toObject(), id: updated._id, date: toYmd(updated.date) };
    // If admin marks a date as Holiday, upsert into Holiday collection so it's global
    try {
      if (out.status === "Holiday") {
        const d = updated.date instanceof Date ? updated.date : new Date(updated.date);
        const dUtc = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
        await Holiday.updateOne(
          { date: dUtc },
          { $set: { date: dUtc, holidayName: out.holidayName || "Holiday", applicable: true } },
          { upsert: true }
        );
        const ioGlobal = req.app.get("io");
        if (ioGlobal) ioGlobal.emit("holidayUpdated");
      }
    } catch {}
    try {
      const targetId = String(out.employeeId || update.employeeId);
      const io = req.app.get("io");
      if (io && targetId) io.to(targetId).emit("attendanceUpdated", { employeeId: targetId, updatedRecord: out });
    } catch {}
    res.json(out);
  } catch (err) {
    console.error("Error in /update/:id:", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
