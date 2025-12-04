import { prisma } from '../../config/database.js';
import { NotFoundError, ForbiddenError } from '../../common/exceptions/AppError.js';
import type { CreateAlbumDto, UpdateAlbumDto, ReorderAlbumsDto } from './album.dto.js';

export class AlbumService {
  private async verifyEventOwnership(eventId: string, photographerId: string) {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { photographerId: true },
    });

    if (!event) {
      throw new NotFoundError('Event');
    }

    if (event.photographerId !== photographerId) {
      throw new ForbiddenError('You do not have access to this event');
    }
  }

  async create(eventId: string, photographerId: string, data: CreateAlbumDto) {
    await this.verifyEventOwnership(eventId, photographerId);

    // Get max sort order
    const maxOrder = await prisma.album.aggregate({
      where: { eventId },
      _max: { sortOrder: true },
    });

    const album = await prisma.album.create({
      data: {
        ...data,
        eventId,
        sortOrder: data.sortOrder ?? (maxOrder._max.sortOrder ?? 0) + 1,
      },
      include: {
        _count: { select: { photos: true } },
      },
    });

    return album;
  }

  async findByEventId(eventId: string) {
    const albums = await prisma.album.findMany({
      where: { eventId },
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: { select: { photos: true } },
      },
    });

    return albums;
  }

  async findById(id: string) {
    const album = await prisma.album.findUnique({
      where: { id },
      include: {
        event: { select: { id: true, name: true, photographerId: true } },
        photos: {
          orderBy: { sortOrder: 'asc' },
          include: {
            _count: { select: { likes: true, comments: true } },
          },
        },
        _count: { select: { photos: true } },
      },
    });

    if (!album) {
      throw new NotFoundError('Album');
    }

    return album;
  }

  async update(id: string, photographerId: string, data: UpdateAlbumDto) {
    const album = await this.findById(id);
    
    if (album.event.photographerId !== photographerId) {
      throw new ForbiddenError('You do not have access to this album');
    }

    const updated = await prisma.album.update({
      where: { id },
      data,
      include: {
        _count: { select: { photos: true } },
      },
    });

    return updated;
  }

  async delete(id: string, photographerId: string) {
    const album = await this.findById(id);
    
    if (album.event.photographerId !== photographerId) {
      throw new ForbiddenError('You do not have access to this album');
    }

    await prisma.album.delete({ where: { id } });
  }

  async reorder(eventId: string, photographerId: string, data: ReorderAlbumsDto) {
    await this.verifyEventOwnership(eventId, photographerId);

    await prisma.$transaction(
      data.albums.map(({ id, sortOrder }) =>
        prisma.album.update({
          where: { id },
          data: { sortOrder },
        })
      )
    );

    return this.findByEventId(eventId);
  }
}

export const albumService = new AlbumService();

