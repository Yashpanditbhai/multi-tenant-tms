import { User, ROLES } from "../models/User.js";
import { AppError } from "../utils/AppError.js";

export async function createUser(data, requestingUser) {
  const existing = await User.findOne({ email: data.email });
  if (existing) throw new AppError("Email already registered", 409);

  // Tenant admins can only create users in their own org
  if (requestingUser.role === ROLES.TENANT_ADMIN) {
    data.organizationId = requestingUser.organizationId;
    if (data.role === ROLES.SUPER_ADMIN) {
      throw new AppError("Cannot create super admin users", 403);
    }
  }

  return User.create(data);
}

export async function getUsers({ page = 1, limit = 10, search, organizationId, role }) {
  const query = {};
  if (organizationId) query.organizationId = organizationId;
  if (role) query.role = role;
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
    ];
  }

  const [data, total] = await Promise.all([
    User.find(query)
      .populate("organizationId", "name")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    User.countDocuments(query),
  ]);

  return { data, total, page, limit };
}

export async function getUserById(id) {
  const user = await User.findById(id).populate("organizationId", "name");
  if (!user) throw new AppError("User not found", 404);
  return user;
}

export async function updateUser(id, data, requestingUser) {
  // Prevent role escalation
  if (data.role === ROLES.SUPER_ADMIN && requestingUser.role !== ROLES.SUPER_ADMIN) {
    throw new AppError("Cannot assign super admin role", 403);
  }

  const user = await User.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true,
  });
  if (!user) throw new AppError("User not found", 404);
  return user;
}

export async function deleteUser(id, requestingUser) {
  if (id === requestingUser._id.toString()) {
    throw new AppError("Cannot delete yourself", 400);
  }
  const user = await User.findByIdAndDelete(id);
  if (!user) throw new AppError("User not found", 404);
  return { message: "User deleted" };
}
