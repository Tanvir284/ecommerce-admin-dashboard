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
import { AttributeService } from './attribute.service';
import { CreateAttributeDto, UpdateAttributeDto } from './dto/attribute.dto';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { PermissionGuard } from '../common/guards/permission.guard';

@Controller('attribute')
@UseGuards(PermissionGuard)
export class AttributeController {
  constructor(private readonly attributeService: AttributeService) {}

  @Post()
  @RequirePermission('attribute:create')
  create(@Body() dto: CreateAttributeDto) {
    return this.attributeService.create(dto);
  }

  @Get()
  @RequirePermission('attribute:read')
  findAll(
    @Query('search') search?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.attributeService.findAll(search, page, limit);
  }

  @Get(':id')
  @RequirePermission('attribute:read')
  findOne(@Param('id') id: string) {
    return this.attributeService.findOne(id);
  }

  @Put(':id')
  @RequirePermission('attribute:update')
  update(@Param('id') id: string, @Body() dto: UpdateAttributeDto) {
    return this.attributeService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermission('attribute:delete')
  remove(@Param('id') id: string) {
    return this.attributeService.remove(id);
  }

  @Delete(':id/value/:valueId')
  @RequirePermission('attribute:delete')
  removeValue(@Param('id') id: string, @Param('valueId') valueId: string) {
    return this.attributeService.removeValue(id, valueId);
  }
}
