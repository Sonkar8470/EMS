import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

const authMiddleware = async (req, res, next) => {
  try {
    // Get token from cookie instead of Authorization header
    const token = req.cookies.token;

    if (!token) {
      return res.status(401).json({ message: "No token, authorization denied" });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // User fetch
    req.user = await User.findById(decoded.id).select("-password");

    if (!req.user) {
      return res.status(404).json({ message: "User not found" });
    }

    next();
  } catch (error) {
    console.error(error);
    
    // Try refresh token if access token is expired
    if (error.name === "TokenExpiredError" && req.cookies.refreshToken) {
      try {
        const refreshToken = req.cookies.refreshToken;
        const decoded = jwt.verify(
          refreshToken, 
          process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET
        );
        
        // Generate new access token
        const user = await User.findById(decoded.id);
        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }
        
        const newToken = jwt.sign(
          { id: user._id, role: user.role },
          process.env.JWT_SECRET,
          { expiresIn: "1h" }
        );
        
        // Set new access token in cookie
        res.cookie("token", newToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "strict",
          maxAge: 60 * 60 * 1000, // 1 hour
        });
        
        // Add user to request and continue
        req.user = user;
        return next();
      } catch (refreshError) {
        console.error("Refresh token error:", refreshError);
        return res.status(401).json({ message: "Session expired, please login again" });
      }
    }
    
    res.status(401).json({ message: "Token is not valid" });
  }
};

export default authMiddleware;
