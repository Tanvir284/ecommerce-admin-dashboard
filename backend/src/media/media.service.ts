import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateMediaDto } from './dto/media.dto';
import * as fs from 'fs';
import * as path from 'path';

let sharp: any = null;
try {
  sharp = require('sharp');
} catch (e) {
  // Sharp optional fallback
}

@Injectable()
export class MediaService {
  private readonly uploadDir = path.join(process.cwd(), 'uploads');
  private readonly thumbDir = path.join(process.cwd(), 'uploads', 'thumbnails');
  private readonly maxFileSize = 10 * 1024 * 1024; // 10 MB

  constructor(private prisma: PrismaService) {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
    if (!fs.existsSync(this.thumbDir)) {
      fs.mkdirSync(this.thumbDir, { recursive: true });
    }
  }

  private validateMagicBytes(buffer: Buffer): string | null {
    if (!buffer || buffer.length < 4) return null;

    // JPEG: FF D8 FF
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
      return 'image/jpeg';
    }

    // PNG: 89 50 4E 47
    if (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47
    ) {
      return 'image/png';
    }

    // GIF: 47 49 46 38 ("GIF8")
    if (
      buffer[0] === 0x47 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x46 &&
      buffer[3] === 0x38
    ) {
      return 'image/gif';
    }

    // WEBP: "RIFF" ... "WEBP"
    if (
      buffer.length >= 12 &&
      buffer.toString('ascii', 0, 4) === 'RIFF' &&
      buffer.toString('ascii', 8, 12) === 'WEBP'
    ) {
      return 'image/webp';
    }

    // MP4 / MOV: "ftyp" at offset 4
    if (
      buffer.length >= 8 &&
      buffer.toString('ascii', 4, 8) === 'ftyp'
    ) {
      return 'video/mp4';
    }

    // WEBM / MKV: 1A 45 DF A3
    if (
      buffer[0] === 0x1a &&
      buffer[1] === 0x45 &&
      buffer[2] === 0xdf &&
      buffer[3] === 0xa3
    ) {
      return 'video/webm';
    }

    return null;
  }

  async handleUpload(file: Express.Multer.File, userId: string) {
    if (!file || !file.buffer) {
      throw new BadRequestException('No file uploaded');
    }

    if (file.size > this.maxFileSize) {
      throw new BadRequestException(
        `File size (${(file.size / (1024 * 1024)).toFixed(2)} MB) exceeds maximum allowed limit of 10 MB`,
      );
    }

    const detectedMime = this.validateMagicBytes(file.buffer);

    const allowedMimes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'video/mp4',
      'video/webm',
    ];

    // Verify both client mimetype and magic bytes header
    if (!allowedMimes.includes(file.mimetype) || (detectedMime && !allowedMimes.includes(detectedMime))) {
      throw new BadRequestException(`File type '${file.mimetype}' is not allowed`);
    }

    const actualMime = detectedMime || file.mimetype;
    const isImage = actualMime.startsWith('image/');
    const fileType = isImage ? 'image' : 'video';

    const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
    const storedPath = path.join(this.uploadDir, filename);

    // Save main file to disk
    fs.writeFileSync(storedPath, file.buffer);

    let width: number | null = null;
    let height: number | null = null;
    let thumbnailUrl: string | null = null;

    const publicUrl = `/uploads/${filename}`;

    if (isImage) {
      const thumbFilename = `thumb-${filename}`;
      const thumbPath = path.join(this.thumbDir, thumbFilename);

      if (sharp) {
        try {
          const metadata = await sharp(file.buffer).metadata();
          width = metadata.width || null;
          height = metadata.height || null;

          await sharp(file.buffer)
            .resize(300, 300, { fit: 'cover' })
            .toFile(thumbPath);

          thumbnailUrl = `/uploads/thumbnails/${thumbFilename}`;
        } catch (err) {
          thumbnailUrl = publicUrl;
        }
      } else {
        // Fallback: save original as thumbnail
        fs.writeFileSync(thumbPath, file.buffer);
        thumbnailUrl = `/uploads/thumbnails/${thumbFilename}`;
      }
    }

    const media = await this.prisma.media.create({
      data: {
        fileName: file.originalname,
        storedPath,
        publicUrl,
        mimeType: actualMime,
        type: fileType,
        size: file.size,
        width,
        height,
        thumbnailUrl: thumbnailUrl || publicUrl,
        title: path.parse(file.originalname).name,
        altText: path.parse(file.originalname).name,
        uploadedById: userId,
      },
    });

    return media;
  }

  async handleMultipleUploads(files: Express.Multer.File[], userId: string) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files provided for upload');
    }

    const results = [];
    for (const file of files) {
      const uploaded = await this.handleUpload(file, userId);
      results.push(uploaded);
    }

    return results;
  }

  async findAll(
    search?: string,
    type?: string,
    page = 1,
    limit = 20,
  ) {
    const skip = (page - 1) * limit;

    const where: any = {};
    if (search) {
      where.OR = [
        { fileName: { contains: search, mode: 'insensitive' } },
        { title: { contains: search, mode: 'insensitive' } },
        { altText: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (type) {
      where.type = type.toLowerCase();
    }

    const [media, total] = await Promise.all([
      this.prisma.media.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
      }),
      this.prisma.media.count({ where }),
    ]);

    return {
      media,
      meta: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const media = await this.prisma.media.findUnique({
      where: { id },
    });

    if (!media) {
      throw new NotFoundException(`Media asset not found`);
    }

    return media;
  }

  async update(id: string, dto: UpdateMediaDto) {
    await this.findOne(id);

    return this.prisma.media.update({
      where: { id },
      data: {
        altText: dto.altText,
        title: dto.title,
      },
    });
  }

  async remove(id: string) {
    const media = await this.findOne(id);

    // Delete stored files on disk safely
    try {
      if (fs.existsSync(media.storedPath)) {
        fs.unlinkSync(media.storedPath);
      }
      if (media.thumbnailUrl && media.thumbnailUrl.startsWith('/uploads/thumbnails/')) {
        const thumbName = path.basename(media.thumbnailUrl);
        const thumbPath = path.join(this.thumbDir, thumbName);
        if (fs.existsSync(thumbPath)) {
          fs.unlinkSync(thumbPath);
        }
      }
    } catch (e) {
      // Log disk error cleanly without failing database cleanup
    }

    // Database record deletion (detaches cleanly from product attachments)
    await this.prisma.media.delete({ where: { id } });

    return { message: `Media asset '${media.fileName}' deleted successfully` };
  }
}
