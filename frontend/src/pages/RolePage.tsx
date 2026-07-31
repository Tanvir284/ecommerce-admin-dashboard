import React, { useEffect, useState } from 'react';
import { api } from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useDebounce } from '../hooks/useDebounce';
import { ShieldCheck, Plus, Search, Edit2, Trash2, Users, CheckSquare, Square, AlertTriangle, UserCog } from 'lucide-react';
import { motion } from 'framer-motion';

interface Permission {
  id: string;
  name: string;
  description?: string;
  groupId: string;
}

interface PermissionGroup {
  id: string;
  name: string;
  permissions: Permission[];
}

interface Role {
  id: string;
  name: string;
  description?: string;
  status: 'ACTIVE' | 'INACTIVE';
  userCount: number;
  permissions: Permission[];
}

export const RolePage: React.FC = () => {
  const { hasPermission } = useAuth();

  const [roles, setRoles] = useState<Role[]>([]);
  const [permissionGroups, setPermissionGroups] = useState<PermissionGroup[]>([]);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 400);
  const [isLoading, setIsLoading] = useState(true);
  const [forbiddenError, setForbiddenError] = useState<string | null>(null);

  // Form / Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [roleName, setRoleName] = useState('');
  const [roleDesc, setRoleDesc] = useState('');
  const [roleStatus, setRoleStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [selectedPermIds, setSelectedPermIds] = useState<string[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const fetchData = async (isInitial = false) => {
    if (isInitial && roles.length === 0) setIsLoading(true);
    setForbiddenError(null);
    try {
      const [rolesRes, permsRes]: any = await Promise.all([
        api.get(`/role?search=${debouncedSearch}`),
        api.get('/permission'),
      ]);
      setRoles(rolesRes.roles || []);
      setPermissionGroups(permsRes.groups || []);
    } catch (err: any) {
      if (err.status === 403) {
        setForbiddenError(err.message || 'Access Forbidden: 403.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData(roles.length === 0);
  }, [debouncedSearch]);

  const openCreateModal = () => {
    setEditingRoleId(null);
    setRoleName('');
    setRoleDesc('');
    setRoleStatus('ACTIVE');
    setSelectedPermIds([]);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (role: Role) => {
    setEditingRoleId(role.id);
    setRoleName(role.name);
    setRoleDesc(role.description || '');
    setRoleStatus(role.status);
    setSelectedPermIds(role.permissions.map((p) => p.id));
    setFormError(null);
    setIsModalOpen(true);
  };

  const togglePermission = (permId: string) => {
    if (selectedPermIds.includes(permId)) {
      setSelectedPermIds(selectedPermIds.filter((id) => id !== permId));
    } else {
      setSelectedPermIds([...selectedPermIds, permId]);
    }
  };

  const toggleSelectAll = () => {
    const allIds = permissionGroups.flatMap((g) => g.permissions.map((p) => p.id));
    if (selectedPermIds.length === allIds.length) {
      setSelectedPermIds([]);
    } else {
      setSelectedPermIds(allIds);
    }
  };

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSaving(true);

    try {
      const payload = {
        name: roleName,
        description: roleDesc,
        status: roleStatus,
        permissionIds: selectedPermIds,
      };

      if (editingRoleId) {
        await api.put(`/role/${editingRoleId}`, payload);
      } else {
        await api.post('/role', payload);
      }

      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save role');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteRole = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete role '${name}'?`)) return;
    try {
      await api.delete(`/role/${id}`);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete role');
    }
  };

  if (forbiddenError) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-4 text-red-700 shadow-sm">
        <AlertTriangle className="w-6 h-6 shrink-0 mt-0.5" />
        <div>
          <h3 className="font-semibold text-base">403 Forbidden Access</h3>
          <p className="text-sm mt-1">{forbiddenError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2.5">
            <UserCog className="w-6 h-6 text-gray-900" />
            Role Management
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Bundles of permissions handed to users. Select permissions using module-by-action grid.
          </p>
        </div>

        {hasPermission('role:create') && (
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-black hover:bg-gray-800 text-white font-medium rounded-xl transition-all shadow-sm text-sm"
          >
            <Plus className="w-4 h-4" />
            Create Role
          </button>
        )}
      </div>

      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search roles..."
          className="w-full bg-white border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl pl-10 pr-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none shadow-sm transition-all"
        />
      </div>

      {/* Role Cards Grid */}
      {isLoading && roles.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <div key={n} className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm animate-pulse space-y-4">
              <div className="h-5 bg-gray-200 rounded w-1/3"></div>
              <div className="h-4 bg-gray-100 rounded w-2/3"></div>
            </div>
          ))}
        </div>
      ) : roles.length === 0 ? (
        <div className="text-center py-12 bg-white border border-gray-200 rounded-2xl text-gray-500 shadow-sm text-sm">
          No roles found.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {roles.map((role) => (
            <motion.div 
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              key={role.id} 
              className="bg-white border border-gray-200 rounded-2xl p-6 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow"
            >
              <div>
                <div className="flex items-center justify-between mb-3 border-b border-gray-100 pb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900 text-lg flex items-center gap-2">
                      {role.name}
                      <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                        role.status === 'ACTIVE'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-gray-100 text-gray-600 border border-gray-200'
                      }`}>
                        {role.status}
                      </span>
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">{role.description || 'No description'}</p>
                  </div>
                </div>

                <div className="space-y-2 mt-4">
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <Users className="w-4 h-4 text-gray-400" />
                    <span>Assigned Users: <strong className="text-gray-900">{role.userCount}</strong></span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <ShieldCheck className="w-4 h-4 text-gray-400" />
                    <span>Granted Permissions: <strong className="text-gray-900">{role.permissions.length}</strong></span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-end gap-2">
                {hasPermission('role:update') && (
                  <button
                    onClick={() => openEditModal(role)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" /> Edit Grid
                  </button>
                )}
                {hasPermission('role:delete') && (
                  <button
                    onClick={() => handleDeleteRole(role.id, role.name)}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete Role"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Modal for Creating / Editing Role Grid */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4 overflow-y-auto">
          <motion.div 
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white border border-gray-200 rounded-2xl p-6 w-full max-w-4xl shadow-xl my-8"
          >
            <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-6">
              <h2 className="text-lg font-bold text-gray-900">
                {editingRoleId ? `Edit Role: ${roleName}` : 'Create New Role'}
              </h2>
              <button
                type="button"
                onClick={toggleSelectAll}
                className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-medium transition-colors"
              >
                <CheckSquare className="w-3.5 h-3.5" />
                Select / Deselect All
              </button>
            </div>

            {formError && (
              <div className="mb-6 p-3.5 rounded-lg bg-red-50 border border-red-100 text-red-600 text-sm font-medium">
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveRole} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Role Name
                  </label>
                  <input
                    type="text"
                    required
                    value={roleName}
                    onChange={(e) => setRoleName(e.target.value)}
                    placeholder="e.g. Sales Manager"
                    className="w-full bg-white border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-lg px-3.5 py-2 text-sm text-gray-900 outline-none transition-all shadow-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={roleStatus}
                    onChange={(e: any) => setRoleStatus(e.target.value)}
                    className="w-full bg-white border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-lg px-3.5 py-2 text-sm text-gray-900 outline-none transition-all shadow-sm"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <input
                    type="text"
                    value={roleDesc}
                    onChange={(e) => setRoleDesc(e.target.value)}
                    placeholder="Role job function description"
                    className="w-full bg-white border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-lg px-3.5 py-2 text-sm text-gray-900 outline-none transition-all shadow-sm"
                  />
                </div>
              </div>

              {/* Module-by-Action Permission Grid */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Module-by-Action Permissions Grid</h3>

                <div className="space-y-4 max-h-[45vh] overflow-y-auto pr-2 custom-scrollbar">
                  {permissionGroups.map((group) => (
                    <div key={group.id} className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                      <div className="font-semibold text-gray-900 text-sm mb-3 pb-2 border-b border-gray-200">
                        {group.name} Module
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
                        {group.permissions.map((perm) => {
                          const isChecked = selectedPermIds.includes(perm.id);
                          return (
                            <button
                              key={perm.id}
                              type="button"
                              onClick={() => togglePermission(perm.id)}
                              className={`p-2.5 rounded-lg border text-xs text-left transition-all flex items-center justify-between ${
                                isChecked
                                  ? 'bg-blue-50 border-blue-200 text-blue-700 font-semibold'
                                  : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-100'
                              }`}
                            >
                              <span className="font-mono">{perm.name.split(':')[1]}</span>
                              {isChecked ? (
                                <CheckSquare className="w-4 h-4 text-blue-600 shrink-0" />
                              ) : (
                                <Square className="w-4 h-4 text-gray-300 shrink-0" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-5 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 bg-black hover:bg-gray-800 text-white font-medium rounded-lg text-sm transition-all shadow-sm"
                >
                  {isSaving ? 'Saving...' : 'Save Role'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

