import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import Holiday from "../models/holiday.model.js";

const router = express.Router();

// GET /holidays -> return full list
router.get("/", authMiddleware, async (_req, res) => {
  try {
    const holidays = await Holiday.find({ applicable: true }).sort({ date: 1 });
    res.json(
      holidays.map((h) => ({
        id: h._id,
        date: h.date.toISOString().split("T")[0],
        holidayName: h.holidayName,
        day: h.day,
        applicable: h.applicable,
      }))
    );
  } catch (err) {
    console.error("Error fetching holidays:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// POST /holidays/seed -> admin can insert predefined holiday JSON for 2025
router.post("/seed", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Forbidden" });
    }

    const payload = req.body;
    if (!Array.isArray(payload)) {
      return res.status(400).json({ message: "Expected an array of holidays" });
    }

    let upserted = 0;
    for (const item of payload) {
      if (!item?.date || !item?.holidayName) continue;
      const dateOnly = new Date(item.date);
      // Upsert by date
      const resu = await Holiday.updateOne(
        { date: new Date(Date.UTC(dateOnly.getUTCFullYear(), dateOnly.getUTCMonth(), dateOnly.getUTCDate())) },
        {
          $set: {
            holidayName: item.holidayName,
            day: item.day || undefined,
            applicable: item.applicable !== undefined ? !!item.applicable : true,
            date: new Date(Date.UTC(dateOnly.getUTCFullYear(), dateOnly.getUTCMonth(), dateOnly.getUTCDate())),
          },
        },
        { upsert: true }
      );
      if (resu.upsertedCount || resu.modifiedCount) upserted++;
    }

    const count = await Holiday.countDocuments({ applicable: true });
    try {
      const io = req.app.get("io");
      if (io) io.emit("holidayUpdated");
    } catch {}
    res.json({ message: "Holidays seeded", upserted, total: count });
  } catch (err) {
    console.error("Error seeding holidays:", err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;


