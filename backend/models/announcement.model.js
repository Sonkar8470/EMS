import mongoose from "mongoose";

const announcementSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    pinned: { type: Boolean, default: false },
    startsAt: { type: Date },
    endsAt: { type: Date },
  },
  { timestamps: true }
);

announcementSchema.index({ pinned: -1, createdAt: -1 });

const Announcement = mongoose.model("Announcement", announcementSchema);
export default Announcement;


