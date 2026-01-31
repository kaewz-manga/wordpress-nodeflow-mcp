import { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { formatRelativeTime } from '../utils/format';
import {
  Key,
  Plus,
  Copy,
  Trash2,
  Check,
  AlertCircle,
  Globe,
  Link2,
} from 'lucide-react';

interface ApiKeyItem {
  id: string;
  prefix: string;
  name: string;
  status: string;
  last_used_at: string | null;
  created_at: string;
}

interface Connection {
  id: string;
  name: string;
  wp_url: string;
  status: string;
  created_at: string;
  api_keys: ApiKeyItem[];
}

export default function ApiKeys() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddConnection, setShowAddConnection] = useState(false);
  const [showAddKey, setShowAddKey] = useState<string | null>(null);
  const [newKeyValue, setNewKeyValue] = useState<string | null>(null);
  const [newKeyName, setNewKeyName] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [error, setError] = useState('');

  // Connection form
  const [connName, setConnName] = useState('');
  const [connUrl, setConnUrl] = useState('');
  const [connUsername, setConnUsername] = useState('');
  const [connPassword, setConnPassword] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    loadConnections();
  }, []);

  async function loadConnections() {
    try {
      const result = await api.get<{ data: { connections: Connection[] } }>('/api/connections');
      setConnections(result.data.connections);
    } catch (err) {
      console.error('Failed to load connections:', err);
      setConnections([]);
    } finally {
      setIsLoading(false);
    }
  }

  async function createConnection() {
    if (!connName.trim() || !connUrl.trim() || !connUsername.trim() || !connPassword.trim()) {
      setError('All fields are required');
      return;
    }

    setIsCreating(true);
    setError('');
    try {
      await api.post('/api/connections', {
        name: connName,
        wp_url: connUrl,
        wp_username: connUsername,
        wp_password: connPassword,
      });
      setShowAddConnection(false);
      setConnName('');
      setConnUrl('');
      setConnUsername('');
      setConnPassword('');
      await loadConnections();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create connection');
    } finally {
      setIsCreating(false);
    }
  }

  async function deleteConnection(id: string) {
    if (!confirm('Delete this connection and all its API keys?')) return;
    try {
      await api.delete(`/api/connections/${id}`);
      setConnections(connections.filter(c => c.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete connection');
    }
  }

  async function createApiKey(connectionId: string) {
    try {
      const result = await api.post<{ data: { api_key: string; prefix: string } }>(
        `/api/connections/${connectionId}/api-keys`,
        { name: newKeyName || 'API Key' }
      );
      setNewKeyValue(result.data.api_key);
      await loadConnections();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create API key');
    }
  }

  async function deleteApiKey(keyId: string) {
    if (!confirm('Revoke this API key? This cannot be undone.')) return;
    try {
      await api.delete(`/api/api-keys/${keyId}`);
      await loadConnections();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revoke API key');
    }
  }

  function copyToClipboard(text: string, id: string) {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  }

  function closeKeyModal() {
    setShowAddKey(null);
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
          <h1 className="text-2xl font-bold text-gray-900">Connections & API Keys</h1>
          <p className="text-gray-600">Connect WordPress sites and manage API keys</p>
        </div>
        <button onClick={() => setShowAddConnection(true)} className="btn btn-primary">
          <Plus className="h-4 w-4 mr-2" />
          Add Connection
        </button>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start">
        <AlertCircle className="h-5 w-5 text-blue-500 mt-0.5 mr-3 flex-shrink-0" />
        <div>
          <p className="text-sm text-blue-800">
            Each connection links to a WordPress site. Create API keys per connection to use with MCP clients.
          </p>
          <p className="text-sm text-blue-600 mt-1">
            Use <code className="bg-blue-100 px-1 rounded">Authorization: Bearer YOUR_API_KEY</code> header with <code className="bg-blue-100 px-1 rounded">POST /mcp</code>
          </p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
          {error}
          <button onClick={() => setError('')} className="ml-auto">&times;</button>
        </div>
      )}

      {/* Connections List */}
      {connections.length === 0 ? (
        <div className="card text-center py-12">
          <Link2 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No connections yet</h3>
          <p className="text-gray-500 mb-4">Add a WordPress site to get started</p>
          <button onClick={() => setShowAddConnection(true)} className="btn btn-primary">
            <Plus className="h-4 w-4 mr-2" />
            Add Connection
          </button>
        </div>
      ) : (
        connections.map(conn => (
          <div key={conn.id} className="card">
            {/* Connection Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <Globe className="h-5 w-5 text-primary-500 mr-3" />
                <div>
                  <h3 className="font-semibold text-gray-900">{conn.name}</h3>
                  <p className="text-sm text-gray-500">{conn.wp_url}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  conn.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                }`}>
                  {conn.status}
                </span>
                <button
                  onClick={() => { setShowAddKey(conn.id); setNewKeyName(''); setNewKeyValue(null); }}
                  className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg"
                  title="Generate API Key"
                >
                  <Key className="h-4 w-4" />
                </button>
                <button
                  onClick={() => deleteConnection(conn.id)}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                  title="Delete Connection"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* API Keys Table */}
            {conn.api_keys.length > 0 ? (
              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left py-2 px-4 text-xs font-medium text-gray-500">Name</th>
                      <th className="text-left py-2 px-4 text-xs font-medium text-gray-500">Key</th>
                      <th className="text-left py-2 px-4 text-xs font-medium text-gray-500">Status</th>
                      <th className="text-left py-2 px-4 text-xs font-medium text-gray-500">Last Used</th>
                      <th className="text-right py-2 px-4 text-xs font-medium text-gray-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {conn.api_keys.map(key => (
                      <tr key={key.id} className="border-b border-gray-100 last:border-0">
                        <td className="py-3 px-4 text-sm font-medium text-gray-900">{key.name}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center">
                            <code className="text-sm text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                              {key.prefix}...
                            </code>
                            <button
                              onClick={() => copyToClipboard(key.prefix, key.id)}
                              className="ml-2 p-1 hover:bg-gray-100 rounded"
                            >
                              {copiedKey === key.id ? (
                                <Check className="h-3 w-3 text-green-500" />
                              ) : (
                                <Copy className="h-3 w-3 text-gray-400" />
                              )}
                            </button>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            key.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {key.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-500">
                          {key.last_used_at ? formatRelativeTime(key.last_used_at) : 'Never'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => deleteApiKey(key.id)}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-4 border border-dashed border-gray-200 rounded-lg">
                No API keys yet.{' '}
                <button
                  onClick={() => { setShowAddKey(conn.id); setNewKeyName(''); setNewKeyValue(null); }}
                  className="text-primary-600 hover:underline"
                >
                  Generate one
                </button>
              </p>
            )}
          </div>
        ))
      )}

      {/* Add Connection Modal */}
      {showAddConnection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Add WordPress Connection</h2>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Connection Name</label>
                <input
                  type="text"
                  value={connName}
                  onChange={e => setConnName(e.target.value)}
                  placeholder="e.g., My Blog"
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">WordPress URL</label>
                <input
                  type="url"
                  value={connUrl}
                  onChange={e => setConnUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                <input
                  type="text"
                  value={connUsername}
                  onChange={e => setConnUsername(e.target.value)}
                  placeholder="admin"
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Application Password</label>
                <input
                  type="password"
                  value={connPassword}
                  onChange={e => setConnPassword(e.target.value)}
                  placeholder="xxxx xxxx xxxx xxxx xxxx xxxx"
                  className="input"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Generate at WordPress → Users → Application Passwords. Spaces are removed automatically.
                </p>
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => { setShowAddConnection(false); setError(''); }}
                className="btn btn-secondary flex-1"
              >
                Cancel
              </button>
              <button onClick={createConnection} disabled={isCreating} className="btn btn-primary flex-1">
                {isCreating ? 'Testing...' : 'Add Connection'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Generate API Key Modal */}
      {showAddKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {newKeyValue ? 'API Key Created' : 'Generate API Key'}
            </h2>

            {newKeyValue ? (
              <div>
                <p className="text-sm text-gray-600 mb-4">
                  Copy your API key now — it won't be shown again.
                </p>
                <div className="bg-gray-100 rounded-lg p-4 mb-4">
                  <code className="text-sm break-all">{newKeyValue}</code>
                </div>
                <button
                  onClick={() => copyToClipboard(newKeyValue, 'new')}
                  className="btn btn-primary w-full"
                >
                  {copiedKey === 'new' ? (
                    <><Check className="h-4 w-4 mr-2" /> Copied!</>
                  ) : (
                    <><Copy className="h-4 w-4 mr-2" /> Copy API Key</>
                  )}
                </button>
                <button onClick={closeKeyModal} className="btn btn-secondary w-full mt-3">
                  Done
                </button>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Key Name</label>
                <input
                  type="text"
                  value={newKeyName}
                  onChange={e => setNewKeyName(e.target.value)}
                  placeholder="e.g., Production Key"
                  className="input mb-4"
                />
                <div className="flex space-x-3">
                  <button onClick={closeKeyModal} className="btn btn-secondary flex-1">Cancel</button>
                  <button onClick={() => createApiKey(showAddKey)} className="btn btn-primary flex-1">
                    Generate
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
