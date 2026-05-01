import mongoose from "mongoose";
import { Task } from "../models/Task.js";
import { ROLES } from "../models/User.js";
import { AppError } from "../utils/AppError.js";

export async function createTask(data, user) {
  if (user.role === ROLES.USER) {
    throw new AppError("Users cannot create tasks", 403);
  }

  const orgId = user.role === ROLES.SUPER_ADMIN
    ? data.organizationId
    : user.organizationId;

  if (!orgId) throw new AppError("Organization ID required", 400);

  return Task.create({
    ...data,
    organizationId: orgId,
    createdBy: user._id,
  });
}

export async function getTasks({
  page = 1,
  limit = 10,
  search,
  status,
  priority,
  assignedTo,
  organizationId,
  user,
}) {
  const query = {};

  // Tenant isolation
  if (user.role === ROLES.SUPER_ADMIN) {
    if (organizationId) query.organizationId = new mongoose.Types.ObjectId(organizationId);
  } else if (user.role === ROLES.TENANT_ADMIN) {
    query.organizationId = user.organizationId;
  } else {
    // Regular users see only their tasks
    query.assignedTo = user._id;
  }

  if (status) query.status = status;
  if (priority) query.priority = priority;
  if (assignedTo) query.assignedTo = new mongoose.Types.ObjectId(assignedTo);
  if (search) {
    query.title = { $regex: search, $options: "i" };
  }

  const [data, total] = await Promise.all([
    Task.find(query)
      .populate("assignedTo", "name email")
      .populate("createdBy", "name")
      .populate("organizationId", "name")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Task.countDocuments(query),
  ]);

  return { data, total, page, limit };
}

export async function getTaskById(id, user) {
  const task = await Task.findById(id)
    .populate("assignedTo", "name email")
    .populate("createdBy", "name")
    .populate("organizationId", "name");

  if (!task) throw new AppError("Task not found", 404);

  // Verify access
  if (user.role === ROLES.USER && task.assignedTo?._id.toString() !== user._id.toString()) {
    throw new AppError("Access denied", 403);
  }
  if (
    user.role === ROLES.TENANT_ADMIN &&
    task.organizationId._id.toString() !== user.organizationId.toString()
  ) {
    throw new AppError("Access denied", 403);
  }

  return task;
}

export async function updateTask(id, data, user) {
  const task = await Task.findById(id);
  if (!task) throw new AppError("Task not found", 404);

  // Regular users can only update status of their own tasks
  if (user.role === ROLES.USER) {
    if (task.assignedTo?.toString() !== user._id.toString()) {
      throw new AppError("Access denied", 403);
    }
    // Users can only update status
    const updated = await Task.findByIdAndUpdate(
      id,
      { status: data.status },
      { new: true, runValidators: true }
    ).populate("assignedTo", "name email").populate("createdBy", "name");
    return updated;
  }

  // Tenant admins can only modify tasks in their org
  if (
    user.role === ROLES.TENANT_ADMIN &&
    task.organizationId.toString() !== user.organizationId.toString()
  ) {
    throw new AppError("Access denied", 403);
  }

  const updated = await Task.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true,
  })
    .populate("assignedTo", "name email")
    .populate("createdBy", "name");

  return updated;
}

export async function deleteTask(id, user) {
  const task = await Task.findById(id);
  if (!task) throw new AppError("Task not found", 404);

  if (user.role === ROLES.USER) {
    throw new AppError("Users cannot delete tasks", 403);
  }

  if (
    user.role === ROLES.TENANT_ADMIN &&
    task.organizationId.toString() !== user.organizationId.toString()
  ) {
    throw new AppError("Access denied", 403);
  }

  await Task.findByIdAndDelete(id);
  return { message: "Task deleted" };
}

export async function getTaskStats(user) {
  const match = {};
  if (user.role === ROLES.TENANT_ADMIN) {
    match.organizationId = user.organizationId;
  } else if (user.role === ROLES.USER) {
    match.assignedTo = user._id;
  }

  const [statusStats, priorityStats, total] = await Promise.all([
    Task.aggregate([
      { $match: match },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
    Task.aggregate([
      { $match: match },
      { $group: { _id: "$priority", count: { $sum: 1 } } },
    ]),
    Task.countDocuments(match),
  ]);

  const byStatus = { todo: 0, "in-progress": 0, done: 0 };
  statusStats.forEach((s) => (byStatus[s._id] = s.count));

  const byPriority = { low: 0, medium: 0, high: 0 };
  priorityStats.forEach((s) => (byPriority[s._id] = s.count));

  return { total, byStatus, byPriority };
}
