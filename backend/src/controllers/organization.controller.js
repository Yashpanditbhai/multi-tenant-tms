import * as orgService from "../services/organization.service.js";
import { sendSuccess, sendPaginated } from "../utils/response.js";

export async function create(req, res, next) {
  try {
    const org = await orgService.createOrganization(req.body);
    sendSuccess(res, org, 201);
  } catch (error) {
    next(error);
  }
}

export async function getAll(req, res, next) {
  try {
    const { page, limit, search } = req.query;
    const result = await orgService.getAllOrganizations({
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 10,
      search,
    });
    sendPaginated(res, result);
  } catch (error) {
    next(error);
  }
}

export async function getById(req, res, next) {
  try {
    const org = await orgService.getOrganizationById(req.params.id);
    sendSuccess(res, org);
  } catch (error) {
    next(error);
  }
}

export async function update(req, res, next) {
  try {
    const org = await orgService.updateOrganization(req.params.id, req.body);
    sendSuccess(res, org);
  } catch (error) {
    next(error);
  }
}

export async function remove(req, res, next) {
  try {
    const result = await orgService.deleteOrganization(req.params.id);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

export async function getStats(req, res, next) {
  try {
    const stats = await orgService.getOrganizationStats(req.params.id);
    sendSuccess(res, stats);
  } catch (error) {
    next(error);
  }
}
