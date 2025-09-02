import mongoose from "mongoose";
import User from '../models/user.model.js';

const attendanceSchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref:"User",
    required: true,
  },
  date: {
    type: Date, // stored as date-only (00:00:00 UTC)
    required: true,
  },
  status: {
    type: String,
    enum: ["Present", "Absent", "Leave", "WFH", "Holiday", "W/O"],
    default: "Present",
  },
  inTime: {
    type: String,
  },
  outTime: {
    type: String,
  },
  workedHours: {
    type: Number, // total worked hours
  },
  location: {
    latitude: Number,
    longitude: Number,
  },
});

// Add indexes for better query performance
attendanceSchema.index({ employeeId: 1, date: 1 });
attendanceSchema.index({ date: 1, status: 1 });

const Attendance = mongoose.model("Attendance", attendanceSchema);
export default Attendance;
