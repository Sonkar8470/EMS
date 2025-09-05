import express from "express";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import User from "../models/user.model.js";

const router = express.Router();

// --- Helper: Validate MongoDB ID ---
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// --- Signup Route ---
router.post("/signup", async (req, res) => {
  try {
    const { name, email, password, mobile, role, address, joiningDate, position } = req.body;

    const exists = await User.findOne({ $or: [{ email }, { mobile }] });
    if (exists) {
      return res.status(400).json({ message: "User with this email or mobile already exists" });
    }

    const user = await User.create({
      name,
      email,
      password,
      mobile,
      role: role || "employee",
      address,
      position,
      joiningDate: joiningDate ? new Date(joiningDate) : undefined,
    });

    res.status(201).json({
      message: "Signup successful",
      user: {
        ...user.toObject(),
        id: user._id,
        employeeId: user.employeeId || "Pending",
      },
    });
  } catch (err) {
    if (err?.code === 11000) {
      const key = Object.keys(err.keyPattern ?? {})[0] || "field";
      return res.status(400).json({ message: `Duplicate ${key}. Please use a different one.` });
    }
    console.error("Signup error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// --- Login Route ---
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) return res.status(400).json({ message: "Email and password required" });

  try {
    const user = await User.findOne({ email }).select("+password");
    if (!user || !(await user.correctPassword?.(password, user.password))) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    const refreshToken = jwt.sign({ id: user._id }, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    user.password = undefined;

    res
      .cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 60 * 60 * 1000,
      })
      .cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

    res.status(200).json({
      message: "Login successful ✅",
      token,
      user: {
        ...user.toObject(),
        id: user._id,
        employeeId: user.employeeId || "Pending",
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// --- Next Employee ID ---
router.get("/next-employee-id", async (req, res) => {
  try {
    const nextId = User.getNextEmployeeId ? await User.getNextEmployeeId() : `2025-${(await User.countDocuments()) + 1}`;
    res.json({ nextEmployeeId: nextId });
  } catch (err) {
    console.error("Get next ID error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// --- Get All Users ---
router.get("/", async (req, res) => {
  try {
    const users = await User.find({}).select("-password");
    res.json(users.map(u => ({ ...u.toObject(), id: u._id, employeeId: u.employeeId || "Pending" })));
  } catch (err) {
    console.error("Get all users error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// --- Get One User ---
router.get("/:id", async (req, res) => {
  const { id } = req.params;
  if (!isValidObjectId(id)) return res.status(400).json({ message: "Invalid user ID" });

  try {
    const user = await User.findById(id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({ ...user.toObject(), id: user._id, employeeId: user.employeeId || "Pending" });
  } catch (err) {
    console.error("Get user by ID error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// --- Update User ---
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { name, email, mobile, role, address, position, joiningDate } = req.body;

  if (!isValidObjectId(id)) return res.status(400).json({ message: "Invalid user ID" });

  try {
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (email && email !== user.email && await User.findOne({ email, _id: { $ne: id } })) {
      return res.status(400).json({ message: "Email already in use" });
    }

    if (mobile && mobile !== user.mobile && await User.findOne({ mobile, _id: { $ne: id } })) {
      return res.status(400).json({ message: "Mobile number already in use" });
    }

    Object.assign(user, { name, email, mobile, role, address, position });
    if (joiningDate !== undefined) {
      user.joiningDate = joiningDate ? new Date(joiningDate) : undefined;
    }
    await user.save();

    const updatedUser = user.toObject();
    delete updatedUser.password;

    try {
      const io = req.app.get("io");
      if (io) io.to(String(user._id)).emit("employeeUpdated", { employeeId: String(user._id) });
    } catch {}
    res.json({ message: "User updated successfully", user: { ...updatedUser, id: user._id } });
  } catch (err) {
    console.error("Update user error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// --- Delete User ---
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  if (!isValidObjectId(id)) return res.status(400).json({ message: "Invalid user ID" });

  try {
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: "User not found" });

    await User.findByIdAndDelete(id);
    res.json({ message: "User deleted successfully" });
  } catch (err) {
    console.error("Delete user error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// --- Logout ---
router.post("/logout", (req, res) => {
  res
    .cookie("token", "", { httpOnly: true, expires: new Date(0), sameSite: "strict", secure: process.env.NODE_ENV === "production" })
    .cookie("refreshToken", "", { httpOnly: true, expires: new Date(0), sameSite: "strict", secure: process.env.NODE_ENV === "production" })
    .status(200).json({ message: "Logged out successfully" });
});

// --- Forgot Password ---
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: "Email required" });

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    const resetToken = crypto.randomBytes(20).toString("hex");
    user.passwordResetToken = resetToken;
    user.passwordResetExpires = Date.now() + 15 * 60 * 1000;
    await user.save();

    res.status(200).json({ message: "Token generated", resetToken });
  } catch (err) {
    console.error("Forgot password error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// --- Reset Password ---
router.post("/reset-password", async (req, res) => {
  const { email, token, newPassword } = req.body;
  if (!email || !token || !newPassword) return res.status(400).json({ message: "All fields required" });

  try {
    const user = await User.findOne({
      email,
      passwordResetToken: token,
      passwordResetExpires: { $gt: Date.now() },
    }).select("+password");

    if (!user) return res.status(400).json({ message: "Invalid or expired token" });

    user.password = newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    res.status(200).json({ message: "Password reset successful ✅" });
  } catch (err) {
    console.error("Reset password error:", err);
    res.status(500).json({ message: "Server error" });
  }
});


export default router;
