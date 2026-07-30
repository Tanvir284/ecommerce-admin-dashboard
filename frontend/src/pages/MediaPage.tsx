import { useEffect, useState, ChangeEvent, FormEvent } from 'react';
import { api } from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { Image as ImageIcon, Upload, Search, Trash2, Edit2, AlertTriangle, FileVideo, CheckCircle2 } from 'lucide-react';

interface MediaAsset {
  id: string;
  fileName: string;
  publicUrl: string;
  thumbnailUrl?: string;
  mimeType: string;
  type: string;
  size: number;
  altText?: string;
  title?: string;
  createdAt: string;
}

export const MediaPage: React.FC = () => {
  const { hasPermission } = useAuth();

  const [mediaList, setMediaList] = useState<MediaAsset[]>([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [forbiddenError, setForbiddenError] = useState<string | null>(null);

  // Upload State
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Edit Metadata Modal
  const [editingMedia, setEditingMedia] = useState<MediaAsset | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editAltText, setEditAltText] = useState('');

  const fetchMedia = async () => {
    setIsLoading(true);
    setForbiddenError(null);
    try {
      const queryParams = new URLSearchParams();
      if (search) queryParams.append('search', search);
      if (typeFilter) queryParams.append('type', typeFilter);

      const data: any = await api.get(`/media?${queryParams.toString()}`);
      setMediaList(data.media || []);
    } catch (err: any) {
      if (err.status === 403) {
        setForbiddenError(err.message || 'Access Forbidden: 403.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMedia();
  }, [search, typeFilter]);

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadError(null);
    setIsUploading(true);
    setUploadProgress(20);

    const formData = new FormData();
    if (files.length === 1) {
      formData.append('file', files[0]);
    } else {
      Array.from(files).forEach((f) => formData.append('files', f));
    }

    try {
      const endpoint = files.length === 1 ? '/media/upload' : '/media/upload-multiple';
      await api.post(endpoint, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const pct = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(pct);
          }
        },
      });

      fetchMedia();
    } catch (err: any) {
      setUploadError(err.message || 'Upload failed');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const openEditModal = (m: MediaAsset) => {
    setEditingMedia(m);
    setEditTitle(m.title || '');
    setEditAltText(m.altText || '');
  };

  const handleSaveMetadata = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingMedia) return;

    try {
      await api.put(`/media/${editingMedia.id}`, {
        title: editTitle,
        altText: editAltText,
      });
      setEditingMedia(null);
      fetchMedia();
    } catch (err: any) {
      alert(err.message || 'Failed to update metadata');
    }
  };

  const handleDeleteMedia = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete media asset '${name}'?`)) return;
    try {
      await api.delete(`/media/${id}`);
      fetchMedia();
    } catch (err: any) {
      alert(err.message || 'Failed to delete media asset');
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
            <ImageIcon className="w-6 h-6 text-emerald-400" />
            Media Library
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Shared file uploads repository attached by products, categories, and brands.
          </p>
        </div>

        {hasPermission('media:upload') && (
          <label className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold rounded-xl transition-all shadow-lg shadow-emerald-500/20 text-sm cursor-pointer">
            <Upload className="w-4 h-4" />
            Upload File(s)
            <input
              type="file"
              multiple
              accept="image/*,video/*"
              className="hidden"
              onChange={handleFileUpload}
            />
          </label>
        )}
      </div>

      {/* Upload Progress & Error Feedback */}
      {isUploading && (
        <div className="p-4 bg-slate-900 border border-emerald-500/30 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-300">
            <span>Uploading asset(s)...</span>
            <span className="font-mono text-emerald-400">{uploadProgress}%</span>
          </div>
          <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden">
            <div
              className="bg-emerald-500 h-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {uploadError && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          <span>{uploadError}</span>
        </div>
      )}

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-center gap-4">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by filename or title..."
            className="w-full bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 outline-none"
          />
        </div>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-sm text-slate-100 outline-none w-full sm:w-44"
        >
          <option value="">All Types</option>
          <option value="image">Images Only</option>
          <option value="video">Videos Only</option>
        </select>
      </div>

      {/* Media Grid */}
      {isLoading ? (
        <div className="text-center py-12 text-slate-400">Loading media library...</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {mediaList.map((m) => (
            <div
              key={m.id}
              className="group bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col justify-between hover:border-emerald-500/50 transition-all shadow-md"
            >
              <div className="relative aspect-square bg-slate-950 flex items-center justify-center overflow-hidden">
                {m.type === 'image' ? (
                  <img
                    src={m.thumbnailUrl || m.publicUrl}
                    alt={m.altText || m.fileName}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-slate-500">
                    <FileVideo className="w-8 h-8 text-indigo-400" />
                    <span className="text-[10px] font-mono">VIDEO</span>
                  </div>
                )}
              </div>

              <div className="p-3">
                <p className="text-xs font-semibold text-slate-200 truncate" title={m.title || m.fileName}>
                  {m.title || m.fileName}
                </p>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800/60 text-[10px] text-slate-500">
                  <span>{(m.size / 1024).toFixed(1)} KB</span>
                  <div className="flex items-center gap-1">
                    {hasPermission('media:write') && (
                      <button
                        onClick={() => openEditModal(m)}
                        className="p-1 hover:text-emerald-400 text-slate-400 rounded"
                        title="Edit Metadata"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                    )}
                    {hasPermission('media:delete') && (
                      <button
                        onClick={() => handleDeleteMedia(m.id, m.fileName)}
                        className="p-1 hover:text-red-400 text-slate-400 rounded"
                        title="Delete Asset"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Metadata Modal */}
      {editingMedia && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-bold text-slate-100 mb-4">Edit Media Metadata</h2>

            <form onSubmit={handleSaveMetadata} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-sm text-slate-100 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Alt Text (Accessibility)
                </label>
                <input
                  type="text"
                  value={editAltText}
                  onChange={(e) => setEditAltText(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-sm text-slate-100 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingMedia(null)}
                  className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold rounded-xl text-sm transition-all"
                >
                  Save Metadata
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
