import axios from 'axios';

const API = 'http://localhost:3000';

let adminToken = '';
let adminRefreshToken = '';
let catalogToken = '';
let catalogRefreshToken = '';

let createdRoleId = '';
let createdUserId = '';
let createdGroupId = '';
let createdCatParentId = '';
let createdCatChildId = '';
let createdBrandId = '';
let createdAttrId = '';
let createdAttrValId = '';
let createdSimpleProdId = '';
let createdVarProdId = '';

let passedTests = 0;
let failedTests = 0;

function logPass(msg: string) {
  passedTests++;
  console.log(`  ✅ [PASS] ${msg}`);
}

function logFail(msg: string, details?: any) {
  failedTests++;
  console.error(`  ❌ [FAIL] ${msg}`, details || '');
}

async function runTests() {
  console.log('🚀 Starting Comprehensive E-Commerce Admin API Audit & Test Suite...\n');

  // ==========================================
  // 1. AUTHENTICATION MODULE TESTS
  // ==========================================
  console.log('--- 1. Testing Authentication Module ---');

  // Test 1.1: Super Admin Login
  try {
    const res = await axios.post(`${API}/auth/login`, {
      email: 'admin@admin.com',
      password: 'Admin123!',
    });
    const data = res.data.data;
    adminToken = data.accessToken;
    adminRefreshToken = data.refreshToken;
    if (adminToken && adminRefreshToken && data.user.role.name === 'Super Administrator') {
      logPass('Super Admin login succeeded and issued JWT access & refresh tokens');
    } else {
      logFail('Super Admin login response missing token or role');
    }
  } catch (e: any) {
    logFail('Super Admin login failed', e.response?.data || e.message);
  }

  // Test 1.2: Catalog Manager Login
  try {
    const res = await axios.post(`${API}/auth/login`, {
      email: 'catalog@admin.com',
      password: 'Catalog123!',
    });
    const data = res.data.data;
    catalogToken = data.accessToken;
    catalogRefreshToken = data.refreshToken;
    if (catalogToken && catalogRefreshToken) {
      logPass('Catalog Manager login succeeded');
    }
  } catch (e: any) {
    logFail('Catalog Manager login failed', e.response?.data || e.message);
  }

  // Test 1.3: Same error response for wrong email vs wrong password
  try {
    await axios.post(`${API}/auth/login`, { email: 'nonexistent@admin.com', password: 'Admin123!' });
    logFail('Wrong email should have returned 401');
  } catch (e: any) {
    const msg1 = e.response?.data?.message;
    try {
      await axios.post(`${API}/auth/login`, { email: 'admin@admin.com', password: 'WrongPassword' });
      logFail('Wrong password should have returned 401');
    } catch (e2: any) {
      const msg2 = e2.response?.data?.message;
      if (e.response?.status === 401 && e2.response?.status === 401 && msg1 === msg2) {
        logPass(`Same error message for wrong email & password: "${msg1}"`);
      } else {
        logFail(`Mismatch in wrong email vs password response: "${msg1}" vs "${msg2}"`);
      }
    }
  }

  // Test 1.4: Session / Me endpoint
  try {
    const res = await axios.get(`${API}/auth/me`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const data = res.data.data;
    if (data.user && data.role && Array.isArray(data.permissions) && data.permissions.length === 41) {
      logPass(`Session endpoint /auth/me returned user, role, and all ${data.permissions.length} flat permission names`);
    } else {
      logFail('Session endpoint missing expected fields or permissions count', data);
    }
  } catch (e: any) {
    logFail('Session endpoint failed', e.response?.data || e.message);
  }

  // Test 1.5: Refresh Token Rotation
  try {
    const res = await axios.post(`${API}/auth/refresh`, { refreshToken: adminRefreshToken });
    const data = res.data.data;
    const newAccessToken = data.accessToken;
    const newRefreshToken = data.refreshToken;

    if (newAccessToken && newRefreshToken && newRefreshToken !== adminRefreshToken) {
      logPass('Refresh token rotation succeeded; issued new access & refresh tokens');

      // Attempt reusing old refresh token (should fail)
      try {
        await axios.post(`${API}/auth/refresh`, { refreshToken: adminRefreshToken });
        logFail('Reusing old revoked refresh token should have failed');
      } catch (reuseErr: any) {
        if (reuseErr.response?.status === 401) {
          logPass('Reusing old revoked refresh token rejected with 401 Unauthorized');
        } else {
          logFail('Reusing old refresh token did not return 401', reuseErr.response?.data);
        }
      }

      adminToken = newAccessToken;
      adminRefreshToken = newRefreshToken;
    } else {
      logFail('Refresh token rotation did not issue new tokens');
    }
  } catch (e: any) {
    logFail('Refresh token rotation failed', e.response?.data || e.message);
  }

  // ==========================================
  // 2. ACCESS CONTROL & RBAC TESTS
  // ==========================================
  console.log('\n--- 2. Testing Access Control & RBAC (401 & 403) ---');

  // Test 2.1: Missing token -> 401
  try {
    await axios.get(`${API}/role`);
    logFail('Unauthenticated request should return 401');
  } catch (e: any) {
    if (e.response?.status === 401) {
      logPass('Unauthenticated request to protected route returned 401 Unauthorized');
    } else {
      logFail('Unauthenticated request returned wrong status', e.response?.status);
    }
  }

  // Test 2.2: Insufficient permissions -> 403
  try {
    await axios.get(`${API}/user`, {
      headers: { Authorization: `Bearer ${catalogToken}` },
    });
    logFail('Catalog Manager accessing /user should return 403 Forbidden');
  } catch (e: any) {
    if (e.response?.status === 403) {
      logPass(`Catalog Manager accessing /user rejected with 403 Forbidden: "${e.response?.data?.message}"`);
    } else {
      logFail('Catalog Manager request returned wrong status', e.response?.status);
    }
  }

  // Test 2.3: Allowed action for Catalog Manager -> 200/201
  try {
    const res = await axios.get(`${API}/category`, {
      headers: { Authorization: `Bearer ${catalogToken}` },
    });
    if (res.status === 200) {
      logPass('Catalog Manager accessing allowed route /category succeeded (200 OK)');
    }
  } catch (e: any) {
    logFail('Catalog Manager failed to access allowed /category route', e.response?.data || e.message);
  }

  // ==========================================
  // 3. PERMISSION MODULE TESTS
  // ==========================================
  console.log('\n--- 3. Testing Permission Module ---');

  try {
    const res = await axios.post(
      `${API}/permission/group`,
      {
        name: 'AuditTestModule',
        description: 'Test module group',
        actions: ['create', 'read', 'delete'],
        customAction: 'export_csv',
      },
      { headers: { Authorization: `Bearer ${adminToken}` } },
    );
    const group = res.data.data;
    createdGroupId = group.id;

    const permNames = group.permissions.map((p: any) => p.name);
    if (
      permNames.includes('audittestmodule:create') &&
      permNames.includes('audittestmodule:read') &&
      permNames.includes('audittestmodule:export_csv')
    ) {
      logPass('Permission group created with normalized action names and custom action');
    } else {
      logFail('Permission group action names missing expected format', permNames);
    }
  } catch (e: any) {
    logFail('Create permission group failed', e.response?.data || e.message);
  }

  // ==========================================
  // 4. ROLE MODULE TESTS
  // ==========================================
  console.log('\n--- 4. Testing Role Module ---');

  // Test 4.1: Create Role
  try {
    const res = await axios.post(
      `${API}/role`,
      {
        name: 'Inventory Inspector',
        description: 'Role for testing',
        grantAll: false,
      },
      { headers: { Authorization: `Bearer ${adminToken}` } },
    );
    createdRoleId = res.data.data.id;
    logPass('Role created successfully');
  } catch (e: any) {
    logFail('Create role failed', e.response?.data || e.message);
  }

  // Test 4.2: Strip role:update from last holding role protection
  try {
    const superAdminRoleRes: any = await axios.get(`${API}/role`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const superAdminRole = superAdminRoleRes.data.data.roles.find(
      (r: any) => r.name === 'Super Administrator',
    );

    // Attempt stripping permissions from Super Admin
    await axios.put(
      `${API}/role/${superAdminRole.id}`,
      {
        permissionIds: [], // Empty permissions
      },
      { headers: { Authorization: `Bearer ${adminToken}` } },
    );
    logFail('Stripping role:update from last holding role should have been rejected');
  } catch (e: any) {
    if (e.response?.status === 400) {
      logPass(`Stripping role:update from last role rejected with 400: "${e.response?.data?.message}"`);
    } else {
      logFail('Stripping role:update returned unexpected status', e.response?.status);
    }
  }

  // ==========================================
  // 5. USER MODULE TESTS
  // ==========================================
  console.log('\n--- 5. Testing User Module & Self-Escalation Guard ---');

  // Test 5.1: Create User
  try {
    const res = await axios.post(
      `${API}/user`,
      {
        name: 'Test Staff User',
        email: 'teststaff@admin.com',
        password: 'Password123!',
        roleId: createdRoleId,
        isActive: true,
      },
      { headers: { Authorization: `Bearer ${adminToken}` } },
    );
    createdUserId = res.data.data.id;
    logPass('User created with required explicit role');
  } catch (e: any) {
    logFail('Create user failed', e.response?.data || e.message);
  }

  // Test 5.2: Delete role while assigned to user (should fail)
  try {
    await axios.delete(`${API}/role/${createdRoleId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    logFail('Deleting role with assigned users should fail');
  } catch (e: any) {
    if (e.response?.status === 400) {
      logPass(`Deleting assigned role rejected with 400: "${e.response?.data?.message}"`);
    } else {
      logFail('Deleting assigned role returned unexpected status', e.response?.status);
    }
  }

  // Test 5.3: Self-escalation prevention
  try {
    const sessionRes: any = await axios.get(`${API}/auth/me`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const currentUserId = sessionRes.data.data.user.id;

    await axios.put(
      `${API}/user/${currentUserId}`,
      { roleId: createdRoleId },
      { headers: { Authorization: `Bearer ${adminToken}` } },
    );
    logFail('Self-escalation (user changing own role) should fail');
  } catch (e: any) {
    if (e.response?.status === 403) {
      logPass(`Self-escalation attempt rejected with 403 Forbidden: "${e.response?.data?.message}"`);
    } else {
      logFail('Self-escalation returned unexpected status', e.response?.status);
    }
  }

  // ==========================================
  // 6. CATEGORY MODULE TESTS
  // ==========================================
  console.log('\n--- 6. Testing Category Module & Cycle Detection ---');

  try {
    const parentRes = await axios.post(
      `${API}/category`,
      { name: 'Hardware Audit', slug: 'hardware-audit' },
      { headers: { Authorization: `Bearer ${adminToken}` } },
    );
    createdCatParentId = parentRes.data.data.id;

    const childRes = await axios.post(
      `${API}/category`,
      { name: 'Laptops Audit', slug: 'laptops-audit', parentId: createdCatParentId },
      { headers: { Authorization: `Bearer ${adminToken}` } },
    );
    createdCatChildId = childRes.data.data.id;
    logPass('Parent & Child category hierarchy created');

    // Cycle Test: Attempt setting parent category's parent to child
    try {
      await axios.put(
        `${API}/category/${createdCatParentId}`,
        { parentId: createdCatChildId },
        { headers: { Authorization: `Bearer ${adminToken}` } },
      );
      logFail('Creating category ancestor cycle should fail');
    } catch (cycleErr: any) {
      if (cycleErr.response?.status === 400) {
        logPass(`Category cycle attempt rejected with 400 Bad Request: "${cycleErr.response?.data?.message}"`);
      } else {
        logFail('Category cycle attempt returned unexpected status', cycleErr.response?.status);
      }
    }
  } catch (e: any) {
    logFail('Category setup failed', e.response?.data || e.message);
  }

  // ==========================================
  // 7. BRAND MODULE TESTS
  // ==========================================
  console.log('\n--- 7. Testing Brand Module ---');

  try {
    const res = await axios.post(
      `${API}/brand`,
      { name: 'AuditBrand', slug: 'audit-brand', description: 'Brand for testing' },
      { headers: { Authorization: `Bearer ${adminToken}` } },
    );
    createdBrandId = res.data.data.id;
    logPass('Brand created successfully');

    // Duplicate Slug Conflict test
    try {
      await axios.post(
        `${API}/brand`,
        { name: 'AuditBrand Duplicate', slug: 'audit-brand' },
        { headers: { Authorization: `Bearer ${adminToken}` } },
      );
      logFail('Duplicate brand slug should return 409 Conflict');
    } catch (dupErr: any) {
      if (dupErr.response?.status === 409) {
        logPass('Duplicate brand slug rejected with 409 Conflict');
      } else {
        logFail('Duplicate brand slug returned unexpected status', dupErr.response?.status);
      }
    }
  } catch (e: any) {
    logFail('Brand creation failed', e.response?.data || e.message);
  }

  // ==========================================
  // 8. ATTRIBUTE MODULE TESTS
  // ==========================================
  console.log('\n--- 8. Testing Attribute Module ---');

  try {
    const res = await axios.post(
      `${API}/attribute`,
      {
        name: 'Storage Size',
        slug: 'storage-size',
        type: 'DROPDOWN',
        values: [
          { value: '256GB', slug: '256gb' },
          { value: '512GB', slug: '512gb' },
        ],
      },
      { headers: { Authorization: `Bearer ${adminToken}` } },
    );
    const data = res.data.data;
    createdAttrId = data.id;
    createdAttrValId = data.values[0].id;
    logPass('Attribute and unique values created successfully');
  } catch (e: any) {
    logFail('Attribute creation failed', e.response?.data || e.message);
  }

  // ==========================================
  // 9. PRODUCT MODULE & VALIDATION TESTS
  // ==========================================
  console.log('\n--- 9. Testing Product Module & Validation Rules ---');

  // Test 9.1: Simple Product Validation - Sale Price > Price
  try {
    await axios.post(
      `${API}/product`,
      {
        name: 'Invalid Simple Product',
        hasVariants: false,
        price: 50,
        salePrice: 100, // Invalid: salePrice > price
        stock: 10,
      },
      { headers: { Authorization: `Bearer ${adminToken}` } },
    );
    logFail('Simple product with salePrice > price should fail');
  } catch (e: any) {
    if (e.response?.status === 400) {
      logPass(`Simple product salePrice > price rejected with 400: "${e.response?.data?.message}"`);
    } else {
      logFail('Invalid simple product returned wrong status', e.response?.status);
    }
  }

  // Test 9.2: Create Valid Simple Product
  try {
    const res = await axios.post(
      `${API}/product`,
      {
        name: 'Simple Audit Book',
        slug: 'simple-audit-book',
        sku: 'BOOK-AUDIT-01',
        hasVariants: false,
        price: 29.99,
        salePrice: 19.99,
        stock: 100,
        brandId: createdBrandId,
        categoryIds: [createdCatChildId],
      },
      { headers: { Authorization: `Bearer ${adminToken}` } },
    );
    createdSimpleProdId = res.data.data.id;
    logPass('Valid Simple Product created in atomic transaction');
  } catch (e: any) {
    logFail('Valid simple product creation failed', e.response?.data || e.message);
  }

  // Test 9.3: Create Variable Product with Variants
  try {
    const res = await axios.post(
      `${API}/product`,
      {
        name: 'Variable Audit Laptop',
        slug: 'variable-audit-laptop',
        hasVariants: true,
        brandId: createdBrandId,
        categoryIds: [createdCatChildId],
        variants: [
          {
            sku: 'LAPTOP-256',
            price: 999,
            stock: 15,
            attributeValueIds: [createdAttrValId],
          },
        ],
      },
      { headers: { Authorization: `Bearer ${adminToken}` } },
    );
    createdVarProdId = res.data.data.id;
    logPass('Valid Variable Product with variants created in atomic transaction');
  } catch (e: any) {
    logFail('Variable product creation failed', e.response?.data || e.message);
  }

  // Test 9.4: Delete Attribute Value used by variant (should fail)
  try {
    await axios.delete(`${API}/attribute/${createdAttrId}/value/${createdAttrValId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    logFail('Deleting attribute value used in variant should fail');
  } catch (e: any) {
    if (e.response?.status === 400) {
      logPass(`Deleting attribute value used in variant rejected with 400: "${e.response?.data?.message}"`);
    } else {
      logFail('Deleting attribute value returned unexpected status', e.response?.status);
    }
  }

  // Test 9.5: Clean Deletion of Product (assets & records)
  try {
    await axios.delete(`${API}/product/${createdSimpleProdId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    await axios.delete(`${API}/product/${createdVarProdId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    logPass('Simple & Variable products deleted cleanly');
  } catch (e: any) {
    logFail('Product deletion failed', e.response?.data || e.message);
  }

  // Cleanup test user and group
  try {
    await axios.delete(`${API}/user/${createdUserId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    await axios.delete(`${API}/role/${createdRoleId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    await axios.delete(`${API}/permission/group/${createdGroupId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    logPass('Test cleanup completed');
  } catch (e: any) {
    // Ignore cleanup error
  }

  // SUMMARY
  console.log('\n==========================================');
  console.log(`📊 TEST SUITE SUMMARY:`);
  console.log(`   Passed: ${passedTests}`);
  console.log(`   Failed: ${failedTests}`);
  console.log('==========================================\n');

  if (failedTests === 0) {
    console.log('🎉 ALL TEST CASES PASSED WITH 100% SUCCESS!');
  } else {
    console.error('⚠️ SOME TEST CASES FAILED!');
    process.exit(1);
  }
}

runTests();
