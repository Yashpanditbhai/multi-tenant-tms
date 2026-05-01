import { Router } from "express";
import * as orgController from "../controllers/organization.controller.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { createOrgSchema, updateOrgSchema } from "../utils/validators.js";
import { ROLES } from "../models/User.js";

const router = Router();

router.use(authenticate);

router.post(
  "/",
  authorize(ROLES.SUPER_ADMIN),
  validate(createOrgSchema),
  orgController.create
);
router.get("/", authorize(ROLES.SUPER_ADMIN), orgController.getAll);
router.get("/:id", authorize(ROLES.SUPER_ADMIN, ROLES.TENANT_ADMIN), orgController.getById);
router.get("/:id/stats", authorize(ROLES.SUPER_ADMIN, ROLES.TENANT_ADMIN), orgController.getStats);
router.put(
  "/:id",
  authorize(ROLES.SUPER_ADMIN),
  validate(updateOrgSchema),
  orgController.update
);
router.delete("/:id", authorize(ROLES.SUPER_ADMIN), orgController.remove);

export default router;
