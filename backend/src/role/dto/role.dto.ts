import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsBoolean,
} from 'class-validator';
import { RoleStatus } from '@prisma/client';

export class CreateRoleDto {
  @IsString()
  @IsNotEmpty({ message: 'Role name is required' })
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(RoleStatus)
  @IsOptional()
  status?: RoleStatus;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  permissionIds?: string[];

  @IsBoolean()
  @IsOptional()
  grantAll?: boolean; // Shortcut to grant all existing permissions
}

export class UpdateRoleDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(RoleStatus)
  @IsOptional()
  status?: RoleStatus;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  permissionIds?: string[];

  @IsBoolean()
  @IsOptional()
  grantAll?: boolean;
}
