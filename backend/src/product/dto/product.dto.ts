import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class VariantInputDto {
  @IsString()
  @IsNotEmpty({ message: 'Variant SKU is required' })
  sku: string;

  @IsNumber()
  @Min(0, { message: 'Variant price cannot be negative' })
  price: number;

  @IsNumber()
  @Min(0, { message: 'Variant sale price cannot be negative' })
  @IsOptional()
  salePrice?: number;

  @IsInt()
  @Min(0, { message: 'Variant stock cannot be negative' })
  stock: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  lowStockThreshold?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  weight?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ message: 'Variant must have at least one attribute value ID' })
  attributeValueIds: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  mediaIds?: string[];

  @IsString()
  @IsOptional()
  thumbnailMediaId?: string;
}

export class MediaAttachmentInputDto {
  @IsString()
  @IsNotEmpty()
  mediaId: string;

  @IsBoolean()
  @IsOptional()
  isThumbnail?: boolean;

  @IsBoolean()
  @IsOptional()
  isGallery?: boolean;

  @IsInt()
  @IsOptional()
  sortOrder?: number;

  @IsString()
  @IsOptional()
  attributeValueId?: string;
}

export class CreateProductDto {
  @IsString()
  @IsNotEmpty({ message: 'Product name is required' })
  name: string;

  @IsString()
  @IsOptional()
  slug?: string;

  @IsString()
  @IsOptional()
  sku?: string;

  @IsString()
  @IsOptional()
  shortDescription?: string;

  @IsString()
  @IsOptional()
  longDescription?: string;

  @IsBoolean()
  hasVariants: boolean;

  @IsNumber()
  @Min(0, { message: 'Price cannot be negative' })
  @IsOptional()
  price?: number;

  @IsNumber()
  @Min(0, { message: 'Sale price cannot be negative' })
  @IsOptional()
  salePrice?: number;

  @IsInt()
  @Min(0, { message: 'Stock cannot be negative' })
  @IsOptional()
  stock?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  weight?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsBoolean()
  @IsOptional()
  isFeatured?: boolean;

  @IsInt()
  @IsOptional()
  sortOrder?: number;

  @IsString()
  @IsOptional()
  brandId?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  categoryIds?: string[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VariantInputDto)
  @IsOptional()
  variants?: VariantInputDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MediaAttachmentInputDto)
  @IsOptional()
  mediaAttachments?: MediaAttachmentInputDto[];
}

export class UpdateProductDto extends CreateProductDto {}
