import jwt from "jsonwebtoken";
import { config } from "../config/env.js";
import { User, ROLES } from "../models/User.js";
import { Organization } from "../models/Organization.js";
import { AppError } from "../utils/AppError.js";

function generateToken(userId) {
  return jwt.sign({ id: userId }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });
}

export async function register({ name, email, password, organizationName }) {
  const existing = await User.findOne({ email });
  if (existing) throw new AppError("Email already registered", 409);

  // First user becomes super admin
  const userCount = await User.countDocuments();
  const isSuperAdmin = userCount === 0;

  let organizationId = null;

  if (!isSuperAdmin && organizationName) {
    // Create or find org for new registrations
    let org = await Organization.findOne({
      slug: organizationName.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    });
    if (!org) {
      org = await Organization.create({ name: organizationName });
    }
    organizationId = org._id;
  }

  const user = await User.create({
    name,
    email,
    password,
    role: isSuperAdmin ? ROLES.SUPER_ADMIN : ROLES.TENANT_ADMIN,
    organizationId,
  });

  const token = generateToken(user._id);
  return { user: user.toJSON(), token };
}

export async function login({ email, password }) {
  const user = await User.findOne({ email }).select("+password");
  if (!user || !user.isActive) {
    throw new AppError("Invalid email or password", 401);
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) throw new AppError("Invalid email or password", 401);

  const token = generateToken(user._id);
  return { user: user.toJSON(), token };
}

export async function getProfile(userId) {
  const user = await User.findById(userId).populate("organizationId");
  if (!user) throw new AppError("User not found", 404);
  return user;
}
