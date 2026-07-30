import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto, UpdateProductDto, VariantInputDto } from './dto/product.dto';
import { StockStatus } from '@prisma/client';
import slugify from 'slugify';

@Injectable()
export class ProductService {
  constructor(private prisma: PrismaService) {}

  private generateSlug(name: string, customSlug?: string): string {
    const raw = customSlug && customSlug.trim() !== '' ? customSlug : name;
    return slugify(raw, { lower: true, strict: true });
  }

  private deriveStockStatus(stock: number, lowStockThreshold = 5): StockStatus {
    if (stock <= 0) return StockStatus.OUT_OF_STOCK;
    if (stock <= lowStockThreshold) return StockStatus.LOW_STOCK;
    return StockStatus.IN_STOCK;
  }

  async create(dto: CreateProductDto) {
    const slug = this.generateSlug(dto.name, dto.slug);

    // Validate Slug Uniqueness
    const existingSlug = await this.prisma.product.findUnique({ where: { slug } });
    if (existingSlug) {
      throw new ConflictException(`Product with slug '${slug}' already exists`);
    }

    // Validation: Simple vs Variable product rules
    if (!dto.hasVariants) {
      if (dto.price === undefined || dto.price === null) {
        throw new BadRequestException('Simple product must have a price');
      }
      if (dto.salePrice !== undefined && dto.salePrice !== null) {
        if (dto.salePrice > dto.price) {
          throw new BadRequestException('Sale price cannot be greater than price');
        }
      }
      if (dto.variants && dto.variants.length > 0) {
        throw new BadRequestException('Simple product cannot have variants');
      }
      if (dto.sku) {
        const existingProductSku = await this.prisma.product.findFirst({
          where: { sku: dto.sku.trim() },
        });
        const existingVariantSku = await this.prisma.productVariant.findUnique({
          where: { sku: dto.sku.trim() },
        });
        if (existingProductSku || existingVariantSku) {
          throw new ConflictException(`SKU '${dto.sku}' is already in use`);
        }
      }
    } else {
      // Variable product
      if (dto.price !== undefined || dto.salePrice !== undefined || dto.stock !== undefined) {
        throw new BadRequestException(
          'Variable product cannot have top-level price or stock; prices/stock live on variants',
        );
      }
      if (!dto.variants || dto.variants.length === 0) {
        throw new BadRequestException('Variable product must have at least one variant');
      }
    }

    // Validate Variants if provided
    if (dto.variants && dto.variants.length > 0) {
      await this.validateVariants(dto.variants);
    }

    // Validate Brand if provided
    if (dto.brandId) {
      const brand = await this.prisma.brand.findUnique({ where: { id: dto.brandId } });
      if (!brand) throw new BadRequestException('Brand does not exist');
    }

    // Validate Categories if provided
    if (dto.categoryIds && dto.categoryIds.length > 0) {
      const count = await this.prisma.category.count({
        where: { id: { in: dto.categoryIds } },
      });
      if (count !== dto.categoryIds.length) {
        throw new BadRequestException('One or more selected categories do not exist');
      }
    }

    // Atomic Transaction for multi-table writes
    return this.prisma.$transaction(async (tx) => {
      const simpleStock = dto.stock !== undefined ? dto.stock : 0;
      const simpleStockStatus = !dto.hasVariants
        ? this.deriveStockStatus(simpleStock)
        : null;

      const product = await tx.product.create({
        data: {
          name: dto.name.trim(),
          slug,
          sku: !dto.hasVariants && dto.sku ? dto.sku.trim() : null,
          shortDescription: dto.shortDescription,
          longDescription: dto.longDescription,
          hasVariants: dto.hasVariants,
          price: !dto.hasVariants ? dto.price : null,
          salePrice: !dto.hasVariants ? dto.salePrice || null : null,
          stock: !dto.hasVariants ? simpleStock : null,
          stockStatus: simpleStockStatus,
          weight: dto.weight || null,
          isActive: dto.isActive !== undefined ? dto.isActive : true,
          isFeatured: dto.isFeatured || false,
          sortOrder: dto.sortOrder || 0,
          brandId: dto.brandId || null,
        },
      });

      // Attach Categories
      if (dto.categoryIds && dto.categoryIds.length > 0) {
        await tx.productCategory.createMany({
          data: dto.categoryIds.map((catId) => ({
            productId: product.id,
            categoryId: catId,
          })),
        });
      }

      // Attach Product Level Media
      if (dto.mediaAttachments && dto.mediaAttachments.length > 0) {
        let hasThumbnail = false;
        for (const ma of dto.mediaAttachments) {
          const isThumb = !!ma.isThumbnail && !hasThumbnail;
          if (isThumb) hasThumbnail = true;

          await tx.mediaAttachment.create({
            data: {
              mediaId: ma.mediaId,
              productId: product.id,
              attributeValueId: ma.attributeValueId || null,
              isThumbnail: isThumb,
              isGallery: ma.isGallery !== undefined ? ma.isGallery : true,
              sortOrder: ma.sortOrder || 0,
            },
          });
        }
      }

      // Create Variants
      if (dto.hasVariants && dto.variants) {
        for (const v of dto.variants) {
          const vStockStatus = this.deriveStockStatus(v.stock, v.lowStockThreshold || 5);
          const variant = await tx.productVariant.create({
            data: {
              productId: product.id,
              sku: v.sku.trim(),
              price: v.price,
              salePrice: v.salePrice || null,
              stock: v.stock,
              stockStatus: vStockStatus,
              lowStockThreshold: v.lowStockThreshold || 5,
              weight: v.weight || null,
              isActive: v.isActive !== undefined ? v.isActive : true,
            },
          });

          // Link Variant Attribute Values
          await tx.variantAttributeValue.createMany({
            data: v.attributeValueIds.map((valId) => ({
              variantId: variant.id,
              attributeValueId: valId,
            })),
          });

          // Variant Media Attachments
          if (v.mediaIds && v.mediaIds.length > 0) {
            let variantThumbSet = false;
            for (const mId of v.mediaIds) {
              const isThumb = v.thumbnailMediaId === mId && !variantThumbSet;
              if (isThumb) variantThumbSet = true;

              await tx.mediaAttachment.create({
                data: {
                  mediaId: mId,
                  productId: product.id,
                  variantId: variant.id,
                  isThumbnail: isThumb,
                  isGallery: true,
                },
              });
            }
          }
        }
      }

      return this.findOneInternal(product.id, tx);
    });
  }

