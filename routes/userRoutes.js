import express from "express";
import User from "../models/user.model.js";
import crypto from "crypto";

const router = express.Router();

// POST /api/users/signup
router.post("/signup", async (req, res) => {
  try {
    const { name, email, password, mobile, role, address } = req.body;

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
    });

    res.status(201).json({
      message: "Signup successful",
      user: {
        ...user.toObject(),
        id: user._id, // Add id field for frontend compatibility
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

// POST /api/users/login
import jwt from "jsonwebtoken";

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password required" });
  }

  try {
    // Include password because select:false in schema
    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // Compare password (hash verify)
    const isMatch = await user.correctPassword(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // 🔑 Token generate karo
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET, // isko .env file me rakho
      { expiresIn: "1h" }
    );
    
    // Generate refresh token with longer expiry
    const refreshToken = jwt.sign(
      { id: user._id },
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Hide password before sending
    user.password = undefined;
    
    // Set HTTP-only cookies for better security
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // Only use HTTPS in production
      sameSite: "strict",
      maxAge: 60 * 60 * 1000, // 1 hour in milliseconds
    });
    
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
    });

    res.status(200).json({
      message: "Login successful ✅",
      user: {
        ...user.toObject(),
        id: user._id, // Add id field for frontend compatibility
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error ❌" });
  }
});


// GET /api/users - Fetch all users (protected route)
router.get("/", async (req, res) => {
  try {
    console.log("GET /api/users - Fetching all users...");
    
    // Fetch all users but exclude password field
    const users = await User.find({}).select("-password");
    
    console.log(`GET /api/users - Found ${users.length} users`);
    
    // Map _id to id for frontend compatibility
    const usersWithId = users.map(user => ({
      ...user.toObject(),
      id: user._id
    }));
    
    res.json(usersWithId);
  } catch (err) {
    console.error("GET /api/users - Error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/users/:id - Fetch specific user by ID
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`GET /api/users/${id} - Fetching user...`);
    
    const user = await User.findById(id).select("-password");
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    console.log(`GET /api/users/${id} - User found:`, user.name);
    
    // Map _id to id for frontend compatibility
    const userWithId = {
      ...user.toObject(),
      id: user._id
    };
    
    res.json(userWithId);
  } catch (err) {
    console.error(`GET /api/users/${req.params.id} - Error:`, err);
    res.status(500).json({ message: "Server error" });
  }
});

// routes/userRoutes.js

// Logout route to clear cookies
router.post("/logout", (req, res) => {
  // Clear both token cookies
  res.cookie("token", "", {
    httpOnly: true,
    expires: new Date(0), // Expire immediately
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
  });
  
  res.cookie("refreshToken", "", {
    httpOnly: true,
    expires: new Date(0), // Expire immediately
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
  });
  
  res.status(200).json({ message: "Logged out successfully" });
});

// Request password reset
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: "Email required" });

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    // Generate token
    const resetToken = crypto.randomBytes(20).toString("hex");
    const resetExpire = Date.now() + 15 * 60 * 1000; // 15 minutes

    user.passwordResetToken = resetToken;
    user.passwordResetExpires = resetExpire;
    await user.save();

    // In production, send email. Here, just return token for testing
    res.status(200).json({
      message: "Password reset token generated",
      resetToken,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Reset password
router.post("/reset-password", async (req, res) => {
  const { email, token, newPassword } = req.body;
  if (!email || !token || !newPassword)
    return res.status(400).json({ message: "All fields required" });

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
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});


export default router;


