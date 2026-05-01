import { Organization } from "../models/Organization.js";
import { User } from "../models/User.js";
import { Task } from "../models/Task.js";
import { AppError } from "../utils/AppError.js";

export async function createOrganization(data) {
  const existing = await Organization.findOne({
    slug: data.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
  });
  if (existing) throw new AppError("Organization name already taken", 409);
  return Organization.create(data);
}

export async function getAllOrganizations({ page = 1, limit = 10, search }) {
  const query = {};
  if (search) {
    query.name = { $regex: search, $options: "i" };
  }

  const [data, total] = await Promise.all([
    Organization.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Organization.countDocuments(query),
  ]);

  return { data, total, page, limit };
}

export async function getOrganizationById(id) {
  const org = await Organization.findById(id);
  if (!org) throw new AppError("Organization not found", 404);
  return org;
}

export async function updateOrganization(id, data) {
  const org = await Organization.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true,
  });
  if (!org) throw new AppError("Organization not found", 404);
  return org;
}

export async function deleteOrganization(id) {
  const org = await Organization.findById(id);
  if (!org) throw new AppError("Organization not found", 404);

  // Remove all related data
  await Promise.all([
    User.updateMany({ organizationId: id }, { organizationId: null, isActive: false }),
    Task.deleteMany({ organizationId: id }),
    Organization.findByIdAndDelete(id),
  ]);

  return { message: "Organization deleted" };
}

export async function getOrganizationStats(orgId) {
  const [userCount, taskStats] = await Promise.all([
    User.countDocuments({ organizationId: orgId }),
    Task.aggregate([
      { $match: { organizationId: orgId } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
  ]);

  const tasks = { todo: 0, "in-progress": 0, done: 0 };
  taskStats.forEach((s) => (tasks[s._id] = s.count));

  return { users: userCount, tasks };
}
