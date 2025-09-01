import mongoose from "mongoose";
import bcrypt from "bcrypt";

const userSchema = new mongoose.Schema(
  {
    employeeId: {
      type: String,
      unique: true,
      sparse: true, // Allows null/undefined values
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email address"],
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
      select: false,
      match: [
        /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,}$/,
        "Password must start with a capital letter, include at least one number, and one special character",
      ],
    },

    role: {
      type: String,
      enum: ["admin", "employee"],
      default: "employee",
    },
    mobile: {
      type: String,
      required: true,
      match: [/^[0-9]{10}$/, "Please enter a valid 10-digit mobile number"],
    },
    address: {
      type: String,
      trim: true,
    },
    passwordResetToken: String,
    passwordResetExpires: Date,
  },
  { timestamps: true }
);

// ✅ Generate employee ID before saving
userSchema.pre("save", async function (next) {
  // Only generate employee ID for new employees (not admins)
  if (this.isNew && this.role === "employee" && !this.employeeId) {
    try {
      // Get current year
      const currentYear = new Date().getFullYear();
      
      // Find the highest employee ID for this year
      const lastEmployee = await this.constructor.findOne(
        { 
          employeeId: { $regex: `^${currentYear}-` },
          role: "employee"
        },
        {},
        { sort: { employeeId: -1 } }
      );
      
      let sequence = 1;
      if (lastEmployee && lastEmployee.employeeId) {
        // Extract sequence number from last employee ID (e.g., "2025-001" -> 1)
        const lastSequence = parseInt(lastEmployee.employeeId.split('-')[1]);
        sequence = lastSequence + 1;
      }
      
      // Format: YYYY-XXX (e.g., 2025-001, 2025-002)
      this.employeeId = `${currentYear}-${sequence.toString().padStart(3, '0')}`;
      
      console.log(`Generated Employee ID: ${this.employeeId} for ${this.name}`);
    } catch (error) {
      console.error("Error generating employee ID:", error);
      // Fallback: use timestamp-based ID
      this.employeeId = `EMP-${Date.now()}`;
    }
  }
  
  // Hash password if modified
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// ✅ Compare password during login
userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

// ✅ Get next employee ID
userSchema.statics.getNextEmployeeId = async function () {
  const currentYear = new Date().getFullYear();
  
  const lastEmployee = await this.findOne(
    { 
      employeeId: { $regex: `^${currentYear}-` },
      role: "employee"
    },
    {},
    { sort: { employeeId: -1 } }
  );
  
  let sequence = 1;
  if (lastEmployee && lastEmployee.employeeId) {
    const lastSequence = parseInt(lastEmployee.employeeId.split('-')[1]);
    sequence = lastSequence + 1;
  }
  
  return `${currentYear}-${sequence.toString().padStart(3, '0')}`;
};

const User = mongoose.model("User", userSchema);
export default User;
