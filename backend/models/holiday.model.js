import mongoose from "mongoose";

const holidaySchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
    unique: true,
  },
  holidayName: {
    type: String,
    required: true,
    trim: true,
  },
  day: {
    type: String,
    trim: true,
  },
  applicable: {
    type: Boolean,
    default: true,
  },
});

holidaySchema.index({ date: 1 }, { unique: true });

const Holiday = mongoose.model("Holiday", holidaySchema);
export default Holiday;


