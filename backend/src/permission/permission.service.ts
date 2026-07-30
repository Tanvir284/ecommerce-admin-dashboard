import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreatePermissionGroupDto,
  UpdatePermissionGroupDto,
  CreateSinglePermissionDto,
} from './dto/permission.dto';
import slugify from 'slugify';

@Injectable()
export class PermissionService {
  constructor(private prisma: PrismaService) {}

  private normalizeName(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_:]/g, '');
  }

  async createGroup(dto: CreatePermissionGroupDto) {
    const normalizedGroupName = dto.name.trim();

    const existingGroup = await this.prisma.permissionGroup.findUnique({
      where: { name: normalizedGroupName },
    });

    if (existingGroup) {
      throw new ConflictException(`Permission group '${normalizedGroupName}' already exists`);
    }

    const group = await this.prisma.permissionGroup.create({
      data: {
        name: normalizedGroupName,
        description: dto.description,
      },
    });

    const modulePrefix = this.normalizeName(group.name);
    const actions = new Set<string>();

    if (dto.actions && dto.actions.length > 0) {
      dto.actions.forEach((a) => actions.add(this.normalizeName(a)));
    }

    if (dto.customAction && dto.customAction.trim() !== '') {
      actions.add(this.normalizeName(dto.customAction));
    }

    const permissionCreates = Array.from(actions).map((action) => {
      const permName = `${modulePrefix}:${action}`;
      return this.prisma.permission.create({
        data: {
          name: permName,
          description: `${action} permission for ${group.name}`,
          groupId: group.id,
        },
      });
    });

    await Promise.all(permissionCreates);

    return this.getGroupById(group.id);
  }

  async findAllGrouped(search?: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { permissions: { some: { name: { contains: search, mode: 'insensitive' } } } },
      ];
    }

    const [groups, total] = await Promise.all([
      this.prisma.permissionGroup.findMany({
        where,
        include: {
          permissions: true,
        },
        orderBy: { name: 'asc' },
        skip,
        take: Number(limit),
      }),
      this.prisma.permissionGroup.count({ where }),
    ]);

    return {
      groups,
      meta: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getGroupById(id: string) {
    const group = await this.prisma.permissionGroup.findUnique({
      where: { id },
      include: {
        permissions: true,
      },
    });

    if (!group) {
      throw new NotFoundException(`Permission group not found`);
    }

    return group;
  }

  async updateGroup(id: string, dto: UpdatePermissionGroupDto) {
    const group = await this.getGroupById(id);

    if (dto.name && dto.name.trim() !== group.name) {
      const existing = await this.prisma.permissionGroup.findUnique({
        where: { name: dto.name.trim() },
      });
      if (existing && existing.id !== id) {
        throw new ConflictException(`Permission group '${dto.name}' already exists`);
      }
    }

    const updatedGroup = await this.prisma.permissionGroup.update({
      where: { id },
      data: {
        name: dto.name ? dto.name.trim() : group.name,
        description: dto.description !== undefined ? dto.description : group.description,
      },
    });

    if (dto.actions) {
      const modulePrefix = this.normalizeName(updatedGroup.name);
      const targetActions = dto.actions.map((a) => this.normalizeName(a));
      const targetPermNames = targetActions.map((a) => `${modulePrefix}:${a}`);

      const currentPerms = group.permissions;
      const currentPermNames = currentPerms.map((p) => p.name);

      // Add missing permissions
      for (const permName of targetPermNames) {
        if (!currentPermNames.includes(permName)) {
          const actionName = permName.split(':')[1];
          await this.prisma.permission.create({
            data: {
              name: permName,
              description: `${actionName} permission for ${updatedGroup.name}`,
              groupId: id,
            },
          });
        }
      }

      // Remove permissions not in target list
      for (const currentPerm of currentPerms) {
        if (!targetPermNames.includes(currentPerm.name)) {
          await this.prisma.permission.delete({
            where: { id: currentPerm.id },
          });
        }
      }
    }

    return this.getGroupById(id);
  }

  async deletePermission(id: string) {
    const perm = await this.prisma.permission.findUnique({ where: { id } });
    if (!perm) {
      throw new NotFoundException('Permission not found');
    }

    // Role links are cascaded safely via schema onDelete: Cascade
    await this.prisma.permission.delete({ where: { id } });
    return { message: `Permission '${perm.name}' deleted cleanly. Role links cascaded.` };
  }

  async deleteGroup(id: string) {
    const group = await this.getGroupById(id);
    await this.prisma.permissionGroup.delete({ where: { id } });
    return { message: `Permission group '${group.name}' and its permissions deleted cleanly.` };
  }
}
