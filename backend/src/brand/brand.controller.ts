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
import { BrandService } from './brand.service';
import { CreateBrandDto, UpdateBrandDto } from './dto/brand.dto';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { PermissionGuard } from '../common/guards/permission.guard';

@Controller('brand')
@UseGuards(PermissionGuard)
export class BrandController {
  constructor(private readonly brandService: BrandService) {}

  @Post()
  @RequirePermission('brand:create')
  create(@Body() dto: CreateBrandDto) {
    return this.brandService.create(dto);
  }

  @Get()
  @RequirePermission('brand:read')
  findAll(
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.brandService.findAll(search, status, page, limit);
  }

  @Get(':id')
  @RequirePermission('brand:read')
  findOne(@Param('id') id: string) {
    return this.brandService.findOne(id);
  }

  @Put(':id')
  @RequirePermission('brand:update')
  update(@Param('id') id: string, @Body() dto: UpdateBrandDto) {
    return this.brandService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermission('brand:delete')
  remove(@Param('id') id: string) {
    return this.brandService.remove(id);
  }
}
