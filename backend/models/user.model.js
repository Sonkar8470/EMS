import mongoose from "mongoose";
import bcrypt from "bcrypt";

const userSchema = new mongoose.Schema(
  {
    employeeId: {
      type: String,
      unique: true,
      sparse: true, // Allows null/undefined values
    },
    joiningDate: {
      type: Date,
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
      enum: ["admin", "hr", "employee"],
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
    position: {
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
  try {
    // Only generate employee ID for new employees (not admins)
    if (this.isNew && this.role === "employee" && !this.employeeId) {
      const currentYear = new Date().getFullYear();

      let sequence = 1;
      let newEmployeeId = "";

      while (true) {
        // Find the last employee for this year
        const lastEmployee = await this.constructor.findOne(
          { employeeId: { $regex: `^${currentYear}-` }, role: "employee" },
          {},
          { sort: { employeeId: -1 } }
        );

        if (lastEmployee && lastEmployee.employeeId) {
          const lastSequence = parseInt(lastEmployee.employeeId.split("-")[1]);
          sequence = lastSequence + 1;
        }

        newEmployeeId = `${currentYear}-${sequence.toString().padStart(3, "0")}`;

        // Check if it already exists
        const exists = await this.constructor.findOne({ employeeId: newEmployeeId });
        if (!exists) break; // ✅ Found a unique ID

        sequence++; // retry with next number
      }

      this.employeeId = newEmployeeId;
      console.log(`Generated Employee ID: ${this.employeeId} for ${this.name}`);
    }

    // Hash password if modified
    if (this.isModified("password")) {
      this.password = await bcrypt.hash(this.password, 12);
    }

    next();
  } catch (error) {
    console.error("Error generating employee ID:", error);
    this.employeeId = `EMP-${Date.now()}`;
    next();
  }
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
