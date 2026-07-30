import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PermissionService } from './permission.service';
import {
  CreatePermissionGroupDto,
  UpdatePermissionGroupDto,
} from './dto/permission.dto';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { PermissionGuard } from '../common/guards/permission.guard';

@Controller('permission')
@UseGuards(PermissionGuard)
export class PermissionController {
  constructor(private readonly permissionService: PermissionService) {}

  @Get()
  @RequirePermission('permission:read')
  findAllGrouped(
    @Query('search') search?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 50,
  ) {
    return this.permissionService.findAllGrouped(search, page, limit);
  }

  @Post('group')
  @RequirePermission('permission:create')
  createGroup(@Body() dto: CreatePermissionGroupDto) {
    return this.permissionService.createGroup(dto);
  }

  @Get('group/:id')
  @RequirePermission('permission:read')
  getGroupById(@Param('id') id: string) {
    return this.permissionService.getGroupById(id);
  }

  @Put('group/:id')
  @RequirePermission('permission:update')
  updateGroup(
    @Param('id') id: string,
    @Body() dto: UpdatePermissionGroupDto,
  ) {
    return this.permissionService.updateGroup(id, dto);
  }

  @Delete('group/:id')
  @RequirePermission('permission:delete')
  deleteGroup(@Param('id') id: string) {
    return this.permissionService.deleteGroup(id);
  }

  @Delete(':id')
  @RequirePermission('permission:delete')
  deletePermission(@Param('id') id: string) {
    return this.permissionService.deletePermission(id);
  }
}
