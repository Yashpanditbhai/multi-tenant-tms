import { Router } from "express";
import * as taskController from "../controllers/task.controller.js";
import { authenticate } from "../middleware/auth.js";
import { tenantIsolation } from "../middleware/tenantIsolation.js";
import { validate } from "../middleware/validate.js";
import { createTaskSchema, updateTaskSchema } from "../utils/validators.js";

const router = Router();

router.use(authenticate, tenantIsolation);

router.get("/stats", taskController.getStats);
router.post("/", validate(createTaskSchema), taskController.create);
router.get("/", taskController.getAll);
router.get("/:id", taskController.getById);
router.put("/:id", validate(updateTaskSchema), taskController.update);
router.delete("/:id", taskController.remove);

export default router;
