import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AttributeType } from '@prisma/client';

export class AttributeValueDto {
  @IsString()
  @IsOptional()
  id?: string;

  @IsString()
  @IsNotEmpty({ message: 'Value is required' })
  value: string;

  @IsString()
  @IsOptional()
  slug?: string;

  @IsString()
  @IsOptional()
  hexCode?: string; // For colour swatch

  @IsString()
  @IsOptional()
  mediaId?: string; // For image swatch
}

export class CreateAttributeDto {
  @IsString()
  @IsNotEmpty({ message: 'Attribute name is required' })
  name: string;

  @IsString()
  @IsOptional()
  slug?: string;

  @IsEnum(AttributeType)
  @IsNotEmpty({ message: 'Attribute type is required' })
  type: AttributeType;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttributeValueDto)
  @IsOptional()
  values?: AttributeValueDto[];
}

export class UpdateAttributeDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  slug?: string;

  @IsEnum(AttributeType)
  @IsOptional()
  type?: AttributeType;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttributeValueDto)
  @IsOptional()
  values?: AttributeValueDto[];
}
