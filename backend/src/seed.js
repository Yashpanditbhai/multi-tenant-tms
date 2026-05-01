import mongoose from "mongoose";
import { config } from "./config/env.js";
import { User, ROLES } from "./models/User.js";
import { Organization } from "./models/Organization.js";
import { Task } from "./models/Task.js";

async function seed() {
  await mongoose.connect(config.mongoUri);
  console.log("Connected to MongoDB");

  // Clear existing data
  await Promise.all([User.deleteMany({}), Organization.deleteMany({}), Task.deleteMany({})]);
  console.log("Cleared existing data");

  // Create organizations
  const [acme, globex] = await Organization.insertMany([
    { name: "Acme Corp", slug: "acme-corp", description: "A leading technology company" },
    { name: "Globex Inc", slug: "globex-inc", description: "Global solutions provider" },
  ]);
  console.log("Created organizations");

  // Create users
  const superAdmin = await User.create({
    name: "Super Admin",
    email: "admin@taskflow.com",
    password: "admin123",
    role: ROLES.SUPER_ADMIN,
    organizationId: null,
  });

  const acmeAdmin = await User.create({
    name: "Acme Admin",
    email: "admin@acme.com",
    password: "admin123",
    role: ROLES.TENANT_ADMIN,
    organizationId: acme._id,
  });

  const acmeUser = await User.create({
    name: "John Doe",
    email: "john@acme.com",
    password: "user123",
    role: ROLES.USER,
    organizationId: acme._id,
  });

  const globexAdmin = await User.create({
    name: "Globex Admin",
    email: "admin@globex.com",
    password: "admin123",
    role: ROLES.TENANT_ADMIN,
    organizationId: globex._id,
  });

  const globexUser = await User.create({
    name: "Jane Smith",
    email: "jane@globex.com",
    password: "user123",
    role: ROLES.USER,
    organizationId: globex._id,
  });

  console.log("Created users");

  // Create tasks
  await Task.insertMany([
    // Acme tasks
    { title: "Set up CI/CD pipeline", description: "Configure GitHub Actions for automated deployment", status: "todo", priority: "high", assignedTo: acmeUser._id, organizationId: acme._id, createdBy: acmeAdmin._id },
    { title: "Design landing page", description: "Create responsive landing page mockups", status: "in-progress", priority: "medium", assignedTo: acmeUser._id, organizationId: acme._id, createdBy: acmeAdmin._id },
    { title: "Write API documentation", description: "Document all REST endpoints using Swagger", status: "done", priority: "low", assignedTo: acmeAdmin._id, organizationId: acme._id, createdBy: acmeAdmin._id },
    { title: "Database optimization", description: "Add indexes and optimize slow queries", status: "todo", priority: "high", assignedTo: acmeAdmin._id, organizationId: acme._id, createdBy: acmeAdmin._id },
    { title: "User onboarding flow", description: "Build step-by-step onboarding wizard", status: "in-progress", priority: "medium", assignedTo: acmeUser._id, organizationId: acme._id, createdBy: acmeAdmin._id },
    // Globex tasks
    { title: "Security audit", description: "Perform full security review of the platform", status: "todo", priority: "high", assignedTo: globexUser._id, organizationId: globex._id, createdBy: globexAdmin._id },
    { title: "Mobile app wireframes", description: "Design wireframes for iOS and Android apps", status: "in-progress", priority: "medium", assignedTo: globexUser._id, organizationId: globex._id, createdBy: globexAdmin._id },
    { title: "Quarterly report", description: "Compile Q1 performance metrics", status: "done", priority: "low", assignedTo: globexAdmin._id, organizationId: globex._id, createdBy: globexAdmin._id },
    { title: "Upgrade Node.js version", description: "Migrate from Node 18 to Node 22", status: "todo", priority: "medium", assignedTo: globexUser._id, organizationId: globex._id, createdBy: globexAdmin._id },
  ]);

  console.log("Created tasks");
  console.log("\n--- Test Accounts ---");
  console.log("Super Admin:    admin@taskflow.com  / admin123");
  console.log("Acme Admin:     admin@acme.com      / admin123");
  console.log("Acme User:      john@acme.com       / user123");
  console.log("Globex Admin:   admin@globex.com    / admin123");
  console.log("Globex User:    jane@globex.com     / user123");
  console.log("---------------------\n");

  await mongoose.disconnect();
  console.log("Seed complete!");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