  async findAll(
    search?: string,
    categoryId?: string,
    brandId?: string,
    status?: string,
    page = 1,
    limit = 20,
  ) {
    const skip = (page - 1) * limit;

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { variants: { some: { sku: { contains: search, mode: 'insensitive' } } } },
      ];
    }

    if (brandId) {
      where.brandId = brandId;
    }

    if (categoryId) {
      where.categories = {
        some: { categoryId },
      };
    }

    if (status) {
      if (status === 'ACTIVE') where.isActive = true;
      if (status === 'INACTIVE') where.isActive = false;
    }

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: {
          brand: { include: { logo: true } },
          categories: { include: { category: true } },
          mediaAttachments: { include: { media: true } },
          variants: {
            include: {
              attributeValues: {
                include: { attributeValue: { include: { attribute: true } } },
              },
              mediaAttachments: { include: { media: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      products: products.map(this.formatProductResponse),
      meta: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    return this.findOneInternal(id, this.prisma);
  }

  private async findOneInternal(id: string, prismaClient: any) {
    const product = await prismaClient.product.findUnique({
      where: { id },
      include: {
        brand: { include: { logo: true } },
        categories: { include: { category: true } },
        mediaAttachments: { include: { media: true } },
        variants: {
          include: {
            attributeValues: {
              include: { attributeValue: { include: { attribute: true } } },
            },
            mediaAttachments: { include: { media: true } },
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException(`Product not found`);
    }

    return this.formatProductResponse(product);
  }

  async update(id: string, dto: UpdateProductDto) {
    const existing = await this.prisma.product.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Product not found');
    }

    // Delete existing product and recreate atomically in transaction
    return this.prisma.$transaction(async (tx) => {
      await tx.mediaAttachment.deleteMany({ where: { productId: id } });
      await tx.productCategory.deleteMany({ where: { productId: id } });
      await tx.productVariant.deleteMany({ where: { productId: id } });
      await tx.product.delete({ where: { id } });

      return this.create(dto);
    });
  }

  async remove(id: string) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) {
      throw new NotFoundException(`Product not found`);
    }

    // Variants and media attachments deleted via Prisma schema cascade; media assets survive!
    await this.prisma.product.delete({ where: { id } });
    return { message: `Product '${product.name}' and its variants deleted successfully` };
  }

  private async validateVariants(variants: VariantInputDto[]) {
    const skuSet = new Set<string>();
    const combinationSet = new Set<string>();

    for (const v of variants) {
      // Duplicate variant SKU within request check
      const skuLower = v.sku.trim().toLowerCase();
      if (skuSet.has(skuLower)) {
        throw new ConflictException(`Duplicate variant SKU '${v.sku}' in request`);
      }
      skuSet.add(skuLower);

      // Check DB for existing variant SKU
      const existingDbVariant = await this.prisma.productVariant.findUnique({
        where: { sku: v.sku.trim() },
      });
      if (existingDbVariant) {
        throw new ConflictException(`Variant SKU '${v.sku}' is already in use`);
      }

      // Check Sale price <= price
      if (v.salePrice !== undefined && v.salePrice !== null) {
        if (v.salePrice > v.price) {
          throw new BadRequestException(
            `Variant SKU '${v.sku}': Sale price (${v.salePrice}) cannot be greater than price (${v.price})`,
          );
        }
      }

      // Validate attribute value combination uniqueness
      const sortedValIds = [...v.attributeValueIds].sort().join('|');
      if (combinationSet.has(sortedValIds)) {
        throw new BadRequestException(
          `Two variants have identical attribute value combinations`,
        );
      }
      combinationSet.add(sortedValIds);

      // Verify that all referenced attribute value IDs exist
      const existingVals = await this.prisma.attributeValue.count({
        where: { id: { in: v.attributeValueIds } },
      });
      if (existingVals !== v.attributeValueIds.length) {
        throw new BadRequestException(
          `Variant SKU '${v.sku}' references one or more attribute values that do not exist`,
        );
      }
    }
  }

  private formatProductResponse(p: any) {
    let thumbnail = p.mediaAttachments?.find((m: any) => m.isThumbnail)?.media || null;
    if (!thumbnail && p.mediaAttachments && p.mediaAttachments.length > 0) {
      thumbnail = p.mediaAttachments[0].media;
    }

    let minPrice = p.price;
    let maxPrice = p.price;
    if (p.hasVariants && p.variants && p.variants.length > 0) {
      const prices = p.variants.map((v: any) => v.salePrice || v.price);
      minPrice = Math.min(...prices);
      maxPrice = Math.max(...prices);
    }

    return {
      ...p,
      thumbnail,
      priceRange: p.hasVariants
        ? minPrice === maxPrice
          ? `$${minPrice}`
          : `$${minPrice} - $${maxPrice}`
        : `$${p.price || 0}`,
    };
  }
}
