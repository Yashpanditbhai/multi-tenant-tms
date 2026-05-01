import * as authService from "../services/auth.service.js";
import { sendSuccess } from "../utils/response.js";

export async function register(req, res, next) {
  try {
    const result = await authService.register(req.body);
    sendSuccess(res, result, 201);
  } catch (error) {
    next(error);
  }
}

export async function login(req, res, next) {
  try {
    const result = await authService.login(req.body);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

export async function getProfile(req, res, next) {
  try {
    const user = await authService.getProfile(req.user._id);
    sendSuccess(res, user);
  } catch (error) {
    next(error);
  }
}
