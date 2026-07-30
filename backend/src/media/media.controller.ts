import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Body,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { MediaService } from './media.service';
import { UpdateMediaDto } from './dto/media.dto';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { PermissionGuard } from '../common/guards/permission.guard';
import { GetUser } from '../common/decorators/get-user.decorator';

@Controller('media')
@UseGuards(PermissionGuard)
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('upload')
  @RequirePermission('media:upload')
  @UseInterceptors(FileInterceptor('file'))
  uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @GetUser('id') userId: string,
  ) {
    return this.mediaService.handleUpload(file, userId);
  }

  @Post('upload-multiple')
  @RequirePermission('media:upload')
  @UseInterceptors(FilesInterceptor('files', 10))
  uploadMultipleFiles(
    @UploadedFiles() files: Express.Multer.File[],
    @GetUser('id') userId: string,
  ) {
    return this.mediaService.handleMultipleUploads(files, userId);
  }

  @Get()
  @RequirePermission('media:read')
  findAll(
    @Query('search') search?: string,
    @Query('type') type?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.mediaService.findAll(search, type, page, limit);
  }

  @Get(':id')
  @RequirePermission('media:read')
  findOne(@Param('id') id: string) {
    return this.mediaService.findOne(id);
  }

  @Put(':id')
  @RequirePermission('media:write')
  update(@Param('id') id: string, @Body() dto: UpdateMediaDto) {
    return this.mediaService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermission('media:delete')
  remove(@Param('id') id: string) {
    return this.mediaService.remove(id);
  }
}
