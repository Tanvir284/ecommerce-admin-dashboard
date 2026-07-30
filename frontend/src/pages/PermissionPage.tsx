import React, { useEffect, useState } from 'react';
import { api } from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { Plus, Search, KeyRound, AlertTriangle, ShieldCheck, Trash2 } from 'lucide-react';

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
            <KeyRound className="w-6 h-6 text-emerald-400" />
            Permission Vocabulary
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Defines module-by-action capability grid used by the access control system.
          </p>
        </div>

        {hasPermission('permission:create') && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold rounded-xl transition-all shadow-lg shadow-emerald-500/20 text-sm"
          >
            <Plus className="w-4 h-4" />
            Create Permission Group
          </button>
        )}
      </div>

      {/* Search Input */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search module or permission..."
          className="w-full bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 outline-none"
        />
      </div>

      {/* Permission Matrix Grid */}
      {isLoading ? (
        <div className="text-center py-12 text-slate-400">Loading permissions...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {groups.map((group) => (
            <div key={group.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-3">
                  <div>
                    <h3 className="font-bold text-slate-100 text-lg">{group.name}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">{group.description || 'Module group'}</p>
                  </div>
                  {hasPermission('permission:delete') && (
                    <button
                      onClick={() => handleDeleteGroup(group.id, group.name)}
                      className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
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
                      className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60 border border-slate-800/80 text-xs"
                    >
                      <span className="font-mono text-emerald-400 font-medium">{perm.name}</span>
                      <span className="text-slate-400">{perm.description}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500">
                <span>{group.permissions.length} Action(s)</span>
                <span className="font-mono">Module: {group.name.toLowerCase()}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal for Creating Permission Group */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-lg shadow-2xl">
            <h2 className="text-xl font-bold text-slate-100 mb-4">Create Permission Group</h2>

            {formError && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateGroup} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Group Name (Module Name)
                </label>
                <input
                  type="text"
                  required
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="e.g. Order"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-sm text-slate-100 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Description
                </label>
                <input
                  type="text"
                  value={groupDesc}
                  onChange={(e) => setGroupDesc(e.target.value)}
                  placeholder="Module capability description"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-sm text-slate-100 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
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
                          ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
                      }`}
                    >
                      <span>{action}</span>
                      {selectedActions.includes(action) && <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Custom Action Name (Optional)
                </label>
                <input
                  type="text"
                  value={customAction}
                  onChange={(e) => setCustomAction(e.target.value)}
                  placeholder="e.g. export, refund"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-sm text-slate-100 outline-none"
                />
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
                  {isSaving ? 'Creating...' : 'Create Group'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
