import React, { useEffect, useState } from 'react';
import { api } from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { Plus, Search, KeyRound, AlertTriangle, ShieldCheck, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface Permission {
  id: string;
  name: string;
  description?: string;
}

interface PermissionGroup {
  id: string;
  name: string;
  description?: string;
  permissions: Permission[];
}

export const PermissionPage: React.FC = () => {
  const { hasPermission } = useAuth();

  const [groups, setGroups] = useState<PermissionGroup[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [forbiddenError, setForbiddenError] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupDesc, setGroupDesc] = useState('');
  const [selectedActions, setSelectedActions] = useState<string[]>([
    'create',
    'read',
    'update',
    'delete',
    'watch',
  ]);
  const [customAction, setCustomAction] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const standardActions = [
    'create',
    'read',
    'update',
    'delete',
    'watch',
    'upload',
    'write',
    'approve',
    'status',
  ];

  const fetchPermissions = async (isInitial = false) => {
    if (isInitial && groups.length === 0) setIsLoading(true);
    setForbiddenError(null);
    try {
      const data: any = await api.get(`/permission?search=${search}`);
      setGroups(data.groups || []);
    } catch (err: any) {
      if (err.status === 403) {
        setForbiddenError(err.message || 'Access Forbidden: 403. You lack permission:read.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPermissions(groups.length === 0);
  }, [search]);

  const toggleAction = (action: string) => {
    if (selectedActions.includes(action)) {
      setSelectedActions(selectedActions.filter((a) => a !== action));
    } else {
      setSelectedActions([...selectedActions, action]);
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSaving(true);

    try {
      await api.post('/permission/group', {
        name: groupName,
        description: groupDesc,
        actions: selectedActions,
        customAction: customAction.trim() || undefined,
      });

      setIsModalOpen(false);
      setGroupName('');
      setGroupDesc('');
      setCustomAction('');
      fetchPermissions();
    } catch (err: any) {
      setFormError(err.message || 'Failed to create permission group');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteGroup = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete permission group '${name}'?`)) return;
    try {
      await api.delete(`/permission/group/${id}`);
      fetchPermissions();
    } catch (err: any) {
      alert(err.message || 'Failed to delete group');
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
      
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2.5">
            <KeyRound className="w-6 h-6 text-gray-900" />
            Permission Vocabulary
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Defines module-by-action capability grid used by the access control system.
          </p>
        </div>

        {hasPermission('permission:create') && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-black hover:bg-gray-800 text-white font-medium rounded-xl transition-all shadow-sm text-sm"
          >
            <Plus className="w-4 h-4" />
            Create Permission Group
          </button>
        )}
      </div>

      {/* Search Input */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search module or permission..."
          className="w-full bg-white border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl pl-10 pr-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none shadow-sm transition-all"
        />
      </div>

      {/* Permission Matrix Grid */}
      {isLoading && groups.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <div key={n} className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm animate-pulse space-y-4">
              <div className="h-5 bg-gray-200 rounded w-1/3"></div>
              <div className="h-4 bg-gray-100 rounded w-2/3"></div>
              <div className="space-y-2 pt-2">
                <div className="h-8 bg-gray-100 rounded-lg"></div>
                <div className="h-8 bg-gray-100 rounded-lg"></div>
              </div>
            </div>
          ))}
        </div>
      ) : groups.length === 0 ? (
        <div className="text-center py-12 bg-white border border-gray-200 rounded-2xl text-gray-500 shadow-sm text-sm">
          No permission groups found matching your search.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {groups.map((group) => (
            <motion.div 
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              key={group.id} 
              className="bg-white border border-gray-200 rounded-2xl p-6 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow"
            >
              <div>
                <div className="flex items-start justify-between mb-4 pb-4 border-b border-gray-100">
                  <div>
                    <h3 className="font-semibold text-gray-900 text-lg">{group.name}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">{group.description || 'Module group'}</p>
                  </div>
                  {hasPermission('permission:delete') && (
                    <button
                      onClick={() => handleDeleteGroup(group.id, group.name)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete Group"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  {group.permissions.map((perm) => (
                    <div
                      key={perm.id}
                      className="flex items-center justify-between px-3 py-2 rounded-lg bg-gray-50 border border-gray-100 text-xs"
                    >
                      <span className="font-mono text-gray-900 font-semibold">{perm.name}</span>
                      <span className="text-gray-500 truncate ml-2 text-right">{perm.description}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500 font-medium">
                <span>{group.permissions.length} Action(s)</span>
                <span className="font-mono bg-gray-100 text-gray-700 px-2 py-0.5 rounded">Module: {group.name.toLowerCase()}</span>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Modal for Creating Permission Group */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white border border-gray-200 rounded-2xl p-6 w-full max-w-lg shadow-xl"
          >
            <h2 className="text-lg font-bold text-gray-900 mb-5">Create Permission Group</h2>

            {formError && (
              <div className="mb-5 p-3 rounded-lg bg-red-50 border border-red-100 text-red-600 text-sm">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateGroup} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Group Name (Module Name)
                </label>
                <input
                  type="text"
                  required
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="e.g. Order"
                  className="w-full bg-white border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-lg px-3.5 py-2 text-sm text-gray-900 outline-none transition-all shadow-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={groupDesc}
                  onChange={(e) => setGroupDesc(e.target.value)}
                  placeholder="Module capability description"
                  className="w-full bg-white border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-lg px-3.5 py-2 text-sm text-gray-900 outline-none transition-all shadow-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  Select Actions
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {standardActions.map((action) => (
                    <button
                      key={action}
                      type="button"
                      onClick={() => toggleAction(action)}
                      className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all text-left flex items-center justify-between ${
                        selectedActions.includes(action)
                          ? 'bg-blue-50 border-blue-200 text-blue-700 font-semibold'
                          : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <span>{action}</span>
                      {selectedActions.includes(action) && <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Custom Action Name (Optional)
                </label>
                <input
                  type="text"
                  value={customAction}
                  onChange={(e) => setCustomAction(e.target.value)}
                  placeholder="e.g. export, refund"
                  className="w-full bg-white border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-lg px-3.5 py-2 text-sm text-gray-900 outline-none transition-all shadow-sm"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-5 mt-5 border-t border-gray-100">
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
                  {isSaving ? 'Creating...' : 'Create Group'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

