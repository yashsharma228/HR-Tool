require("dotenv").config();
const connectDB = require("../config/db");
const User = require("../models/User");
const Admin = require("../models/Admin");

const seedAdmin = async () => {
  try {
    await connectDB();

    const adminEmail = (process.env.ADMIN_EMAIL || "admin@hrtool.com").toLowerCase().trim();
    const adminPassword = process.env.ADMIN_PASSWORD || "Admin@123";
    const adminName = process.env.ADMIN_NAME || "System Admin";

    // Check if admin exists in the Admin collection.
    const existing = await Admin.findOne({ email: adminEmail });
    if (existing) {
      existing.name = adminName;
      existing.password = adminPassword; // Model pre-save hook hashes it
      existing.role = "admin";
      if (!existing.dateOfJoining) {
        existing.dateOfJoining = new Date();
      }
      await existing.save();
      console.log(`Admin credentials synced in Admin collection: ${existing.email}`);
      process.exit(0);
    }

    // Remove legacy admin in User collection to keep admin data in one place.
    await User.deleteOne({ email: adminEmail, role: "admin" });

    const admin = await Admin.create({
      name: adminName,
      email: adminEmail,
      password: adminPassword, // Model will hash this on save
      role: "admin",
      dateOfJoining: new Date(),
    });

    console.log(`Admin created in Admin collection: ${admin.email}`);
    process.exit(0);
  } catch (error) {
    console.error("Failed to seed admin:", error.message);
    process.exit(1);
  }
};

seedAdmin();
