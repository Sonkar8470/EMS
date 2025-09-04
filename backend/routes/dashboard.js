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

// ---------------------------
// Admin Summary: quick stats and leave-today list
// ---------------------------
router.get("/admin-summary", authMiddleware, async (req, res) => {
  try {
    if (req.user?.role !== "admin") return res.status(403).json({ message: "Access denied. Admin role required." });

    const now = new Date();
    const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const endOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));

    const [totalEmployees, presentToday, pendingLeaveRequests, upcomingHolidayDoc, upcomingLeaves, upcomingWFH] = await Promise.all([
      User.countDocuments({ role: "employee" }),
      Attendance.countDocuments({ date: { $gte: startOfToday, $lt: endOfToday }, status: "Present" }),
      Leave.countDocuments({ status: "pending" }),
      Holiday.findOne({ date: { $gte: startOfToday } }).sort({ date: 1 }),
      // All approved leaves whose endDate has not passed yet (ongoing or future)
      Leave.find({ status: "approved", endDate: { $gte: startOfToday } })
        .populate({ path: "employeeId", select: "name email employeeId role position" })
        .sort({ startDate: 1 }),
      // All approved WFH whose endDate has not passed yet (ongoing or future)
      WFH.find({ status: "approved", endDate: { $gte: startOfToday } })
        .populate({ path: "employeeId", select: "name email employeeId role position" })
        .sort({ startDate: 1 })
    ]);

    const ongoingOrUpcoming = [
      ...upcomingLeaves.map((doc) => ({
        _id: doc._id,
        type: "leave",
        employeeId: doc.employeeId,
        startDate: doc.startDate,
        endDate: doc.endDate,
        reason: doc.reason,
      })),
      ...upcomingWFH.map((doc) => ({
        _id: doc._id,
        type: "wfh",
        employeeId: doc.employeeId,
        startDate: doc.startDate,
        endDate: doc.endDate,
        reason: doc.reason,
      })),
    ].sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

    res.json({
      stats: {
        totalEmployees,
        presentToday,
        pendingLeaveRequests,
        upcomingHoliday: upcomingHolidayDoc
          ? {
              date: upcomingHolidayDoc.date,
              holidayName: upcomingHolidayDoc.holidayName,
            }
          : null,
      },
      ongoingOrUpcoming,
    });
  } catch (e) {
    console.error("/admin-summary error", e);
    res.status(500).json({ message: "Internal server error" });
  }
});

// ---------------------------
// Admin Performance: per-employee aggregates for current month
// ---------------------------
router.get("/performance", authMiddleware, async (req, res) => {
  try {
    if (req.user?.role !== "admin") return res.status(403).json({ message: "Access denied. Admin role required." });

    const now = new Date();
    const monthStartUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const nextMonthStartUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));

    // Aggregate attendance by employee for current month
    const attendanceAgg = await Attendance.aggregate([
      {
        $match: {
          date: { $gte: monthStartUtc, $lt: nextMonthStartUtc },
        },
      },
      {
        $group: {
          _id: "$employeeId",
          totalAttendanceDays: { $sum: 1 },
          presentDays: { $sum: { $cond: [{ $eq: ["$status", "Present"] }, 1, 0] } },
          leaveDaysFromAttendance: { $sum: { $cond: [{ $eq: ["$status", "Leave"] }, 1, 0] } },
          wfhDaysFromAttendance: { $sum: { $cond: [{ $eq: ["$status", "WFH"] }, 1, 0] } },
        },
      },
    ]);

    // Leaves in month (by overlap with month window)
    const leavesAgg = await Leave.aggregate([
      {
        $match: {
          status: "approved",
          endDate: { $gte: monthStartUtc },
          startDate: { $lt: nextMonthStartUtc },
        },
      },
      {
        $project: {
          employeeId: 1,
          // approximate days in month window
          days: {
            $add: [
              1,
              {
                $dateDiff: {
                  startDate: { $cond: [{ $gt: ["$startDate", monthStartUtc] }, "$startDate", monthStartUtc] },
                  endDate: { $cond: [{ $lt: ["$endDate", nextMonthStartUtc] }, "$endDate", nextMonthStartUtc] },
                  unit: "day",
                },
              },
            ],
          },
        },
      },
      { $group: { _id: "$employeeId", totalLeaveDays: { $sum: "$days" } } },
    ]);

    // WFH in month (by overlap with month window)
    const wfhAgg = await WFH.aggregate([
      {
        $match: {
          status: "approved",
          endDate: { $gte: monthStartUtc },
          startDate: { $lt: nextMonthStartUtc },
        },
      },
      {
        $project: {
          employeeId: 1,
          days: {
            $add: [
              1,
              {
                $dateDiff: {
                  startDate: { $cond: [{ $gt: ["$startDate", monthStartUtc] }, "$startDate", monthStartUtc] },
                  endDate: { $cond: [{ $lt: ["$endDate", nextMonthStartUtc] }, "$endDate", nextMonthStartUtc] },
                  unit: "day",
                },
              },
            ],
          },
        },
      },
      { $group: { _id: "$employeeId", totalWFHDays: { $sum: "$days" } } },
    ]);

    // Index by employeeId
    const attendanceByEmp = new Map(attendanceAgg.map((a) => [String(a._id), a]));
    const leavesByEmp = new Map(leavesAgg.map((l) => [String(l._id), l]));
    const wfhByEmp = new Map(wfhAgg.map((w) => [String(w._id), w]));

    // Build list for all employees (role employee)
    const employees = await User.find({ role: "employee" }).select("name position role");

    const rows = employees.map((u) => {
      const key = String(u._id);
      const att = attendanceByEmp.get(key);
      const leave = leavesByEmp.get(key);
      const wfh = wfhByEmp.get(key);
      return {
        employeeId: key,
        name: u.name,
        role: u.position || u.role || "",
        totalAttendanceDays: att?.totalAttendanceDays || 0,
        totalLeavesTaken: leave?.totalLeaveDays || att?.leaveDaysFromAttendance || 0,
        totalWFHDays: wfh?.totalWFHDays || att?.wfhDaysFromAttendance || 0,
      };
    });

    res.json({ monthStart: monthStartUtc, rows });
  } catch (e) {
    console.error("/performance error", e);
    res.status(500).json({ message: "Internal server error" });
  }
});
