import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBrandDto, UpdateBrandDto } from './dto/brand.dto';
import slugify from 'slugify';

@Injectable()
export class BrandService {
  constructor(private prisma: PrismaService) {}

  private generateSlug(name: string, customSlug?: string): string {
    const raw = customSlug && customSlug.trim() !== '' ? customSlug : name;
    return slugify(raw, { lower: true, strict: true });
  }

  async create(dto: CreateBrandDto) {
    const slug = this.generateSlug(dto.name, dto.slug);

    const existingName = await this.prisma.brand.findUnique({
      where: { name: dto.name.trim() },
    });
    if (existingName) {
      throw new ConflictException(`Brand with name '${dto.name}' already exists`);
    }

    const existingSlug = await this.prisma.brand.findUnique({
      where: { slug },
    });
    if (existingSlug) {
      throw new ConflictException(`Brand with slug '${slug}' already exists`);
    }

    if (dto.logoId) {
      const logo = await this.prisma.media.findUnique({ where: { id: dto.logoId } });
      if (!logo) {
        throw new BadRequestException('Logo media asset does not exist');
      }
    }

    return this.prisma.brand.create({
      data: {
        name: dto.name.trim(),
        slug,
        logoId: dto.logoId || null,
        status: dto.status || 'ACTIVE',
        description: dto.description,
      },
      include: {
        logo: true,
        _count: { select: { products: true } },
      },
    });
  }

  async findAll(search?: string, status?: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) {
      where.status = status;
    }

    const [brands, total] = await Promise.all([
      this.prisma.brand.findMany({
        where,
        include: {
          logo: true,
          _count: { select: { products: true } },
        },
        orderBy: { name: 'asc' },
        skip,
        take: Number(limit),
      }),
      this.prisma.brand.count({ where }),
    ]);

    return {
      brands,
      meta: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const brand = await this.prisma.brand.findUnique({
      where: { id },
      include: {
        logo: true,
        _count: { select: { products: true } },
      },
    });

    if (!brand) {
      throw new NotFoundException(`Brand not found`);
    }

    return brand;
  }

  async update(id: string, dto: UpdateBrandDto) {
    const brand = await this.findOne(id);

    let slug = brand.slug;
    if (dto.slug || dto.name) {
      slug = this.generateSlug(dto.name || brand.name, dto.slug);
      if (slug !== brand.slug) {
        const existingSlug = await this.prisma.brand.findUnique({ where: { slug } });
        if (existingSlug && existingSlug.id !== id) {
          throw new ConflictException(`Brand with slug '${slug}' already exists`);
        }
      }
    }

    if (dto.name && dto.name.trim() !== brand.name) {
      const existingName = await this.prisma.brand.findUnique({
        where: { name: dto.name.trim() },
      });
      if (existingName && existingName.id !== id) {
        throw new ConflictException(`Brand with name '${dto.name}' already exists`);
      }
    }

    return this.prisma.brand.update({
      where: { id },
      data: {
        name: dto.name ? dto.name.trim() : brand.name,
        slug,
        logoId: dto.logoId !== undefined ? (dto.logoId || null) : brand.logoId,
        status: dto.status || brand.status,
        description: dto.description !== undefined ? dto.description : brand.description,
      },
      include: {
        logo: true,
        _count: { select: { products: true } },
      },
    });
  }

  async remove(id: string) {
    const brand = await this.prisma.brand.findUnique({
      where: { id },
      include: {
        _count: { select: { products: true } },
      },
    });

    if (!brand) {
      throw new NotFoundException(`Brand not found`);
    }

    if (brand._count.products > 0) {
      throw new BadRequestException(
        `Cannot delete brand '${brand.name}' because ${brand._count.products} product(s) reference it`,
      );
    }

    await this.prisma.brand.delete({ where: { id } });
    return { message: `Brand '${brand.name}' deleted successfully` };
  }
}
