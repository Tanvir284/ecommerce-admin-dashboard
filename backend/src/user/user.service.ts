import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });

    if (existing) {
      throw new ConflictException(`User with email '${dto.email}' already exists`);
    }

    const role = await this.prisma.role.findUnique({
      where: { id: dto.roleId },
    });

    if (!role) {
      throw new BadRequestException('Specified role does not exist');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        name: dto.name.trim(),
        email: dto.email.toLowerCase().trim(),
        password: hashedPassword,
        phone: dto.phone,
        gender: dto.gender,
        avatar: dto.avatar,
        roleId: dto.roleId,
        isActive: dto.isActive !== undefined ? dto.isActive : true,
      },
      include: {
        role: true,
      },
    });

    return this.sanitizeUser(user);
  }

  async findAll(
    search?: string,
    roleId?: string,
    isActive?: boolean,
    page = 1,
    limit = 20,
  ) {
    const skip = (page - 1) * limit;

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (roleId) {
      where.roleId = roleId;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        include: {
          role: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      users: users.map(this.sanitizeUser),
      meta: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        role: {
          include: {
            permissions: {
              include: { permission: true },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`User not found`);
    }

    return this.sanitizeUser(user);
  }

  async update(id: string, dto: UpdateUserDto, currentUserId: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User not found`);
    }

    // Preventing self-escalation: a user cannot change their own role
    if (id === currentUserId && dto.roleId && dto.roleId !== user.roleId) {
      throw new ForbiddenException('Self-escalation prohibited: You cannot change your own role');
    }

    // Preventing self-deactivation
    if (id === currentUserId && dto.isActive === false) {
      throw new BadRequestException('You cannot deactivate your own user account');
    }

    if (dto.email && dto.email.toLowerCase().trim() !== user.email) {
      const existing = await this.prisma.user.findUnique({
        where: { email: dto.email.toLowerCase().trim() },
      });
      if (existing) {
        throw new ConflictException(`User with email '${dto.email}' already exists`);
      }
    }

    if (dto.roleId && dto.roleId !== user.roleId) {
      const roleExists = await this.prisma.role.findUnique({
        where: { id: dto.roleId },
      });
      if (!roleExists) {
        throw new BadRequestException('Specified role does not exist');
      }
    }

    const data: any = {
      name: dto.name ? dto.name.trim() : user.name,
      email: dto.email ? dto.email.toLowerCase().trim() : user.email,
      phone: dto.phone !== undefined ? dto.phone : user.phone,
      gender: dto.gender !== undefined ? dto.gender : user.gender,
      avatar: dto.avatar !== undefined ? dto.avatar : user.avatar,
      roleId: dto.roleId || user.roleId,
      isActive: dto.isActive !== undefined ? dto.isActive : user.isActive,
    };

    if (dto.password && dto.password.trim() !== '') {
      data.password = await bcrypt.hash(dto.password, 10);
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data,
      include: {
        role: true,
      },
    });

    // If role changed or user deactivated, revoke active refresh tokens
    if (dto.roleId || dto.isActive === false) {
      await this.prisma.refreshToken.updateMany({
        where: { userId: id, isRevoked: false },
        data: { isRevoked: true },
      });
    }

    return this.sanitizeUser(updatedUser);
  }

  async remove(id: string, currentUserId: string) {
    if (id === currentUserId) {
      throw new BadRequestException('You cannot delete your own account');
    }

    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User not found`);
    }

    // Hard delete with cascade of refresh tokens
    await this.prisma.user.delete({ where: { id } });
    return { message: `User '${user.name}' deleted successfully` };
  }

  private sanitizeUser(user: any) {
    const { password, ...sanitized } = user;
    return sanitized;
  }
}
