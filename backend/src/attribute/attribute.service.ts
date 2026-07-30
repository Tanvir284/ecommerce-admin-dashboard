import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateAttributeDto,
  UpdateAttributeDto,
  AttributeValueDto,
} from './dto/attribute.dto';
import slugify from 'slugify';

@Injectable()
export class AttributeService {
  constructor(private prisma: PrismaService) {}

  private generateSlug(name: string, customSlug?: string): string {
    const raw = customSlug && customSlug.trim() !== '' ? customSlug : name;
    return slugify(raw, { lower: true, strict: true });
  }

  async create(dto: CreateAttributeDto) {
    const slug = this.generateSlug(dto.name, dto.slug);

    const existingName = await this.prisma.attribute.findUnique({
      where: { name: dto.name.trim() },
    });
    if (existingName) {
      throw new ConflictException(`Attribute with name '${dto.name}' already exists`);
    }

    const attribute = await this.prisma.attribute.create({
      data: {
        name: dto.name.trim(),
        slug,
        type: dto.type,
      },
    });

    if (dto.values && dto.values.length > 0) {
      for (const val of dto.values) {
        const valSlug = this.generateSlug(val.value, val.slug);
        await this.prisma.attributeValue.create({
          data: {
            attributeId: attribute.id,
            value: val.value.trim(),
            slug: valSlug,
            hexCode: val.hexCode || null,
            mediaId: val.mediaId || null,
          },
        });
      }
    }

    return this.findOne(attribute.id);
  }

  async findAll(search?: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
        { values: { some: { value: { contains: search, mode: 'insensitive' } } } },
      ];
    }

    const [attributes, total] = await Promise.all([
      this.prisma.attribute.findMany({
        where,
        include: {
          values: {
            include: { media: true },
            orderBy: { value: 'asc' },
          },
        },
        orderBy: { name: 'asc' },
        skip,
        take: Number(limit),
      }),
      this.prisma.attribute.count({ where }),
    ]);

    return {
      attributes,
      meta: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const attribute = await this.prisma.attribute.findUnique({
      where: { id },
      include: {
        values: {
          include: { media: true },
          orderBy: { value: 'asc' },
        },
      },
    });

    if (!attribute) {
      throw new NotFoundException(`Attribute not found`);
    }

    return attribute;
  }

  async update(id: string, dto: UpdateAttributeDto) {
    const attribute = await this.findOne(id);

    let slug = attribute.slug;
    if (dto.slug || dto.name) {
      slug = this.generateSlug(dto.name || attribute.name, dto.slug);
      if (slug !== attribute.slug) {
        const existingSlug = await this.prisma.attribute.findUnique({ where: { slug } });
        if (existingSlug && existingSlug.id !== id) {
          throw new ConflictException(`Attribute with slug '${slug}' already exists`);
        }
      }
    }

    if (dto.name && dto.name.trim() !== attribute.name) {
      const existingName = await this.prisma.attribute.findUnique({
        where: { name: dto.name.trim() },
      });
      if (existingName && existingName.id !== id) {
        throw new ConflictException(`Attribute with name '${dto.name}' already exists`);
      }
    }

    await this.prisma.attribute.update({
      where: { id },
      data: {
        name: dto.name ? dto.name.trim() : attribute.name,
        slug,
        type: dto.type || attribute.type,
      },
    });

    if (dto.values !== undefined) {
      const incomingValIds = dto.values.filter((v) => v.id).map((v) => v.id as string);
      const currentValues = attribute.values;

      // Check if any deleted values are used in product variants
      for (const currVal of currentValues) {
        if (!incomingValIds.includes(currVal.id)) {
          const usedInVariants = await this.prisma.variantAttributeValue.count({
            where: { attributeValueId: currVal.id },
          });
          if (usedInVariants > 0) {
            throw new BadRequestException(
              `Cannot remove attribute value '${currVal.value}' because it is used by ${usedInVariants} product variant(s)`,
            );
          }
          await this.prisma.attributeValue.delete({ where: { id: currVal.id } });
        }
      }

      // Upsert incoming values
      for (const val of dto.values) {
        const valSlug = this.generateSlug(val.value, val.slug);
        if (val.id) {
          await this.prisma.attributeValue.update({
            where: { id: val.id },
            data: {
              value: val.value.trim(),
              slug: valSlug,
              hexCode: val.hexCode || null,
              mediaId: val.mediaId || null,
            },
          });
        } else {
          await this.prisma.attributeValue.create({
            data: {
              attributeId: id,
              value: val.value.trim(),
              slug: valSlug,
              hexCode: val.hexCode || null,
              mediaId: val.mediaId || null,
            },
          });
        }
      }
    }

    return this.findOne(id);
  }

  async remove(id: string) {
    const attribute = await this.findOne(id);

    // Refusal check: If any value of this attribute is used in a product variant, refuse delete
    const valueIds = attribute.values.map((v) => v.id);
    if (valueIds.length > 0) {
      const usedCount = await this.prisma.variantAttributeValue.count({
        where: { attributeValueId: { in: valueIds } },
      });
      if (usedCount > 0) {
        throw new BadRequestException(
          `Cannot delete attribute '${attribute.name}' because its values are used by ${usedCount} product variant(s)`,
        );
      }
    }

    await this.prisma.attribute.delete({ where: { id } });
    return { message: `Attribute '${attribute.name}' deleted successfully` };
  }

  async removeValue(attributeId: string, valueId: string) {
    const val = await this.prisma.attributeValue.findUnique({
      where: { id: valueId },
    });

    if (!val || val.attributeId !== attributeId) {
      throw new NotFoundException('Attribute value not found');
    }

    const usedInVariants = await this.prisma.variantAttributeValue.count({
      where: { attributeValueId: valueId },
    });

    if (usedInVariants > 0) {
      throw new BadRequestException(
        `Cannot delete value '${val.value}' because it is used by ${usedInVariants} product variant(s)`,
      );
    }

    await this.prisma.attributeValue.delete({ where: { id: valueId } });
    return { message: `Attribute value '${val.value}' deleted successfully` };
  }
}
