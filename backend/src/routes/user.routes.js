import { Router } from "express";
import * as userController from "../controllers/user.controller.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { createUserSchema, updateUserSchema } from "../utils/validators.js";
import { ROLES } from "../models/User.js";

const router = Router();

router.use(authenticate);

router.post(
  "/",
  authorize(ROLES.SUPER_ADMIN, ROLES.TENANT_ADMIN),
  validate(createUserSchema),
  userController.create
);
router.get(
  "/",
  authorize(ROLES.SUPER_ADMIN, ROLES.TENANT_ADMIN),
  userController.getAll
);
router.get("/:id", userController.getById);
router.put(
  "/:id",
  authorize(ROLES.SUPER_ADMIN, ROLES.TENANT_ADMIN),
  validate(updateUserSchema),
  userController.update
);
router.delete(
  "/:id",
  authorize(ROLES.SUPER_ADMIN, ROLES.TENANT_ADMIN),
  userController.remove
);

export default router;
