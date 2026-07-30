import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRoleDto, UpdateRoleDto } from './dto/role.dto';

@Injectable()
export class RoleService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateRoleDto) {
    const existing = await this.prisma.role.findUnique({
      where: { name: dto.name.trim() },
    });

    if (existing) {
      throw new ConflictException(`Role with name '${dto.name}' already exists`);
    }

    let targetPermissionIds: string[] = [];

    if (dto.grantAll) {
      const allPermissions = await this.prisma.permission.findMany({
        select: { id: true },
      });
      targetPermissionIds = allPermissions.map((p) => p.id);
    } else if (dto.permissionIds && dto.permissionIds.length > 0) {
      targetPermissionIds = dto.permissionIds;
    }

    const role = await this.prisma.role.create({
      data: {
        name: dto.name.trim(),
        description: dto.description,
        status: dto.status || 'ACTIVE',
        permissions: {
          create: targetPermissionIds.map((id) => ({ permissionId: id })),
        },
      },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
        _count: {
          select: { users: true },
        },
      },
    });

    return this.formatRoleResponse(role);
  }

  async findAll(search?: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [roles, total] = await Promise.all([
      this.prisma.role.findMany({
        where,
        include: {
          permissions: {
            include: {
              permission: true,
            },
          },
          _count: {
            select: { users: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
      }),
      this.prisma.role.count({ where }),
    ]);

    return {
      roles: roles.map(this.formatRoleResponse),
      meta: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
        _count: {
          select: { users: true },
        },
      },
    });

    if (!role) {
      throw new NotFoundException(`Role not found`);
    }

    return this.formatRoleResponse(role);
  }

  async update(id: string, dto: UpdateRoleDto) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: {
        permissions: {
          include: { permission: true },
        },
      },
    });

    if (!role) {
      throw new NotFoundException(`Role not found`);
    }

    if (dto.name && dto.name.trim() !== role.name) {
      const existing = await this.prisma.role.findUnique({
        where: { name: dto.name.trim() },
      });
      if (existing) {
        throw new ConflictException(`Role with name '${dto.name}' already exists`);
      }
    }

    // Protection check: Ensure we don't strip 'role:update' from the only role that has it
    if (dto.permissionIds !== undefined || dto.grantAll !== undefined) {
      let nextPermIds: string[] = [];
      if (dto.grantAll) {
        const allPerms = await this.prisma.permission.findMany({ select: { id: true } });
        nextPermIds = allPerms.map((p) => p.id);
      } else if (dto.permissionIds) {
        nextPermIds = dto.permissionIds;
      }

      const roleUpdatePerm = await this.prisma.permission.findUnique({
        where: { name: 'role:update' },
      });

      if (roleUpdatePerm) {
        const hasRoleUpdateBefore = role.permissions.some(
          (rp) => rp.permission.name === 'role:update',
        );
        const willHaveRoleUpdate = nextPermIds.includes(roleUpdatePerm.id);

        if (hasRoleUpdateBefore && !willHaveRoleUpdate) {
          // Check how many roles hold role:update
          const rolesWithUpdateCount = await this.prisma.rolePermission.count({
            where: { permissionId: roleUpdatePerm.id },
          });

          if (rolesWithUpdateCount <= 1) {
            throw new BadRequestException(
              'Cannot strip role:update permission from the last role that holds it',
            );
          }
        }
      }
    }

    let targetPermissionIds = dto.permissionIds;
    if (dto.grantAll) {
      const allPermissions = await this.prisma.permission.findMany({
        select: { id: true },
      });
      targetPermissionIds = allPermissions.map((p) => p.id);
    }

    if (targetPermissionIds !== undefined) {
      // Re-assign permissions
      await this.prisma.rolePermission.deleteMany({
        where: { roleId: id },
      });

      await this.prisma.rolePermission.createMany({
        data: targetPermissionIds.map((permId) => ({
          roleId: id,
          permissionId: permId,
        })),
      });
    }

    const updatedRole = await this.prisma.role.update({
      where: { id },
      data: {
        name: dto.name ? dto.name.trim() : role.name,
        description: dto.description !== undefined ? dto.description : role.description,
        status: dto.status || role.status,
      },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
        _count: {
          select: { users: true },
        },
      },
    });

    return this.formatRoleResponse(updatedRole);
  }

  async remove(id: string) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: {
        _count: { select: { users: true } },
      },
    });

    if (!role) {
      throw new NotFoundException(`Role not found`);
    }

    if (role._count.users > 0) {
      throw new BadRequestException(
        `Cannot delete role '${role.name}' because ${role._count.users} user(s) are currently assigned to it`,
      );
    }

    await this.prisma.role.delete({ where: { id } });
    return { message: `Role '${role.name}' deleted successfully` };
  }

  private formatRoleResponse(role: any) {
    return {
      id: role.id,
      name: role.name,
      description: role.description,
      status: role.status,
      userCount: role._count ? role._count.users : 0,
      permissions: role.permissions.map((rp) => ({
        id: rp.permission.id,
        name: rp.permission.name,
        description: rp.permission.description,
        groupId: rp.permission.groupId,
      })),
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
    };
  }
}
