import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "./models/user.model.js";

dotenv.config({ path: "config.env" });

const DB = process.env.DATABASE;

async function assignEmployeeIds() {
  try {
    // Connect to MongoDB
    await mongoose.connect(DB);
    console.log("✅ MongoDB Connected");

    // Find all employees without employee IDs
    const employeesWithoutId = await User.find({ 
      role: "employee", 
      $or: [{ employeeId: { $exists: false } }, { employeeId: null }] 
    });

    console.log(`Found ${employeesWithoutId.length} employees without employee IDs`);

    if (employeesWithoutId.length === 0) {
      console.log("All employees already have IDs!");
      process.exit(0);
    }

    let assignedCount = 0;
    for (const employee of employeesWithoutId) {
      try {
        // Generate next available employee ID
        const nextId = await User.getNextEmployeeId();
        employee.employeeId = nextId;
        await employee.save();
        assignedCount++;
        console.log(`✅ Assigned ${nextId} to ${employee.name}`);
      } catch (err) {
        console.error(`❌ Error assigning ID to ${employee.name}:`, err);
      }
    }

    console.log(`\n🎉 Successfully assigned employee IDs to ${assignedCount} employees`);
    
    // Show all employees with their IDs
    const allEmployees = await User.find({ role: "employee" }).select("name email employeeId");
    console.log("\n📋 All Employees with IDs:");
    allEmployees.forEach(emp => {
      console.log(`   ${emp.employeeId || "Pending"} - ${emp.name} (${emp.email})`);
    });

  } catch (err) {
    console.error("❌ Error:", err);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 MongoDB Disconnected");
    process.exit(0);
  }
}

// Run the script
assignEmployeeIds();
