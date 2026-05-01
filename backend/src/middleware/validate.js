import { AppError } from "../utils/AppError.js";

// Zod validation middleware factory
export function validate(schema) {
  return (req, _res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const message = result.error.errors.map((e) => e.message).join(", ");
      return next(new AppError(message, 400));
    }
    req.body = result.data;
    next();
  };
}
