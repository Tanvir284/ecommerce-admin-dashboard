import { PrismaClient, RoleStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Define Groups and Permissions
  const permissionGroupsData = [
    {
      name: 'Dashboard',
      description: 'Dashboard analytics and viewing permission',
      permissions: [
        { name: 'dashboard:watch', description: 'Can view dashboard metrics' },
      ],
    },
    {
      name: 'Permission',
      description: 'System permission management',
      permissions: [
        { name: 'permission:watch', description: 'Can see permission menu item' },
        { name: 'permission:create', description: 'Can create permission groups' },
        { name: 'permission:read', description: 'Can view permission details' },
        { name: 'permission:update', description: 'Can edit permission groups' },
        { name: 'permission:delete', description: 'Can delete permission groups' },
      ],
    },
    {
      name: 'Role',
      description: 'User job function roles management',
      permissions: [
        { name: 'role:watch', description: 'Can see role menu item' },
        { name: 'role:create', description: 'Can create roles' },
        { name: 'role:read', description: 'Can view roles' },
        { name: 'role:update', description: 'Can edit roles' },
        { name: 'role:delete', description: 'Can delete roles' },
      ],
    },
    {
      name: 'User',
      description: 'User accounts management',
      permissions: [
        { name: 'user:watch', description: 'Can see user menu item' },
        { name: 'user:create', description: 'Can create users' },
        { name: 'user:read', description: 'Can view user details' },
        { name: 'user:update', description: 'Can edit users' },
        { name: 'user:delete', description: 'Can delete users' },
      ],
    },
    {
      name: 'Media',
      description: 'Shared file library management',
      permissions: [
        { name: 'media:watch', description: 'Can see media menu item' },
        { name: 'media:read', description: 'Can view media library' },
        { name: 'media:upload', description: 'Can upload files' },
        { name: 'media:write', description: 'Can edit media metadata' },
        { name: 'media:delete', description: 'Can delete media assets' },
      ],
    },
    {
      name: 'Category',
      description: 'Product nested category tree management',
      permissions: [
        { name: 'category:watch', description: 'Can see category menu item' },
        { name: 'category:create', description: 'Can create categories' },
        { name: 'category:read', description: 'Can view categories' },
        { name: 'category:update', description: 'Can edit categories' },
        { name: 'category:delete', description: 'Can delete categories' },
      ],
    },
    {
      name: 'Brand',
      description: 'Product brand manufacturers management',
      permissions: [
        { name: 'brand:watch', description: 'Can see brand menu item' },
        { name: 'brand:create', description: 'Can create brands' },
        { name: 'brand:read', description: 'Can view brands' },
        { name: 'brand:update', description: 'Can edit brands' },
        { name: 'brand:delete', description: 'Can delete brands' },
      ],
    },
    {
      name: 'Attribute',
      description: 'Product variation dimensions management',
      permissions: [
        { name: 'attribute:watch', description: 'Can see attribute menu item' },
        { name: 'attribute:create', description: 'Can create attributes' },
        { name: 'attribute:read', description: 'Can view attributes' },
        { name: 'attribute:update', description: 'Can edit attributes' },
        { name: 'attribute:delete', description: 'Can delete attributes' },
      ],
    },
    {
      name: 'Product',
      description: 'Products and variants catalog management',
      permissions: [
        { name: 'product:watch', description: 'Can see product menu item' },
        { name: 'product:create', description: 'Can create products' },
        { name: 'product:read', description: 'Can view product list and details' },
        { name: 'product:update', description: 'Can edit products' },
        { name: 'product:delete', description: 'Can delete products' },
      ],
    },
  ];

  const allCreatedPermissions: { id: string; name: string }[] = [];

  for (const groupData of permissionGroupsData) {
    const group = await prisma.permissionGroup.upsert({
      where: { name: groupData.name },
      update: { description: groupData.description },
      create: {
        name: groupData.name,
        description: groupData.description,
      },
    });

    for (const permData of groupData.permissions) {
      const perm = await prisma.permission.upsert({
        where: { name: permData.name },
        update: { description: permData.description, groupId: group.id },
        create: {
          name: permData.name,
          description: permData.description,
          groupId: group.id,
        },
      });
      allCreatedPermissions.push(perm);
    }
  }

  console.log(`✅ Seeded ${allCreatedPermissions.length} permissions across 9 groups.`);

  // Create Super Administrator Role (All Permissions)
  const superAdminRole = await prisma.role.upsert({
    where: { name: 'Super Administrator' },
    update: { status: RoleStatus.ACTIVE },
    create: {
      name: 'Super Administrator',
      description: 'Full administrative access to all modules and system settings',
      status: RoleStatus.ACTIVE,
    },
  });

  // Assign all permissions to Super Admin Role
  await prisma.rolePermission.deleteMany({ where: { roleId: superAdminRole.id } });
  await prisma.rolePermission.createMany({
    data: allCreatedPermissions.map((p) => ({
      roleId: superAdminRole.id,
      permissionId: p.id,
    })),
  });

  // Create Limited Catalog Manager Role (No Permission/Role/User access)
  const catalogPermissions = allCreatedPermissions.filter(
    (p) =>
      p.name.startsWith('category:') ||
      p.name.startsWith('brand:') ||
      p.name.startsWith('attribute:') ||
      p.name.startsWith('product:') ||
      p.name.startsWith('media:') ||
      p.name === 'dashboard:watch',
  );

  const catalogRole = await prisma.role.upsert({
    where: { name: 'Catalog Manager' },
    update: { status: RoleStatus.ACTIVE },
    create: {
      name: 'Catalog Manager',
      description: 'Deliberately limited role with catalog management permissions only',
      status: RoleStatus.ACTIVE,
    },
  });

  await prisma.rolePermission.deleteMany({ where: { roleId: catalogRole.id } });
  await prisma.rolePermission.createMany({
    data: catalogPermissions.map((p) => ({
      roleId: catalogRole.id,
      permissionId: p.id,
    })),
  });

  console.log('✅ Seeded Roles: Super Administrator & Catalog Manager.');

  // Create Super Administrator User
  const adminPasswordHash = await bcrypt.hash('Admin123!', 10);
  const superAdminUser = await prisma.user.upsert({
    where: { email: 'admin@admin.com' },
    update: {
      password: adminPasswordHash,
      roleId: superAdminRole.id,
      isActive: true,
    },
    create: {
      name: 'Super Admin',
      email: 'admin@admin.com',
      password: adminPasswordHash,
      phone: '+8801700000000',
      gender: 'Male',
      roleId: superAdminRole.id,
      isActive: true,
    },
  });

  // Create Deliberately Limited Catalog User
  const catalogPasswordHash = await bcrypt.hash('Catalog123!', 10);
  const catalogUser = await prisma.user.upsert({
    where: { email: 'catalog@admin.com' },
    update: {
      password: catalogPasswordHash,
      roleId: catalogRole.id,
      isActive: true,
    },
    create: {
      name: 'Catalog Staff User',
      email: 'catalog@admin.com',
      password: catalogPasswordHash,
      phone: '+8801711111111',
      gender: 'Female',
      roleId: catalogRole.id,
      isActive: true,
    },
  });

  console.log('✅ Seeded Users:');
  console.log('   1. Super Admin: admin@admin.com / Admin123!');
  console.log('   2. Catalog Manager (Limited 403 test user): catalog@admin.com / Catalog123!');

  // Seed sample Catalog items (Brand, Category, Attribute)
  const electronicsCategory = await prisma.category.upsert({
    where: { slug: 'electronics' },
    update: {},
    create: {
      name: 'Electronics',
      slug: 'electronics',
      description: 'Consumer Electronics & Devices',
    },
  });

  const phonesCategory = await prisma.category.upsert({
    where: { slug: 'phones' },
    update: {},
    create: {
      name: 'Phones',
      slug: 'phones',
      description: 'Smartphones & Mobile Devices',
      parentId: electronicsCategory.id,
    },
  });

  const appleBrand = await prisma.brand.upsert({
    where: { slug: 'apple' },
    update: {},
    create: {
      name: 'Apple Inc.',
      slug: 'apple',
      description: 'Premium Technology Brand',
    },
  });

  const colorAttribute = await prisma.attribute.upsert({
    where: { slug: 'color' },
    update: {},
    create: {
      name: 'Color',
      slug: 'color',
      type: 'COLOUR_SWATCH',
      values: {
        create: [
          { value: 'Space Black', slug: 'space-black', hexCode: '#1c1c1e' },
          { value: 'Silver', slug: 'silver', hexCode: '#e3e4e5' },
        ],
      },
    },
  });

  console.log('✅ Seeded sample catalog data (Electronics category, Apple brand, Color attribute).');
  console.log('🎉 Seeding complete successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
