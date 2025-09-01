import mongoose from "mongoose";
import User from '../models/user.model.js';
const attendanceSchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref:"User",
    required: true,
  },
  date: {
    type: String, // YYYY-MM-DD
    required: true,
  },
  status: {
    type: String,
    enum: ["Present", "Leave"],
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


const Attendance = mongoose.model("Attendance", attendanceSchema);
export default Attendance;
