require("dotenv").config();
const connectDB = require("../config/db");
const User = require("../models/User");
const Admin = require("../models/Admin");
const { sendWelcomeEmail } = require("../utils/emailService");

const seedAdmin = async () => {
  try {
    await connectDB();

    const adminEmail = (process.env.ADMIN_EMAIL || "admin@hrtool.com").toLowerCase().trim();
    const adminPassword = process.env.ADMIN_PASSWORD || "Admin@123";
    const adminName = process.env.ADMIN_NAME || "System Admin";

    // Check if admin exists in the Admin collection.
    let admin = await Admin.findOne({ email: adminEmail });
    if (admin) {
      admin.name = adminName;
      admin.password = adminPassword; // Model pre-save hook hashes it
      admin.role = "admin";
      if (!admin.dateOfJoining) {
        admin.dateOfJoining = new Date();
      }
      await admin.save();
      console.log(`Admin credentials synced in Admin collection: ${admin.email}`);
    } else {
      // Remove legacy admin in User collection to keep admin data in one place.
      await User.deleteOne({ email: adminEmail, role: "admin" });

      admin = await Admin.create({
        name: adminName,
        email: adminEmail,
        password: adminPassword, // Model will hash this on save
        role: "admin",
        dateOfJoining: new Date(),
      });
      console.log(`Admin created in Admin collection: ${admin.email}`);
    }

    // Always send welcome email when seeding/syncing admin
    console.log(`Sending welcome email to admin: ${admin.email}...`);
    const emailResult = await sendWelcomeEmail({
      _id: admin._id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
      dateOfJoining: admin.dateOfJoining,
      leaveBalance: 0
    });
    
    if (emailResult.success) {
      console.log('Welcome email sent successfully');
    } else {
      console.warn('Welcome email failed:', emailResult.message || emailResult.error);
    }

    process.exit(0);
  } catch (error) {
    console.error("Failed to seed admin:", error.message);
    process.exit(1);
  }
};

seedAdmin();
