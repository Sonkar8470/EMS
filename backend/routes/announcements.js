import express from "express";
import auth from "../middleware/authMiddleware.js";
import Announcement from "../models/announcement.model.js";

const router = express.Router();

// List announcements (active first)
router.get("/", auth, async (req, res) => {
  try {
    const now = new Date();
    const items = await Announcement.find({
      $and: [
        { $or: [{ startsAt: { $exists: false } }, { startsAt: null }, { startsAt: { $lte: now } }] },
        { $or: [{ endsAt: { $exists: false } }, { endsAt: null }, { endsAt: { $gte: now } }] },
      ],
    })
      .populate({ path: "createdBy", select: "name email employeeId" })
      .sort({ pinned: -1, createdAt: -1 });

    res.json(items);
  } catch (e) {
    console.error("[announcements] list error", e);
    res.status(500).json({ message: "Server error" });
  }
});

// Create announcement (admin or HR)
router.post("/", auth, async (req, res) => {
  try {
    if (req.user?.role !== "admin" && req.user?.role !== "hr") return res.status(403).json({ message: "Admin/HR access required" });
    const { title, message, pinned, startsAt, endsAt } = req.body || {};
    if (!title || !message) return res.status(400).json({ message: "title and message are required" });

    const created = await Announcement.create({
      title,
      message,
      pinned: !!pinned,
      startsAt: startsAt ? new Date(startsAt) : undefined,
      endsAt: endsAt ? new Date(endsAt) : undefined,
      createdBy: req.user._id,
    });

    const doc = await created.populate({ path: "createdBy", select: "name email employeeId" });
    try {
      const io = req.app.get("io");
      if (io) io.emit("announcementCreated", doc);
    } catch {}
    res.status(201).json({ message: "Announcement created", announcement: doc });
  } catch (e) {
    console.error("[announcements] create error", e);
    res.status(500).json({ message: "Server error" });
  }
});

// Update announcement (admin or HR)
router.put("/:id", auth, async (req, res) => {
  try {
    if (req.user?.role !== "admin" && req.user?.role !== "hr") return res.status(403).json({ message: "Admin/HR access required" });
    const { id } = req.params;
    const { title, message, pinned, startsAt, endsAt } = req.body || {};
    const updated = await Announcement.findByIdAndUpdate(
      id,
      {
        $set: {
          ...(title !== undefined ? { title } : {}),
          ...(message !== undefined ? { message } : {}),
          ...(pinned !== undefined ? { pinned: !!pinned } : {}),
          ...(startsAt !== undefined ? { startsAt: startsAt ? new Date(startsAt) : undefined } : {}),
          ...(endsAt !== undefined ? { endsAt: endsAt ? new Date(endsAt) : undefined } : {}),
        },
      },
      { new: true }
    ).populate({ path: "createdBy", select: "name email employeeId" });
    if (!updated) return res.status(404).json({ message: "Announcement not found" });

    try {
      const io = req.app.get("io");
      if (io) io.emit("announcementUpdated", updated);
    } catch {}
    res.json({ message: "Announcement updated", announcement: updated });
  } catch (e) {
    console.error("[announcements] update error", e);
    res.status(500).json({ message: "Server error" });
  }
});

// Delete announcement (admin or HR)
router.delete("/:id", auth, async (req, res) => {
  try {
    if (req.user?.role !== "admin" && req.user?.role !== "hr") return res.status(403).json({ message: "Admin/HR access required" });
    const { id } = req.params;
    const found = await Announcement.findById(id);
    if (!found) return res.status(404).json({ message: "Announcement not found" });
    await Announcement.deleteOne({ _id: id });
    try {
      const io = req.app.get("io");
      if (io) io.emit("announcementDeleted", { _id: id });
    } catch {}
    res.json({ message: "Announcement deleted" });
  } catch (e) {
    console.error("[announcements] delete error", e);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;


