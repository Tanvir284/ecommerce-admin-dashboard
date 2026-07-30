import React, { useEffect, useState } from 'react';
import { api } from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, Plus, Search, Edit2, Trash2, Users, CheckSquare, Square, AlertTriangle } from 'lucide-react';

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

  const fetchData = async () => {
    setIsLoading(true);
    setForbiddenError(null);
    try {
      const [rolesRes, permsRes]: any = await Promise.all([
        api.get(`/role?search=${search}`),
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
    fetchData();
  }, [search]);

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
      <div className="p-8 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-4 text-red-400">
        <AlertTriangle className="w-8 h-8 shrink-0" />
        <div>
          <h3 className="font-bold text-lg">403 Forbidden Access</h3>
          <p className="text-sm mt-1">{forbiddenError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-3">
            <ShieldCheck className="w-6 h-6 text-emerald-400" />
            Role Management
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Bundles of permissions handed to users. Select permissions using module-by-action grid.
          </p>
        </div>

        {hasPermission('role:create') && (
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold rounded-xl transition-all shadow-lg shadow-emerald-500/20 text-sm"
          >
            <Plus className="w-4 h-4" />
            Create Role
          </button>
        )}
      </div>

      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search roles..."
          className="w-full bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 outline-none"
        />
      </div>

      {/* Role Cards Table */}
      {isLoading ? (
        <div className="text-center py-12 text-slate-400">Loading roles...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {roles.map((role) => (
            <div key={role.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-3">
                  <div>
                    <h3 className="font-bold text-slate-100 text-lg flex items-center gap-2">
                      {role.name}
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                        role.status === 'ACTIVE'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-slate-800 text-slate-400'
                      }`}>
                        {role.status}
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">{role.description || 'No description'}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Users className="w-4 h-4 text-amber-400" />
                    <span>Assigned Users: <strong className="text-slate-200">{role.userCount}</strong></span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>Granted Permissions: <strong className="text-slate-200">{role.permissions.length}</strong></span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-end gap-2">
                {hasPermission('role:update') && (
                  <button
                    onClick={() => openEditModal(role)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" /> Edit Grid
                  </button>
                )}
                {hasPermission('role:delete') && (
                  <button
                    onClick={() => handleDeleteRole(role.id, role.name)}
                    className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                    title="Delete Role"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal for Creating / Editing Role Grid */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-4xl shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
              <h2 className="text-xl font-bold text-slate-100">
                {editingRoleId ? `Edit Role: ${roleName}` : 'Create New Role'}
              </h2>
              <button
                type="button"
                onClick={toggleSelectAll}
                className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg text-xs font-medium hover:bg-emerald-500/20"
              >
                <CheckSquare className="w-4 h-4" />
                Select / Deselect All
              </button>
            </div>

            {formError && (
              <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveRole} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Role Name
                  </label>
                  <input
                    type="text"
                    required
                    value={roleName}
                    onChange={(e) => setRoleName(e.target.value)}
                    placeholder="e.g. Sales Manager"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-sm text-slate-100 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Status
                  </label>
                  <select
                    value={roleStatus}
                    onChange={(e: any) => setRoleStatus(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-sm text-slate-100 outline-none"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Description
                  </label>
                  <input
                    type="text"
                    value={roleDesc}
                    onChange={(e) => setRoleDesc(e.target.value)}
                    placeholder="Role job function description"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-sm text-slate-100 outline-none"
                  />
                </div>
              </div>

              {/* Module-by-Action Permission Grid */}
              <div>
                <h3 className="text-sm font-semibold text-slate-300 mb-3">Module-by-Action Permissions Grid</h3>

                <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2">
                  {permissionGroups.map((group) => (
                    <div key={group.id} className="bg-slate-950 border border-slate-800/80 rounded-xl p-4">
                      <div className="font-semibold text-slate-200 text-sm mb-3 border-b border-slate-800/60 pb-2">
                        {group.name} Module
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                        {group.permissions.map((perm) => {
                          const isChecked = selectedPermIds.includes(perm.id);
                          return (
                            <button
                              key={perm.id}
                              type="button"
                              onClick={() => togglePermission(perm.id)}
                              className={`p-2.5 rounded-lg border text-xs text-left transition-all flex items-start gap-2.5 ${
                                isChecked
                                  ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'
                              }`}
                            >
                              {isChecked ? (
                                <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                              ) : (
                                <Square className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" />
                              )}
                              <span className="font-mono">{perm.name.split(':')[1]}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold rounded-xl text-sm transition-all"
                >
                  {isSaving ? 'Saving...' : 'Save Role'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
