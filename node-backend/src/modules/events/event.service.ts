import { Prisma } from '../../lib/prisma.js';
import { prisma } from '../../config/database.js';
import { NotFoundError, ForbiddenError, UnauthorizedError } from '../../common/exceptions/AppError.js';
import { getPagination } from '../../common/utils/pagination.js';
import type { CreateEventDto, UpdateEventDto, EventQueryDto } from './event.dto.js';

export class EventService {
  async create(photographerId: string, data: CreateEventDto) {
    const event = await prisma.event.create({
      data: {
        ...data,
        photographerId,
      },
      include: {
        photographer: {
          select: { id: true, name: true, avatar: true },
        },
        _count: { select: { photos: true, albums: true } },
      },
    });

    return event;
  }

  async findAll(photographerId: string, query: EventQueryDto) {
    const { page, limit, skip } = getPagination(query.page, query.limit);

    const where: Prisma.EventWhereInput = {
      photographerId,
      ...(query.status && { status: query.status }),
      ...(query.search && {
        OR: [
          { name: { contains: query.search, mode: 'insensitive' } },
          { location: { contains: query.search, mode: 'insensitive' } },
        ],
      }),
    };

    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where,
        skip,
        take: limit,
        orderBy: { date: 'desc' },
        include: {
          _count: { select: { photos: true, albums: true } },
        },
      }),
      prisma.event.count({ where }),
    ]);

    return { events, total, page, limit };
  }

  async findById(id: string, photographerId?: string) {
    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        photographer: {
          select: { id: true, name: true, avatar: true, bio: true, website: true, instagram: true },
        },
        albums: { orderBy: { sortOrder: 'asc' } },
        _count: { select: { photos: true, albums: true } },
      },
    });

    if (!event) {
      throw new NotFoundError('Event');
    }

    // Check ownership if photographerId is provided
    if (photographerId && event.photographerId !== photographerId) {
      throw new ForbiddenError('You do not have access to this event');
    }

    return event;
  }

  async findPublicById(id: string) {
    const event = await prisma.event.findUnique({
      where: { id, status: 'PUBLISHED' },
      include: {
        photographer: {
          select: { id: true, name: true, avatar: true, bio: true, website: true, instagram: true },
        },
        albums: {
          orderBy: { sortOrder: 'asc' },
          include: { _count: { select: { photos: true } } },
        },
        _count: { select: { photos: true, albums: true } },
      },
    });

    if (!event) {
      throw new NotFoundError('Event');
    }

    // Remove password from response
    const { password: _, ...publicEvent } = event;
    return { ...publicEvent, requiresPassword: event.isPasswordProtected };
  }

  async update(id: string, photographerId: string, data: UpdateEventDto) {
    // Verify ownership
    await this.findById(id, photographerId);

    const event = await prisma.event.update({
      where: { id },
      data,
      include: {
        photographer: { select: { id: true, name: true, avatar: true } },
        _count: { select: { photos: true, albums: true } },
      },
    });

    return event;
  }

  async delete(id: string, photographerId: string) {
    await this.findById(id, photographerId);
    await prisma.event.delete({ where: { id } });
  }

  async verifyPassword(id: string, password: string) {
    const event = await prisma.event.findUnique({
      where: { id },
      select: { id: true, isPasswordProtected: true, password: true },
    });

    if (!event) {
      throw new NotFoundError('Event');
    }

    if (!event.isPasswordProtected) {
      return { valid: true };
    }

    if (event.password !== password) {
      throw new UnauthorizedError('Invalid password');
    }

    return { valid: true };
  }
}

export const eventService = new EventService();

