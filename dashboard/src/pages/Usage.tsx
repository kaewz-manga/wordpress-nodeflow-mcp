import { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { formatNumber, formatMs, formatDateTime } from '../utils/format';
import {
  Activity,
  Filter,
  Download,
  Search,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react';

interface UsageLog {
  id: string;
  tool: string;
  status: 'success' | 'error';
  responseTime: number;
  errorMessage?: string;
  apiKeyName: string;
  createdAt: string;
}

interface UsageStats {
  totalRequests: number;
  successRate: number;
  avgResponseTime: number;
  topTools: Array<{ tool: string; count: number }>;
}

export default function Usage() {
  const [logs, setLogs] = useState<UsageLog[]>([]);
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'success' | 'error'>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadUsage();
  }, []);

  async function loadUsage() {
    try {
      const usage = await api.get<{ data: { requests: { used: number; limit: number }; success_rate: number } }>('/api/usage');
      setStats({
        totalRequests: usage.data.requests.used,
        successRate: usage.data.success_rate,
        avgResponseTime: 0,
        topTools: [],
      });
      setLogs([]);
    } catch (error) {
      console.error('Failed to load usage:', error);
      setStats({
        totalRequests: 0,
        successRate: 100,
        avgResponseTime: 0,
        topTools: [],
      });
      setLogs([]);
    } finally {
      setIsLoading(false);
    }
  }

  const filteredLogs = logs.filter((log) => {
    if (filter !== 'all' && log.status !== filter) return false;
    if (search && !log.tool.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

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
          <h1 className="text-2xl font-bold text-gray-900">Usage</h1>
          <p className="text-gray-600">Monitor your API requests and performance</p>
        </div>
        <button className="btn btn-secondary">
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </button>
      </div>

      {/* Stats */}
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="stat-card">
          <Activity className="h-8 w-8 text-primary-500" />
          <div className="stat-value mt-4">{formatNumber(stats?.totalRequests || 0)}</div>
          <div className="stat-label">Total Requests</div>
        </div>
        <div className="stat-card">
          <CheckCircle className="h-8 w-8 text-green-500" />
          <div className="stat-value mt-4">{stats?.successRate.toFixed(1)}%</div>
          <div className="stat-label">Success Rate</div>
        </div>
        <div className="stat-card">
          <Clock className="h-8 w-8 text-blue-500" />
          <div className="stat-value mt-4">{formatMs(stats?.avgResponseTime || 0)}</div>
          <div className="stat-label">Avg Response Time</div>
        </div>
      </div>

      {/* Top Tools */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Top Tools</h2>
        <div className="space-y-3">
          {stats?.topTools.map((tool, index) => (
            <div key={tool.tool} className="flex items-center">
              <span className="w-6 text-sm text-gray-400">{index + 1}</span>
              <code className="flex-1 text-sm bg-gray-100 px-2 py-1 rounded">{tool.tool}</code>
              <span className="ml-4 text-sm font-medium text-gray-900">
                {formatNumber(tool.count)}
              </span>
              <div className="ml-4 w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary-500 rounded-full"
                  style={{
                    width: `${(tool.count / (stats?.topTools[0]?.count || 1)) * 100}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Logs */}
      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 space-y-4 sm:space-y-0">
          <h2 className="text-lg font-semibold text-gray-900">Request Logs</h2>
          <div className="flex items-center space-x-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search tools..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input pl-9 py-1.5 w-48"
              />
            </div>
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              {(['all', 'success', 'error'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    filter === f
                      ? 'bg-white shadow text-gray-900'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Status</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Tool</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">API Key</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Response Time</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Time</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => (
                <tr key={log.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                  <td className="py-3 px-4">
                    {log.status === 'success' ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <code className="text-sm bg-gray-100 px-2 py-1 rounded">{log.tool}</code>
                    {log.errorMessage && (
                      <p className="text-xs text-red-500 mt-1">{log.errorMessage}</p>
                    )}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600">{log.apiKeyName}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`text-sm ${
                        log.responseTime > 1000
                          ? 'text-red-600'
                          : log.responseTime > 500
                          ? 'text-orange-600'
                          : 'text-green-600'
                      }`}
                    >
                      {formatMs(log.responseTime)}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-500">
                    {formatDateTime(log.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
