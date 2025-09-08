import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import Attendance from "../models/attendance.model.js";
import WFH from "../models/wfh.model.js";
import Leave from "../models/leave.model.js";
import User from "../models/user.model.js";
import Holiday from "../models/holiday.model.js";

const router = express.Router();

const startOfDayUtc = (dateInput) => {
  const d = dateInput ? new Date(dateInput) : new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
};

// Returns the UTC start of the requested month and the UTC start of the next month
// month is 1-based (1-12); year is full year (e.g., 2025)
const getMonthRangeUtc = (month, year) => {
  const now = new Date();
  const targetYear = year ? parseInt(year, 10) : now.getUTCFullYear();
  const targetMonthIndex = month ? parseInt(month, 10) - 1 : now.getUTCMonth();
  const monthStartUtc = new Date(Date.UTC(targetYear, targetMonthIndex, 1));
  const nextMonthStartUtc = new Date(Date.UTC(targetYear, targetMonthIndex + 1, 1));
  return { monthStartUtc, nextMonthStartUtc };
};

// ---------------------------
// Employee Stats Endpoint
// ---------------------------
router.get("/employee-stats", authMiddleware, async (req, res) => {
  try {
    const { _id: employeeId } = req.user;

    const { month, year } = req.query;
    const { monthStartUtc, nextMonthStartUtc } = getMonthRangeUtc(month, year);

    const attendanceStats = await Attendance.aggregate([
      { $match: { employeeId, date: { $gte: monthStartUtc, $lt: nextMonthStartUtc } } },
      {
        $group: {
          _id: null,
          presentDays: { $sum: { $cond: [{ $eq: ["$status", "Present"] }, 1, 0] } },
          leaveDays: { $sum: { $cond: [{ $eq: ["$status", "Leave"] }, 1, 0] } },
          wfhDaysFromAttendance: { $sum: { $cond: [{ $eq: ["$status", "WFH"] }, 1, 0] } },
          totalHours: { $sum: "$workedHours" },
          totalDays: { $sum: 1 },
        },
      },
    ]);

    const wfhStats = await WFH.aggregate([
      { $match: { user: employeeId, date: { $gte: monthStartUtc, $lt: nextMonthStartUtc } } },
      { $group: { _id: null, wfhDays: { $sum: 1 } } },
    ]);

    const stats = attendanceStats[0] || { presentDays: 0, leaveDays: 0, wfhDaysFromAttendance: 0, totalHours: 0, totalDays: 0 };
    const wfhCount = Math.max(stats.wfhDaysFromAttendance || 0, wfhStats[0]?.wfhDays || 0);
    const avgHours = stats.totalDays > 0 ? (stats.totalHours / stats.totalDays).toFixed(1) : "0.0";

    res.json({
      presentDays: stats.presentDays,
      leaveDays: stats.leaveDays,
      wfhDays: wfhCount,
      avgHours: parseFloat(avgHours),
    });
  } catch (error) {
    console.error("Error fetching employee stats:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// ---------------------------
// Admin Stats Endpoint
// ---------------------------
router.get("/overall-stats", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "admin") return res.status(403).json({ message: "Access denied. Admin role required." });

    const { month, year } = req.query;
    const { monthStartUtc, nextMonthStartUtc } = getMonthRangeUtc(month, year);

    const overallStats = await Attendance.aggregate([
      { $match: { date: { $gte: monthStartUtc, $lt: nextMonthStartUtc } } },
      {
        $group: {
          _id: null,
          totalPresentDays: { $sum: { $cond: [{ $eq: ["$status", "Present"] }, 1, 0] } },
          totalLeaveDays: { $sum: { $cond: [{ $eq: ["$status", "Leave"] }, 1, 0] } },
          totalHours: { $sum: "$workedHours" },
          totalRecords: { $sum: 1 },
        },
      },
    ]);

    const overallWFHStats = await WFH.aggregate([
      { $match: { date: { $gte: monthStartUtc, $lt: nextMonthStartUtc } } },
      { $group: { _id: null, totalWFHDays: { $sum: 1 } } },
    ]);

    const totalEmployees = (await Attendance.distinct("employeeId")).length;

    const stats = overallStats[0] || { totalPresentDays: 0, totalLeaveDays: 0, totalHours: 0, totalRecords: 0 };
    const wfhCount = overallWFHStats[0]?.totalWFHDays || 0;
    const avgHours = stats.totalRecords > 0 ? (stats.totalHours / stats.totalRecords).toFixed(1) : "0.0";

    res.json({
      totalEmployees,
      totalPresentDays: stats.totalPresentDays,
      totalLeaveDays: stats.totalLeaveDays,
      totalWFHDays: wfhCount,
      avgHours: parseFloat(avgHours),
      totalRecords: stats.totalRecords,
    });
  } catch (error) {
    console.error("Error fetching overall stats:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// ---------------------------
// Admin Summary Endpoint
// ---------------------------
router.get("/admin-summary", authMiddleware, async (req, res) => {
  try {
    if (req.user?.role !== "admin") return res.status(403).json({ message: "Access denied. Admin role required." });

    // keep the day-based logic intact; month/year are parsed to satisfy the requirement without altering semantics
    const now = new Date();
    const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const endOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
    // Parse month/year (not altering logic) to ensure endpoint accepts them
    const { month, year } = req.query;
    getMonthRangeUtc(month, year);

    const [totalEmployees, presentToday, pendingLeaveCount, pendingWFHCount, upcomingHolidayDoc, upcomingLeaves, upcomingWFH] = await Promise.all([
      User.countDocuments({ role: "employee" }),
      Attendance.countDocuments({ date: { $gte: startOfToday, $lt: endOfToday }, status: "Present" }),
      Leave.countDocuments({ status: "pending" }),
      WFH.countDocuments({ status: "pending" }),
      Holiday.findOne({ date: { $gte: startOfToday } }).sort({ date: 1 }),
      Leave.find({ status: "approved", endDate: { $gte: startOfToday } }).populate({ path: "employeeId", select: "name email employeeId role position" }).sort({ startDate: 1 }),
      WFH.find({ status: "approved", endDate: { $gte: startOfToday } }).populate({ path: "employeeId", select: "name email employeeId role position" }).sort({ startDate: 1 }),
    ]);

    const ongoingOrUpcoming = [
      ...upcomingLeaves.map(doc => ({ _id: doc._id, type: "leave", employeeId: doc.employeeId, startDate: doc.startDate, endDate: doc.endDate, reason: doc.reason })),
      ...upcomingWFH.map(doc => ({ _id: doc._id, type: "wfh", employeeId: doc.employeeId, startDate: doc.startDate, endDate: doc.endDate, reason: doc.reason })),
    ].sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

    const pendingRequests = pendingLeaveCount + pendingWFHCount;

    res.json({
      stats: {
        totalEmployees,
        presentToday,
        pendingLeaveRequests: pendingRequests,
        upcomingHoliday: upcomingHolidayDoc ? { date: upcomingHolidayDoc.date, holidayName: upcomingHolidayDoc.holidayName } : null,
      },
      ongoingOrUpcoming,
    });
  } catch (e) {
    console.error("/admin-summary error", e);
    res.status(500).json({ message: "Internal server error" });
  }
});

// ---------------------------
// Admin Performance Endpoint
// ---------------------------
router.get("/performance", authMiddleware, async (req, res) => {
  try {
    if (req.user?.role !== "admin") return res.status(403).json({ message: "Access denied. Admin role required." });

    const { month, year } = req.query;
    const { monthStartUtc, nextMonthStartUtc } = getMonthRangeUtc(month, year);

    const attendanceAgg = await Attendance.aggregate([
      { $match: { date: { $gte: monthStartUtc, $lt: nextMonthStartUtc } } },
      {
        $group: {
          _id: "$employeeId",
          totalAttendanceDays: { $sum: 1 },
          totalLeavesTaken: { $sum: { $cond: [{ $eq: ["$status", "Leave"] }, 1, 0] } },
          totalWFHDays: { $sum: { $cond: [{ $eq: ["$status", "WFH"] }, 1, 0] } },
        },
      },
    ]);

    const attendanceByEmp = new Map(attendanceAgg.map(a => [String(a._id), a]));

    const employees = await User.find({ role: "employee" }).select("name position role");

    const rows = employees.map(u => {
      const key = String(u._id);
      const att = attendanceByEmp.get(key);
      return {
        employeeId: key,
        name: u.name,
        role: u.position || u.role || "",
        totalAttendanceDays: att?.totalAttendanceDays || 0,
        totalLeavesTaken: att?.totalLeavesTaken || 0,
        totalWFHDays: att?.totalWFHDays || 0,
      };
    });

    res.json({ monthStart: monthStartUtc, rows });
  } catch (e) {
    console.error("/performance error", e);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
