import { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { formatNumber, formatMs, formatPercentage } from '../utils/format';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Clock,
  AlertTriangle,
  Globe,
} from 'lucide-react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface AnalyticsData {
  summary: {
    totalRequests: number;
    requestsChange: number;
    avgResponseTime: number;
    responseTimeChange: number;
    errorRate: number;
    errorRateChange: number;
    uniqueTools: number;
  };
  requestsOverTime: Array<{ date: string; requests: number; errors: number }>;
  responseTimeDistribution: Array<{ range: string; count: number }>;
  toolUsage: Array<{ tool: string; count: number }>;
  errorsByType: Array<{ type: string; count: number }>;
  geographicDistribution: Array<{ region: string; requests: number }>;
}

const COLORS = ['#0ea5e9', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'];

export default function Analytics() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('30d');

  useEffect(() => {
    loadAnalytics();
  }, [period]);

  async function loadAnalytics() {
    try {
      const result = await api.get<AnalyticsData>(`/api/analytics?period=${period}`);
      setData(result);
    } catch (error) {
      console.error('Failed to load analytics:', error);
      // Mock data
      setData({
        summary: {
          totalRequests: 45678,
          requestsChange: 12.5,
          avgResponseTime: 234,
          responseTimeChange: -8.2,
          errorRate: 0.5,
          errorRateChange: -15.3,
          uniqueTools: 18,
        },
        requestsOverTime: Array.from({ length: 30 }, (_, i) => ({
          date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          requests: Math.floor(Math.random() * 1000) + 500,
          errors: Math.floor(Math.random() * 20),
        })),
        responseTimeDistribution: [
          { range: '0-100ms', count: 2345 },
          { range: '100-250ms', count: 4567 },
          { range: '250-500ms', count: 2134 },
          { range: '500ms-1s', count: 876 },
          { range: '>1s', count: 234 },
        ],
        toolUsage: [
          { tool: 'wp_get_posts', count: 12345 },
          { tool: 'wp_create_post', count: 8765 },
          { tool: 'wp_upload_media', count: 5432 },
          { tool: 'wp_update_post', count: 3210 },
          { tool: 'wp_delete_post', count: 1234 },
        ],
        errorsByType: [
          { type: 'Rate Limit', count: 156 },
          { type: 'Auth Error', count: 89 },
          { type: 'WordPress Error', count: 67 },
          { type: 'Timeout', count: 45 },
          { type: 'Other', count: 23 },
        ],
        geographicDistribution: [
          { region: 'North America', requests: 15678 },
          { region: 'Europe', requests: 12345 },
          { region: 'Asia Pacific', requests: 8765 },
          { region: 'South America', requests: 3456 },
          { region: 'Other', requests: 2345 },
        ],
      });
    } finally {
      setIsLoading(false);
    }
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
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-600">Deep insights into your API usage</p>
        </div>
        <div className="flex items-center bg-gray-100 rounded-lg p-1">
          {(['7d', '30d', '90d'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-2 text-sm rounded-md transition-colors ${
                period === p
                  ? 'bg-white shadow text-gray-900'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {p === '7d' ? '7 Days' : p === '30d' ? '30 Days' : '90 Days'}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <Activity className="h-8 w-8 text-primary-500" />
            <div className={`flex items-center text-sm ${data?.summary.requestsChange && data.summary.requestsChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {data?.summary.requestsChange && data.summary.requestsChange >= 0 ? <TrendingUp className="h-4 w-4 mr-1" /> : <TrendingDown className="h-4 w-4 mr-1" />}
              {formatPercentage(Math.abs(data?.summary.requestsChange || 0))}
            </div>
          </div>
          <div className="stat-value mt-4">{formatNumber(data?.summary.totalRequests || 0)}</div>
          <div className="stat-label">Total Requests</div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <Clock className="h-8 w-8 text-blue-500" />
            <div className={`flex items-center text-sm ${data?.summary.responseTimeChange && data.summary.responseTimeChange <= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {data?.summary.responseTimeChange && data.summary.responseTimeChange <= 0 ? <TrendingDown className="h-4 w-4 mr-1" /> : <TrendingUp className="h-4 w-4 mr-1" />}
              {formatPercentage(Math.abs(data?.summary.responseTimeChange || 0))}
            </div>
          </div>
          <div className="stat-value mt-4">{formatMs(data?.summary.avgResponseTime || 0)}</div>
          <div className="stat-label">Avg Response Time</div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <AlertTriangle className="h-8 w-8 text-orange-500" />
            <div className={`flex items-center text-sm ${data?.summary.errorRateChange && data.summary.errorRateChange <= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {data?.summary.errorRateChange && data.summary.errorRateChange <= 0 ? <TrendingDown className="h-4 w-4 mr-1" /> : <TrendingUp className="h-4 w-4 mr-1" />}
              {formatPercentage(Math.abs(data?.summary.errorRateChange || 0))}
            </div>
          </div>
          <div className="stat-value mt-4">{formatPercentage(data?.summary.errorRate || 0)}</div>
          <div className="stat-label">Error Rate</div>
        </div>

        <div className="stat-card">
          <Globe className="h-8 w-8 text-green-500" />
          <div className="stat-value mt-4">{data?.summary.uniqueTools || 0}</div>
          <div className="stat-label">Tools Used</div>
        </div>
      </div>

      {/* Requests Over Time */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Requests Over Time</h2>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data?.requestsOverTime || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
              <YAxis stroke="#6b7280" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                }}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="requests"
                stroke="#0ea5e9"
                fill="#0ea5e9"
                fillOpacity={0.2}
                name="Requests"
              />
              <Area
                type="monotone"
                dataKey="errors"
                stroke="#ef4444"
                fill="#ef4444"
                fillOpacity={0.2}
                name="Errors"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Tool Usage */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Tool Usage</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.toolUsage || []} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis type="number" stroke="#6b7280" fontSize={12} />
                <YAxis type="category" dataKey="tool" stroke="#6b7280" fontSize={10} width={100} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="count" fill="#0ea5e9" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Response Time Distribution */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Response Time Distribution</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data?.responseTimeDistribution || []}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="count"
                  nameKey="range"
                  label={({ range, percent }) => `${range} (${(percent * 100).toFixed(0)}%)`}
                  labelLine={false}
                >
                  {data?.responseTimeDistribution.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Errors by Type */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Errors by Type</h2>
          <div className="space-y-3">
            {data?.errorsByType.map((error, index) => (
              <div key={error.type} className="flex items-center">
                <div
                  className="w-3 h-3 rounded-full mr-3"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                <span className="flex-1 text-sm text-gray-600">{error.type}</span>
                <span className="text-sm font-medium text-gray-900">{formatNumber(error.count)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Geographic Distribution */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Geographic Distribution</h2>
          <div className="space-y-3">
            {data?.geographicDistribution.map((region) => (
              <div key={region.region}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-600">{region.region}</span>
                  <span className="text-sm font-medium text-gray-900">{formatNumber(region.requests)}</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary-500 rounded-full"
                    style={{
                      width: `${(region.requests / (data?.geographicDistribution[0]?.requests || 1)) * 100}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
