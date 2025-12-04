import { Request, Response, NextFunction } from 'express';
import { eventService } from './event.service.js';
import { sendSuccess, sendCreated, sendPaginated, sendNoContent } from '../../common/utils/response.js';
import type { CreateEventDto, UpdateEventDto, EventQueryDto, VerifyPasswordDto } from './event.dto.js';
import type { AuthenticatedRequest } from '../../common/types/index.js';

export class EventController {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { user } = req as AuthenticatedRequest;
      const data = req.body as CreateEventDto;
      const event = await eventService.create(user.id, data);
      sendCreated(res, event, 'Event created successfully');
    } catch (error) {
      next(error);
    }
  }

  async findAll(req: Request, res: Response, next: NextFunction) {
    try {
      const { user } = req as AuthenticatedRequest;
      const query = req.query as EventQueryDto;
      const { events, total, page, limit } = await eventService.findAll(user.id, query);
      sendPaginated(res, events, { page, limit, total });
    } catch (error) {
      next(error);
    }
  }

  async findById(req: Request, res: Response, next: NextFunction) {
    try {
      const { user } = req as AuthenticatedRequest;
      const { id } = req.params;
      const event = await eventService.findById(id as string, user.id);
      sendSuccess(res, event);
    } catch (error) {
      next(error);
    }
  }

  // Public endpoint - no auth required
  async findPublicById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const event = await eventService.findPublicById(id as string);
      sendSuccess(res, event);
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { user } = req as AuthenticatedRequest;
      const { id } = req.params;
      const data = req.body as UpdateEventDto;
      const event = await eventService.update(id as string, user.id, data);
      sendSuccess(res, event, 200, 'Event updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { user } = req as AuthenticatedRequest;
      const { id } = req.params;
      await eventService.delete(id as string, user.id);
      sendNoContent(res);
    } catch (error) {
      next(error);
    }
  }

  async verifyPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { password } = req.body as VerifyPasswordDto;
      const result = await eventService.verifyPassword(id as string, password);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }
}

export const eventController = new EventController();

