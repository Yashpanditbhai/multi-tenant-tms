import * as taskService from "../services/task.service.js";
import { sendSuccess, sendPaginated } from "../utils/response.js";

export async function create(req, res, next) {
  try {
    const task = await taskService.createTask(req.body, req.user);
    sendSuccess(res, task, 201);
  } catch (error) {
    next(error);
  }
}

export async function getAll(req, res, next) {
  try {
    const { page, limit, search, status, priority, assignedTo, organizationId } = req.query;
    const result = await taskService.getTasks({
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 10,
      search,
      status,
      priority,
      assignedTo,
      organizationId,
      user: req.user,
    });
    sendPaginated(res, result);
  } catch (error) {
    next(error);
  }
}

export async function getById(req, res, next) {
  try {
    const task = await taskService.getTaskById(req.params.id, req.user);
    sendSuccess(res, task);
  } catch (error) {
    next(error);
  }
}

export async function update(req, res, next) {
  try {
    const task = await taskService.updateTask(req.params.id, req.body, req.user);
    sendSuccess(res, task);
  } catch (error) {
    next(error);
  }
}

export async function remove(req, res, next) {
  try {
    const result = await taskService.deleteTask(req.params.id, req.user);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

export async function getStats(req, res, next) {
  try {
    const stats = await taskService.getTaskStats(req.user);
    sendSuccess(res, stats);
  } catch (error) {
    next(error);
  }
}
