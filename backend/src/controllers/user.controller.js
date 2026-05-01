import * as userService from "../services/user.service.js";
import { sendSuccess, sendPaginated } from "../utils/response.js";

export async function create(req, res, next) {
  try {
    const user = await userService.createUser(req.body, req.user);
    sendSuccess(res, user, 201);
  } catch (error) {
    next(error);
  }
}

export async function getAll(req, res, next) {
  try {
    const { page, limit, search, role } = req.query;
    const organizationId =
      req.user.role === "super_admin"
        ? req.query.organizationId
        : req.user.organizationId;

    const result = await userService.getUsers({
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 10,
      search,
      organizationId,
      role,
    });
    sendPaginated(res, result);
  } catch (error) {
    next(error);
  }
}

export async function getById(req, res, next) {
  try {
    const user = await userService.getUserById(req.params.id);
    sendSuccess(res, user);
  } catch (error) {
    next(error);
  }
}

export async function update(req, res, next) {
  try {
    const user = await userService.updateUser(req.params.id, req.body, req.user);
    sendSuccess(res, user);
  } catch (error) {
    next(error);
  }
}

export async function remove(req, res, next) {
  try {
    const result = await userService.deleteUser(req.params.id, req.user);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}
