import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import Attendance from "../models/attendance.model.js";
import WFH from "../models/wfh.model.js";

const router = express.Router();



const startOfDayUtc = (dateInput) => {
  const d = dateInput ? new Date(dateInput) : new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
};

// Employee Stats Endpoint - Only accessible to authenticated employees
router.get("/employee-stats", authMiddleware, async (req, res) => {
  try {
    const { _id: employeeId, role } = req.user;
    
    // Current month boundaries in UTC [start, nextStart)
    const now = new Date();
    const monthStartUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const nextMonthStartUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));

    // Fresh attendance stats for current month
    const attendanceStats = await Attendance.aggregate([
      {
        $match: {
          employeeId: employeeId,
          date: { $gte: monthStartUtc, $lt: nextMonthStartUtc }
        }
      },
      {
        $group: {
          _id: null,
          presentDays: {
            $sum: { $cond: [{ $eq: ["$status", "Present"] }, 1, 0] }
          },
          leaveDays: {
            $sum: { $cond: [{ $eq: ["$status", "Leave"] }, 1, 0] }
          },
          wfhDaysFromAttendance: {
            $sum: { $cond: [{ $eq: ["$status", "WFH"] }, 1, 0] }
          },
          totalHours: { $sum: "$workedHours" },
          totalDays: { $sum: 1 }
        }
      }
    ]);
    
    // WFH requests in current month (if model used for tracking days)
    const wfhStats = await WFH.aggregate([
      {
        $match: {
          user: employeeId,
          date: { $gte: monthStartUtc, $lt: nextMonthStartUtc }
        }
      },
      {
        $group: {
          _id: null,
          wfhDays: { $sum: 1 }
        }
      }
    ]);
    
    // Calculate averages and format response
    const stats = attendanceStats[0] || { presentDays: 0, leaveDays: 0, wfhDaysFromAttendance: 0, totalHours: 0, totalDays: 0 };
    const wfhCount = Math.max(stats.wfhDaysFromAttendance || 0, wfhStats[0]?.wfhDays || 0);
    
    const avgHours = stats.totalDays > 0 ? (stats.totalHours / stats.totalDays).toFixed(1) : "0.0";
    
    const response = {
      presentDays: stats.presentDays,
      leaveDays: stats.leaveDays,
      wfhDays: wfhCount,
      avgHours: parseFloat(avgHours)
    };
    
    res.json(response);
  } catch (error) {
    console.error("Error fetching employee stats:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Admin Stats Endpoint - Only accessible to admins
router.get("/overall-stats", authMiddleware, async (req, res) => {
  try {
    const { role } = req.user;
    
    if (role !== "admin") {
      return res.status(403).json({ message: "Access denied. Admin role required." });
    }
    
    // Get current month and year
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    // Calculate start and end of current month
    const startOfMonth = new Date(currentYear, currentMonth, 1);
    const endOfMonth = new Date(currentYear, currentMonth + 1, 0);
    
    // Format dates for attendance query
    const startDateStr = startOfMonth.toISOString().split('T')[0];
    const endDateStr = endOfMonth.toISOString().split('T')[0];
    
    // Get overall stats for all employees
    const overallStats = await Attendance.aggregate([
      {
        $match: {
          date: { $gte: startDateStr, $lte: endDateStr }
        }
      },
      {
        $group: {
          _id: null,
          totalPresentDays: {
            $sum: { $cond: [{ $eq: ["$status", "Present"] }, 1, 0] }
          },
          totalLeaveDays: {
            $sum: { $cond: [{ $eq: ["$status", "Leave"] }, 1, 0] }
          },
          totalHours: { $sum: "$workedHours" },
          totalRecords: { $sum: 1 }
        }
      }
    ]);
    
    // Get overall WFH stats
    const overallWFHStats = await WFH.aggregate([
      {
        $match: {
          date: { $gte: startOfMonth, $lte: endOfMonth }
        }
      },
      {
        $group: {
          _id: null,
          totalWFHDays: { $sum: 1 }
        }
      }
    ]);
    
    // Get total employee count
    const totalEmployees = (await Attendance.distinct("employeeId")).length;
    
    const stats = overallStats[0] || { totalPresentDays: 0, totalLeaveDays: 0, totalHours: 0, totalRecords: 0 };
    const wfhCount = overallWFHStats[0]?.totalWFHDays || 0;
    
    const avgHours = stats.totalRecords > 0 ? (stats.totalHours / stats.totalRecords).toFixed(1) : "0.0";
    
    const response = {
      totalEmployees,
      totalPresentDays: stats.totalPresentDays,
      totalLeaveDays: stats.totalLeaveDays,
      totalWFHDays: wfhCount,
      avgHours: parseFloat(avgHours),
      totalRecords: stats.totalRecords
    };
    
    res.json(response);
  } catch (error) {
    console.error("Error fetching overall stats:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
