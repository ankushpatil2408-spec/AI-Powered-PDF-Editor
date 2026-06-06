import { Request, Response, NextFunction } from 'express';
import { ApiErrorResponse } from '../../src/types.js';

/**
 * Spring-Boot Style Global Exception Handler Controller Advice Middleware
 */
export function globalErrorHandler(
  err: any, 
  req: Request, 
  res: Response, 
  next: NextFunction
): void {
  const status = err.status || 500;
  
  const responsePayload: ApiErrorResponse = {
    timestamp: new Date().toISOString(),
    status: status,
    error: status === 400 ? 'Bad Request' : status === 404 ? 'Not Found' : 'Internal Server Error',
    message: err.message || "An unexpected system error occurred.",
    path: req.originalUrl
  };

  // Stacktrace detail in non-production environments
  if (process.env.NODE_ENV !== 'production' && err.stack) {
    responsePayload.details = [err.stack.split('\n')[0], err.stack.split('\n')[1] || ""];
  }

  console.error(`[Global Error Handler] [${status}] [${req.method} ${req.url}]:`, err);
  
  res.status(status).json(responsePayload);
}

/**
 * Standard DTO and Validation Handler
 */
export function validateDto(dtoClass: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.body || Object.keys(req.body).length === 0) {
        throw { status: 400, message: "Request body cannot be empty" };
      }

      const body = req.body;

      if (dtoClass === 'CreateProjectRequest') {
        if (!body.name || body.name.trim() === '') {
          throw { status: 400, message: "Project 'name' is a required string field" };
        }
        if (!body.userId || body.userId.trim() === '') {
          throw { status: 400, message: "Project 'userId' is a required string field" };
        }
      }

      if (dtoClass === 'UploadPdfRequest') {
        const projectIdVal = body.projectId || req.params.projectId;
        if (!projectIdVal) {
          throw { status: 400, message: "'projectId' target has not been specified" };
        }
        body.projectId = projectIdVal;
        if (!body.originalDataBase64) {
          throw { status: 400, message: "'originalDataBase64' document payload is required" };
        }
      }

      if (dtoClass === 'RecordEditRequest') {
        if (!body.fileId) {
          throw { status: 400, message: "'fileId' reference is required" };
        }
        if (!body.projectId) {
          throw { status: 400, message: "'projectId' reference is required" };
        }
        if (body.pageIndex === undefined || body.pageIndex < 0) {
          throw { status: 400, message: "'pageIndex' must be a non-negative integer number" };
        }
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}
