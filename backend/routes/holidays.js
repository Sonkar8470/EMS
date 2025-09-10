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

// GET /holidays/upcoming -> next N upcoming holidays (default 3)
router.get("/upcoming", authMiddleware, async (req, res) => {
  try {
    const limit = Math.max(1, Math.min(10, parseInt(String(req.query.limit || "3"), 10) || 3));
    const now = new Date();
    const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const holidays = await Holiday.find({ applicable: true, date: { $gte: startOfToday } })
      .sort({ date: 1 })
      .limit(limit);
    res.json(
      holidays.map((h) => ({
        id: h._id,
        date: h.date,
        holidayName: h.holidayName,
        day: h.day,
      }))
    );
  } catch (err) {
    console.error("Error fetching upcoming holidays:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// POST /holidays/seed -> admin can insert predefined holiday JSON for 2025
router.post("/seed", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "admin" && req.user.role !== "hr") {
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

// DELETE /holidays/:id -> mark holiday as not applicable (unmark)
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "admin" && req.user.role !== "hr") {
      return res.status(403).json({ message: "Forbidden" });
    }
    const { id } = req.params;
    // Set applicable=false instead of deleting
    const doc = await Holiday.findByIdAndUpdate(id, { $set: { applicable: false } }, { new: true });
    if (!doc) return res.status(404).json({ message: "Not found" });
    try {
      const io = req.app.get("io");
      if (io) io.emit("holidayUpdated");
    } catch {}
    res.json({ message: "Holiday unmarked", id });
  } catch (err) {
    console.error("Error unmarking holiday:", err);
    res.status(500).json({ message: "Server error" });
  }
});
