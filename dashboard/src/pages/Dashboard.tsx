import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { api } from '../utils/api';
import { formatNumber, formatPercentage } from '../utils/format';
import {
  Activity,
  Key,
  AlertTriangle,
  ArrowUpRight,
  Clock,
  Zap,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface DashboardData {
  stats: {
    totalRequests: number;
    requestsThisMonth: number;
    requestsLimit: number;
    activeApiKeys: number;
    avgResponseTime: number;
    errorRate: number;
  };
  usageChart: Array<{
    date: string;
    requests: number;
  }>;
  recentActivity: Array<{
    id: string;
    tool: string;
    status: 'success' | 'error';
    timestamp: string;
  }>;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      const usage = await api.get<{ data: { requests: { used: number; limit: number }; success_rate: number } }>('/api/usage');
      setData({
        stats: {
          totalRequests: usage.data.requests.used,
          requestsThisMonth: usage.data.requests.used,
          requestsLimit: usage.data.requests.limit,
          activeApiKeys: 0,
          avgResponseTime: 0,
          errorRate: 100 - usage.data.success_rate,
        },
        usageChart: [],
        recentActivity: [],
      });
    } catch (error) {
      console.error('Failed to load dashboard:', error);
      setData({
        stats: {
          totalRequests: 0,
          requestsThisMonth: 0,
          requestsLimit: 100,
          activeApiKeys: 0,
          avgResponseTime: 0,
          errorRate: 0,
        },
        usageChart: [],
        recentActivity: [],
      });
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-n2f-accent"></div>
      </div>
    );
  }

  const usagePercent = data ? (data.stats.requestsThisMonth / data.stats.requestsLimit) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-n2f-text">Dashboard</h1>
          <p className="text-n2f-text-secondary">Welcome back, {user?.email?.split('@')[0]}</p>
        </div>
        <Link to="/dashboard/api-keys" className="btn btn-primary">
          <Key className="h-4 w-4 mr-2" />
          New API Key
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <Activity className="h-8 w-8 text-n2f-accent" />
            <span className="text-xs text-green-400 font-medium flex items-center">
              <ArrowUpRight className="h-3 w-3" />
              12%
            </span>
          </div>
          <div className="stat-value mt-4">{formatNumber(data?.stats.requestsThisMonth || 0)}</div>
          <div className="stat-label">Requests this month</div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <Key className="h-8 w-8 text-blue-400" />
          </div>
          <div className="stat-value mt-4">{data?.stats.activeApiKeys || 0}</div>
          <div className="stat-label">Active API Keys</div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <Clock className="h-8 w-8 text-green-400" />
          </div>
          <div className="stat-value mt-4">{data?.stats.avgResponseTime || 0}ms</div>
          <div className="stat-label">Avg Response Time</div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <AlertTriangle className="h-8 w-8 text-orange-400" />
          </div>
          <div className="stat-value mt-4">{formatPercentage(data?.stats.errorRate || 0)}</div>
          <div className="stat-label">Error Rate</div>
        </div>
      </div>

      {/* Usage Progress */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-n2f-text">Monthly Usage</h2>
          <Link to="/dashboard/billing" className="text-sm text-n2f-accent hover:text-n2f-accent-light">
            Upgrade plan
          </Link>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-n2f-text-secondary">
              {formatNumber(data?.stats.requestsThisMonth || 0)} / {formatNumber(data?.stats.requestsLimit || 0)} requests
            </span>
            <span className="font-medium text-n2f-text">{formatPercentage(usagePercent)}</span>
          </div>
          <div className="h-3 bg-n2f-elevated rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                usagePercent > 90 ? 'bg-red-500' : usagePercent > 70 ? 'bg-orange-500' : 'bg-n2f-accent'
              }`}
              style={{ width: `${Math.min(usagePercent, 100)}%` }}
            />
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Usage Chart */}
        <div className="card">
          <h2 className="text-lg font-semibold text-n2f-text mb-4">Request Volume</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data?.usageChart || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
                <YAxis stroke="#6b7280" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0a0b0e',
                    border: '1px solid #1f2937',
                    borderRadius: '8px',
                    color: '#f9fafb',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="requests"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-n2f-text">Recent Activity</h2>
            <Link to="/dashboard/usage" className="text-sm text-n2f-accent hover:text-n2f-accent-light">
              View all
            </Link>
          </div>
          <div className="space-y-3">
            {data?.recentActivity.map((activity) => (
              <div
                key={activity.id}
                className="flex items-center justify-between py-2 border-b border-n2f-border last:border-0"
              >
                <div className="flex items-center">
                  <div
                    className={`w-2 h-2 rounded-full mr-3 ${
                      activity.status === 'success' ? 'bg-green-500' : 'bg-red-500'
                    }`}
                  />
                  <div>
                    <p className="text-sm font-medium text-n2f-text">{activity.tool}</p>
                    <p className="text-xs text-n2f-text-muted">
                      {new Date(activity.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded-full ${
                    activity.status === 'success'
                      ? 'bg-green-500/10 text-green-400'
                      : 'bg-red-500/10 text-red-400'
                  }`}
                >
                  {activity.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Start */}
      <div className="card bg-gradient-to-r from-n2f-accent to-blue-700 border-0">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white mb-2">Quick Start Guide</h2>
            <p className="text-blue-200 text-sm">
              Learn how to integrate WordPress MCP with your AI client
            </p>
          </div>
          <Zap className="h-12 w-12 text-blue-200" />
        </div>
        <div className="mt-4 flex space-x-3">
          <Link to="/docs" className="btn bg-white text-n2f-accent hover:bg-gray-100 text-sm">
            Read Docs
          </Link>
          <button className="btn bg-blue-600 text-white hover:bg-blue-500 text-sm">
            Watch Tutorial
          </button>
        </div>
      </div>
    </div>
  );
}
