import { useEffect, useState, ChangeEvent, FormEvent } from 'react';
import { api } from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useDebounce } from '../hooks/useDebounce';
import { Image as ImageIcon, Upload, Search, Trash2, Edit2, AlertTriangle, FileVideo } from 'lucide-react';
import { motion } from 'framer-motion';

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
  const debouncedSearch = useDebounce(search, 400);
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

  const fetchMedia = async (isInitial = false) => {
    if (isInitial && mediaList.length === 0) setIsLoading(true);
    setForbiddenError(null);
    try {
      const queryParams = new URLSearchParams();
      if (debouncedSearch) queryParams.append('search', debouncedSearch);
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
    fetchMedia(mediaList.length === 0);
  }, [debouncedSearch, typeFilter]);

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
            <ImageIcon className="w-6 h-6 text-gray-900" />
            Media Library
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Shared file uploads repository attached by products, categories, and brands.
          </p>
        </div>

        {hasPermission('media:upload') && (
          <label className="flex items-center gap-2 px-4 py-2.5 bg-black hover:bg-gray-800 text-white font-medium rounded-xl transition-all shadow-sm text-sm cursor-pointer">
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
        <div className="p-4 bg-white border border-blue-200 rounded-xl space-y-2 shadow-sm">
          <div className="flex items-center justify-between text-xs text-gray-700">
            <span>Uploading asset(s)...</span>
            <span className="font-mono text-blue-600 font-semibold">{uploadProgress}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
            <div
              className="bg-black h-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {uploadError && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-center gap-2 shadow-sm">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{uploadError}</span>
        </div>
      )}

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-center gap-4">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by filename or title..."
            className="w-full bg-white border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl pl-10 pr-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none shadow-sm transition-all"
          />
        </div>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="bg-white border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl px-4 py-2.5 text-sm text-gray-900 outline-none shadow-sm w-full sm:w-44"
        >
          <option value="">All Types</option>
          <option value="image">Images Only</option>
          <option value="video">Videos Only</option>
        </select>
      </div>

      {/* Media Grid */}
      {isLoading && mediaList.length === 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="bg-white border border-gray-200 rounded-xl aspect-square animate-pulse" />
          ))}
        </div>
      ) : mediaList.length === 0 ? (
        <div className="text-center py-12 bg-white border border-gray-200 rounded-2xl text-gray-500 shadow-sm text-sm">
          No media assets found.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {mediaList.map((m) => (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              key={m.id}
              className="group bg-white border border-gray-200 rounded-xl overflow-hidden flex flex-col justify-between hover:border-gray-300 hover:shadow-md transition-all shadow-sm"
            >
              <div className="relative aspect-square bg-gray-50 flex items-center justify-center overflow-hidden border-b border-gray-100">
                {m.type === 'image' ? (
                  <img
                    src={m.thumbnailUrl || m.publicUrl}
                    alt={m.altText || m.fileName}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-gray-400">
                    <FileVideo className="w-8 h-8 text-gray-700" />
                    <span className="text-[10px] font-mono font-semibold">VIDEO</span>
                  </div>
                )}
              </div>

              <div className="p-3">
                <p className="text-xs font-medium text-gray-900 truncate" title={m.title || m.fileName}>
                  {m.title || m.fileName}
                </p>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100 text-[10px] text-gray-400">
                  <span>{(m.size / 1024).toFixed(1)} KB</span>
                  <div className="flex items-center gap-1">
                    {hasPermission('media:write') && (
                      <button
                        onClick={() => openEditModal(m)}
                        className="p-1 hover:text-gray-900 text-gray-400 rounded"
                        title="Edit Metadata"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                    )}
                    {hasPermission('media:delete') && (
                      <button
                        onClick={() => handleDeleteMedia(m.id, m.fileName)}
                        className="p-1 hover:text-red-600 text-gray-400 rounded"
                        title="Delete Asset"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Edit Metadata Modal */}
      {editingMedia && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white border border-gray-200 rounded-2xl p-6 w-full max-w-md shadow-xl"
          >
            <h2 className="text-lg font-bold text-gray-900 mb-4">Edit Media Metadata</h2>

            <form onSubmit={handleSaveMetadata} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full bg-white border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-lg px-3.5 py-2 text-sm text-gray-900 outline-none transition-all shadow-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Alt Text (Accessibility)
                </label>
                <input
                  type="text"
                  value={editAltText}
                  onChange={(e) => setEditAltText(e.target.value)}
                  className="w-full bg-white border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-lg px-3.5 py-2 text-sm text-gray-900 outline-none transition-all shadow-sm"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-5 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setEditingMedia(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-black hover:bg-gray-800 text-white font-medium rounded-lg text-sm transition-all shadow-sm"
                >
                  Save Metadata
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

