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
import { UserService } from './user.service';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { PermissionGuard } from '../common/guards/permission.guard';
import { GetUser } from '../common/decorators/get-user.decorator';

@Controller('user')
@UseGuards(PermissionGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @RequirePermission('user:create')
  create(@Body() dto: CreateUserDto) {
    return this.userService.create(dto);
  }

  @Get()
  @RequirePermission('user:read')
  findAll(
    @Query('search') search?: string,
    @Query('roleId') roleId?: string,
    @Query('isActive') isActive?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    const activeBool =
      isActive === 'true' ? true : isActive === 'false' ? false : undefined;
    return this.userService.findAll(search, roleId, activeBool, page, limit);
  }

  @Get(':id')
  @RequirePermission('user:read')
  findOne(@Param('id') id: string) {
    return this.userService.findOne(id);
  }

  @Put(':id')
  @RequirePermission('user:update')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @GetUser('id') currentUserId: string,
  ) {
    return this.userService.update(id, dto, currentUserId);
  }

  @Delete(':id')
  @RequirePermission('user:delete')
  remove(@Param('id') id: string, @GetUser('id') currentUserId: string) {
    return this.userService.remove(id, currentUserId);
  }
}
