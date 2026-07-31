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

  const fetchPermissions = async () => {
    setIsLoading(true);
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
    fetchPermissions();
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
      <div className="p-8 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-4 text-red-700">
        <AlertTriangle className="w-8 h-8 shrink-0" />
        <div>
          <h3 className="font-bold text-lg">403 Forbidden Access</h3>
          <p className="text-sm mt-1">{forbiddenError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-100 flex items-center gap-3 drop-shadow-sm">
            <KeyRound className="w-8 h-8 text-[#00e676]" />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-700">Permission Vocabulary</span>
          </h1>
          <p className="text-[15px] text-gray-500 mt-2 font-medium">
            Defines module-by-action capability grid used by the access control system.
          </p>
        </div>

        {hasPermission('permission:create') && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#00e676] hover:bg-[#00c853] text-[#0f172a] font-bold rounded-xl transition-all shadow-[0_4px_14px_0_rgba(0,230,118,0.39)] text-sm h-[42px]"
          >
            <Plus className="w-4 h-4 font-bold" />
            Create Permission Group
          </button>
        )}
      </div>

      {/* Search Input */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search module or permission..."
          className="w-full bg-[#111827] border border-[#1f2937] focus:border-[#00e676] rounded-xl pl-11 pr-4 py-3 text-sm text-gray-100 placeholder-gray-500 outline-none shadow-sm transition-colors"
        />
      </div>

      {/* Permission Matrix Grid */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-400 font-medium">Loading permissions...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {groups.map((group) => (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={group.id} 
              className="bg-[#111827] rounded-[1.25rem] p-6 flex flex-col justify-between shadow-xl border border-[#1f2937]/50"
            >
              <div>
                <div className="flex items-start justify-between mb-4 pb-4 border-b border-[#1f2937]">
                  <div>
                    <h3 className="font-bold text-white text-xl tracking-tight">{group.name}</h3>
                    <p className="text-[13px] text-gray-400 mt-1 font-medium">{group.description || 'Module group'}</p>
                  </div>
                  {hasPermission('permission:delete') && (
                    <button
                      onClick={() => handleDeleteGroup(group.id, group.name)}
                      className="p-1.5 text-gray-500 hover:text-red-400 rounded-lg transition-colors mt-0.5"
                      title="Delete Group"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="space-y-2.5">
                  {group.permissions.map((perm) => (
                    <div
                      key={perm.id}
                      className="flex items-center justify-between px-3.5 py-2.5 rounded-lg bg-[#0b0f19] border border-[#1f2937] text-[13px]"
                    >
                      <span className="font-mono text-[#00e676] font-semibold tracking-wide">{perm.name}</span>
                      <span className="text-gray-400 font-medium truncate ml-4 text-right">{perm.description}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-[#1f2937] flex items-center justify-between text-xs text-gray-500 font-medium tracking-wide">
                <span>{group.permissions.length} Action(s)</span>
                <span className="font-mono">Module: {group.name.toLowerCase()}</span>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Modal for Creating Permission Group */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#111827] border border-[#1f2937] rounded-[1.5rem] p-7 w-full max-w-lg shadow-2xl"
          >
            <h2 className="text-xl font-bold text-white mb-6 tracking-tight">Create Permission Group</h2>

            {formError && (
              <div className="mb-6 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateGroup} className="space-y-5">
              <div>
                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">
                  Group Name (Module Name)
                </label>
                <input
                  type="text"
                  required
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="e.g. Order"
                  className="w-full bg-[#0b0f19] border border-[#1f2937] focus:border-[#00e676] rounded-xl px-4 py-3 text-sm text-white outline-none transition-colors shadow-inner"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">
                  Description
                </label>
                <input
                  type="text"
                  value={groupDesc}
                  onChange={(e) => setGroupDesc(e.target.value)}
                  placeholder="Module capability description"
                  className="w-full bg-[#0b0f19] border border-[#1f2937] focus:border-[#00e676] rounded-xl px-4 py-3 text-sm text-white outline-none transition-colors shadow-inner"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2.5">
                  Select Actions
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  {standardActions.map((action) => (
                    <button
                      key={action}
                      type="button"
                      onClick={() => toggleAction(action)}
                      className={`px-3 py-2.5 rounded-xl text-xs font-bold border transition-all text-left flex items-center justify-between ${
                        selectedActions.includes(action)
                          ? 'bg-[#00e676]/10 border-[#00e676]/30 text-[#00e676]'
                          : 'bg-[#0b0f19] border-[#1f2937] text-gray-500 hover:text-gray-300'
                      }`}
                    >
                      <span>{action}</span>
                      {selectedActions.includes(action) && <ShieldCheck className="w-4 h-4 text-[#00e676]" />}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">
                  Custom Action Name (Optional)
                </label>
                <input
                  type="text"
                  value={customAction}
                  onChange={(e) => setCustomAction(e.target.value)}
                  placeholder="e.g. export, refund"
                  className="w-full bg-[#0b0f19] border border-[#1f2937] focus:border-[#00e676] rounded-xl px-4 py-3 text-sm text-white outline-none transition-colors shadow-inner"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-6 mt-6 border-t border-[#1f2937]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 text-sm font-semibold text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2.5 bg-[#00e676] hover:bg-[#00c853] text-[#0f172a] font-bold rounded-xl text-sm transition-all shadow-[0_4px_14px_0_rgba(0,230,118,0.39)]"
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
