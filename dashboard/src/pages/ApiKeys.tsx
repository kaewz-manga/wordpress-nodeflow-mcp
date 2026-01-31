import { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { formatRelativeTime } from '../utils/format';
import {
  Key,
  Plus,
  Copy,
  Trash2,
  Eye,
  EyeOff,
  Check,
  AlertCircle,
  MoreVertical,
} from 'lucide-react';

interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  isActive: boolean;
  lastUsedAt: string | null;
  createdAt: string;
  expiresAt: string | null;
}

export default function ApiKeys() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyValue, setNewKeyValue] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    loadApiKeys();
  }, []);

  async function loadApiKeys() {
    try {
      const data = await api.get<{ apiKeys: ApiKey[] }>('/api/keys');
      setApiKeys(data.apiKeys);
    } catch (error) {
      console.error('Failed to load API keys:', error);
      // Mock data for demo
      setApiKeys([
        {
          id: '1',
          name: 'Production Key',
          keyPrefix: 'wp_mcp_live_a1b2c3d4',
          isActive: true,
          lastUsedAt: new Date().toISOString(),
          createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          expiresAt: null,
        },
        {
          id: '2',
          name: 'Development Key',
          keyPrefix: 'wp_mcp_test_x9y8z7w6',
          isActive: true,
          lastUsedAt: new Date(Date.now() - 3600000).toISOString(),
          createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          expiresAt: null,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  async function createApiKey() {
    if (!newKeyName.trim()) {
      setError('Please enter a name for your API key');
      return;
    }

    try {
      const data = await api.post<{ apiKey: ApiKey; key: string }>('/api/keys', {
        name: newKeyName,
      });
      setNewKeyValue(data.key);
      setApiKeys([data.apiKey, ...apiKeys]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create API key');
    }
  }

  async function deleteApiKey(id: string) {
    if (!confirm('Are you sure you want to delete this API key? This action cannot be undone.')) {
      return;
    }

    try {
      await api.delete(`/api/api-keys/${id}`);
      setApiKeys(apiKeys.filter((key) => key.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete API key');
    }
  }

  function copyToClipboard(text: string, id: string) {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  }

  function closeModal() {
    setShowCreateModal(false);
    setNewKeyName('');
    setNewKeyValue(null);
    setError('');
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">API Keys</h1>
          <p className="text-gray-600">Manage your API keys for accessing the MCP server</p>
        </div>
        <button onClick={() => setShowCreateModal(true)} className="btn btn-primary">
          <Plus className="h-4 w-4 mr-2" />
          Create API Key
        </button>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start">
        <AlertCircle className="h-5 w-5 text-blue-500 mt-0.5 mr-3 flex-shrink-0" />
        <div>
          <p className="text-sm text-blue-800">
            API keys are shown only once when created. Store them securely.
          </p>
          <p className="text-sm text-blue-600 mt-1">
            Use the <code className="bg-blue-100 px-1 rounded">Authorization: Bearer YOUR_API_KEY</code> header.
          </p>
        </div>
      </div>

      {/* API Keys List */}
      <div className="card">
        {apiKeys.length === 0 ? (
          <div className="text-center py-12">
            <Key className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No API keys yet</h3>
            <p className="text-gray-500 mb-4">Create your first API key to get started</p>
            <button onClick={() => setShowCreateModal(true)} className="btn btn-primary">
              <Plus className="h-4 w-4 mr-2" />
              Create API Key
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Name</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Key</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Status</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Last Used</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Created</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {apiKeys.map((key) => (
                  <tr key={key.id} className="border-b border-gray-100 last:border-0">
                    <td className="py-4 px-4">
                      <div className="flex items-center">
                        <Key className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="font-medium text-gray-900">{key.name}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center">
                        <code className="text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded">
                          {key.keyPrefix}...
                        </code>
                        <button
                          onClick={() => copyToClipboard(key.keyPrefix, key.id)}
                          className="ml-2 p-1 hover:bg-gray-100 rounded"
                        >
                          {copiedKey === key.id ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : (
                            <Copy className="h-4 w-4 text-gray-400" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          key.isActive
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {key.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-sm text-gray-500">
                      {key.lastUsedAt ? formatRelativeTime(key.lastUsedAt) : 'Never'}
                    </td>
                    <td className="py-4 px-4 text-sm text-gray-500">
                      {formatRelativeTime(key.createdAt)}
                    </td>
                    <td className="py-4 px-4 text-right">
                      <button
                        onClick={() => deleteApiKey(key.id)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                {newKeyValue ? 'API Key Created' : 'Create API Key'}
              </h2>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {error}
                </div>
              )}

              {newKeyValue ? (
                <div>
                  <p className="text-sm text-gray-600 mb-4">
                    Your API key has been created. Copy it now - you won't be able to see it again!
                  </p>
                  <div className="bg-gray-100 rounded-lg p-4 mb-4">
                    <code className="text-sm break-all">{newKeyValue}</code>
                  </div>
                  <button
                    onClick={() => copyToClipboard(newKeyValue, 'new')}
                    className="btn btn-primary w-full"
                  >
                    {copiedKey === 'new' ? (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-2" />
                        Copy API Key
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Key Name
                  </label>
                  <input
                    type="text"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    placeholder="e.g., Production Key"
                    className="input mb-4"
                  />
                  <div className="flex space-x-3">
                    <button onClick={closeModal} className="btn btn-secondary flex-1">
                      Cancel
                    </button>
                    <button onClick={createApiKey} className="btn btn-primary flex-1">
                      Create Key
                    </button>
                  </div>
                </div>
              )}
            </div>
            {newKeyValue && (
              <div className="border-t border-gray-200 px-6 py-4">
                <button onClick={closeModal} className="btn btn-secondary w-full">
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
