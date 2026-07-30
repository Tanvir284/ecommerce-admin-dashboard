import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';
import slugify from 'slugify';

@Injectable()
export class CategoryService {
  constructor(private prisma: PrismaService) {}

  private generateSlug(name: string, customSlug?: string): string {
    const raw = customSlug && customSlug.trim() !== '' ? customSlug : name;
    return slugify(raw, { lower: true, strict: true });
  }

  async create(dto: CreateCategoryDto) {
    const slug = this.generateSlug(dto.name, dto.slug);

    const existing = await this.prisma.category.findUnique({
      where: { slug },
    });

    if (existing) {
      throw new ConflictException(`Category with slug '${slug}' already exists`);
    }

    if (dto.parentId) {
      const parent = await this.prisma.category.findUnique({
        where: { id: dto.parentId },
      });
      if (!parent) {
        throw new BadRequestException('Parent category does not exist');
      }
    }

    if (dto.imageId) {
      const image = await this.prisma.media.findUnique({
        where: { id: dto.imageId },
      });
      if (!image) {
        throw new BadRequestException('Media image does not exist');
      }
    }

    return this.prisma.category.create({
      data: {
        name: dto.name.trim(),
        slug,
        description: dto.description,
        imageId: dto.imageId || null,
        parentId: dto.parentId || null,
        isActive: dto.isActive !== undefined ? dto.isActive : true,
        sortOrder: dto.sortOrder !== undefined ? dto.sortOrder : 0,
      },
      include: {
        image: true,
        parent: true,
      },
    });
  }

  async getTree() {
    const allCategories = await this.prisma.category.findMany({
      include: {
        image: true,
        _count: {
          select: { products: true, children: true },
        },
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });

    // Build hierarchical tree recursively
    const map = new Map<string, any>();
    const roots: any[] = [];

    allCategories.forEach((cat) => {
      map.set(cat.id, { ...cat, children: [] });
    });

    allCategories.forEach((cat) => {
      if (cat.parentId && map.has(cat.parentId)) {
        map.get(cat.parentId).children.push(map.get(cat.id));
      } else {
        roots.push(map.get(cat.id));
      }
    });

    return roots;
  }

  async findAllFlat(search?: string, page = 1, limit = 50) {
    const skip = (page - 1) * limit;

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [categories, total] = await Promise.all([
      this.prisma.category.findMany({
        where,
        include: {
          image: true,
          parent: true,
          _count: {
            select: { products: true, children: true },
          },
        },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        skip,
        take: Number(limit),
      }),
      this.prisma.category.count({ where }),
    ]);

    return {
      categories,
      meta: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        image: true,
        parent: true,
        children: {
          include: { image: true },
        },
        _count: {
          select: { products: true },
        },
      },
    });

    if (!category) {
      throw new NotFoundException(`Category not found`);
    }

    return category;
  }

  async update(id: string, dto: UpdateCategoryDto) {
    const category = await this.findOne(id);

    let slug = category.slug;
    if (dto.slug || dto.name) {
      slug = this.generateSlug(dto.name || category.name, dto.slug);
      if (slug !== category.slug) {
        const existing = await this.prisma.category.findUnique({ where: { slug } });
        if (existing) {
          throw new ConflictException(`Category with slug '${slug}' already exists`);
        }
      }
    }

    if (dto.parentId !== undefined && dto.parentId !== category.parentId) {
      if (dto.parentId === id) {
        throw new BadRequestException('A category cannot be its own parent');
      }

      if (dto.parentId) {
        // Cycle Check: Ensure target parent is not a descendant of current category
        const isDescendant = await this.checkIsDescendant(id, dto.parentId);
        if (isDescendant) {
          throw new BadRequestException(
            'Cycle detected: A category cannot become a child of one of its own descendants',
          );
        }
      }
    }

    return this.prisma.category.update({
      where: { id },
      data: {
        name: dto.name ? dto.name.trim() : category.name,
        slug,
        description: dto.description !== undefined ? dto.description : category.description,
        imageId: dto.imageId !== undefined ? (dto.imageId || null) : category.imageId,
        parentId: dto.parentId !== undefined ? (dto.parentId || null) : category.parentId,
        isActive: dto.isActive !== undefined ? dto.isActive : category.isActive,
        sortOrder: dto.sortOrder !== undefined ? dto.sortOrder : category.sortOrder,
      },
      include: {
        image: true,
        parent: true,
      },
    });
  }

  async remove(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: { children: true, products: true },
        },
      },
    });

    if (!category) {
      throw new NotFoundException(`Category not found`);
    }

    if (category._count.children > 0) {
      throw new BadRequestException(
        `Cannot delete category '${category.name}' because it has ${category._count.children} child category(ies). Reassign or delete children first.`,
      );
    }

    if (category._count.products > 0) {
      throw new BadRequestException(
        `Cannot delete category '${category.name}' because ${category._count.products} product(s) are filed under it. Reassign products first.`,
      );
    }

    await this.prisma.category.delete({ where: { id } });
    return { message: `Category '${category.name}' deleted successfully` };
  }

  private async checkIsDescendant(ancestorId: string, potentialChildId: string): Promise<boolean> {
    let currentId: string | null = potentialChildId;
    while (currentId) {
      if (currentId === ancestorId) {
        return true;
      }
      const cat = await this.prisma.category.findUnique({
        where: { id: currentId },
        select: { parentId: true },
      });
      currentId = cat ? cat.parentId : null;
    }
    return false;
  }
}
