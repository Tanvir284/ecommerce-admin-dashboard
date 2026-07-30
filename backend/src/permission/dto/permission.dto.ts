import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreatePermissionGroupDto {
  @IsString()
  @IsNotEmpty({ message: 'Group name is required' })
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  actions?: string[]; // Standard actions e.g. ['create', 'read']

  @IsString()
  @IsOptional()
  customAction?: string; // Custom action e.g. 'export'
}

export class UpdatePermissionGroupDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  actions?: string[];
}

export class CreateSinglePermissionDto {
  @IsString()
  @IsNotEmpty({ message: 'Permission name is required' })
  name: string; // e.g. product:create

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsNotEmpty({ message: 'Group ID is required' })
  groupId: string;
}
