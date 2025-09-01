import mongoose from "mongoose";

const wfhSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // linking with User schema
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    reason: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

// ✅ Static method to check WFH limit per month
wfhSchema.statics.canApplyWFH = async function (userId, date) {
  const month = date.getMonth();
  const year = date.getFullYear();

  const count = await this.countDocuments({
    user: userId,
    date: {
      $gte: new Date(year, month, 1), // start of month
      $lte: new Date(year, month + 1, 0), // end of month
    },
  });

  return count < 4; // allow only if less than 4
};

const WFH = mongoose.model("WFH", wfhSchema);
export default WFH;
