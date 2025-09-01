import Attendance from "../models/attendance.model";

export const checkOut = async (req, res) => {
  try {
    const { employeeId } = req.body;
    const today = new Date().toISOString().split("T")[0];

    // ✅ Find today's check-in record
    const record = await Attendance.findOne({ employeeId, date: today });

    if (!record) {
      return res.status(400).json({ message: "No check-in found for today" });
    }

    if (record.outTime) {
      return res.status(400).json({ message: "Already checked out today" });
    }

    if (!record.inTime) {
      return res.status(400).json({ message: "No check-in time found" });
    }

    // ✅ Convert inTime to Date for calculation
    const checkInTime = new Date(`${today}T${record.inTime}`);
    const now = new Date();

    const workedHours = (now - checkInTime) / (1000 * 60 * 60); // difference in hours

    // Users can check out anytime after checking in (no 9-hour restriction)

    // ✅ Allow checkout
    record.outTime = now.toLocaleTimeString();
    record.workedHours = workedHours.toFixed(2);
    await record.save();

    res.status(200).json({
      message: "Check-out successful",
      record,
    });
  } catch (err) {
    res.status(500).json({ message: "Error during check-out", error: err.message });
  }
};
