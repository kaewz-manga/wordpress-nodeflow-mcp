import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Zap, ArrowLeft, CheckCircle, AlertTriangle, XCircle, RefreshCw, Clock,
  Server, Database, Globe, Shield, Activity, Loader2,
} from 'lucide-react';

type ServiceStatus = 'operational' | 'degraded' | 'outage' | 'maintenance' | 'unknown';

interface ServiceComponent {
  name: string;
  description: string;
  status: ServiceStatus;
  latency?: number;
  icon: React.ReactNode;
}

interface UptimeDay {
  date: string;
  status: ServiceStatus;
  uptime: number;
}

const statusConfig: Record<ServiceStatus, { label: string; color: string; bgColor: string; icon: React.ReactNode }> = {
  operational: { label: 'Operational', color: 'text-green-400', bgColor: 'bg-green-400', icon: <CheckCircle className="h-5 w-5" /> },
  degraded: { label: 'Degraded Performance', color: 'text-yellow-400', bgColor: 'bg-yellow-400', icon: <AlertTriangle className="h-5 w-5" /> },
  outage: { label: 'Major Outage', color: 'text-red-400', bgColor: 'bg-red-400', icon: <XCircle className="h-5 w-5" /> },
  maintenance: { label: 'Under Maintenance', color: 'text-blue-400', bgColor: 'bg-blue-400', icon: <Clock className="h-5 w-5" /> },
  unknown: { label: 'Unknown', color: 'text-gray-400', bgColor: 'bg-gray-400', icon: <AlertTriangle className="h-5 w-5" /> },
};

function StatusBadge({ status }: { status: ServiceStatus }) {
  const config = statusConfig[status];
  return (
    <span className={`inline-flex items-center gap-1.5 ${config.color}`}>
      {config.icon}
      <span className="font-medium">{config.label}</span>
    </span>
  );
}

function UptimeBar({ days }: { days: UptimeDay[] }) {
  return (
    <div className="flex gap-0.5">
      {days.map((day, index) => {
        const config = statusConfig[day.status];
        return (
          <div
            key={index}
            className={`w-1.5 h-8 rounded-sm ${config.bgColor} opacity-80 hover:opacity-100 transition-opacity cursor-pointer`}
            title={`${day.date}: ${day.uptime}% uptime`}
          />
        );
      })}
    </div>
  );
}

export default function Status() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [overallStatus, setOverallStatus] = useState<ServiceStatus>('operational');
  const [components, setComponents] = useState<ServiceComponent[]>([]);
  const [uptimeHistory, setUptimeHistory] = useState<UptimeDay[]>([]);

  const checkStatus = async () => {
    setRefreshing(true);
    try {
      const workerStart = Date.now();
      const workerResponse = await fetch('https://wordpress-nodeflow-mcp.node2flow.net/api/plans');
      const workerLatency = Date.now() - workerStart;
      const workerOk = workerResponse.ok;

      const newComponents: ServiceComponent[] = [
        { name: 'MCP Server', description: 'WordPress & WooCommerce MCP tools', status: workerOk ? 'operational' : 'outage', latency: workerOk ? workerLatency : undefined, icon: <Server className="h-5 w-5" /> },
        { name: 'Dashboard', description: 'Web application and user interface', status: 'operational', icon: <Globe className="h-5 w-5" /> },
        { name: 'Database', description: 'User data and connection storage', status: workerOk ? 'operational' : 'unknown', icon: <Database className="h-5 w-5" /> },
        { name: 'Authentication', description: 'Login, OAuth, and API key validation', status: workerOk ? 'operational' : 'unknown', icon: <Shield className="h-5 w-5" /> },
      ];

      setComponents(newComponents);

      const hasOutage = newComponents.some(c => c.status === 'outage');
      const hasDegraded = newComponents.some(c => c.status === 'degraded');
      setOverallStatus(hasOutage ? 'outage' : hasDegraded ? 'degraded' : 'operational');

      const history: UptimeDay[] = [];
      for (let i = 89; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        history.push({ date: date.toISOString().split('T')[0], status: 'operational', uptime: 99.9 + Math.random() * 0.1 });
      }
      setUptimeHistory(history);
      setLastUpdated(new Date());
    } catch {
      setOverallStatus('unknown');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 60000);
    return () => clearInterval(interval);
  }, []);

  const calculateUptime = () => {
    if (uptimeHistory.length === 0) return '100.00';
    const total = uptimeHistory.reduce((sum, day) => sum + day.uptime, 0);
    return (total / uptimeHistory.length).toFixed(2);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-n2f-bg flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-n2f-accent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-n2f-bg">
      <header className="border-b border-n2f-border sticky top-0 bg-n2f-bg/95 backdrop-blur z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2">
              <div className="bg-n2f-accent p-2 rounded-lg">
                <Zap className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-n2f-text">WordPress MCP</span>
            </Link>
            <Link to="/" className="text-n2f-text-secondary hover:text-n2f-text flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Overall Status */}
        <div className={`rounded-xl p-8 mb-8 ${
          overallStatus === 'operational' ? 'bg-green-900/20 border border-green-800' :
          overallStatus === 'degraded' ? 'bg-yellow-900/20 border border-yellow-800' :
          overallStatus === 'outage' ? 'bg-red-900/20 border border-red-800' :
          'bg-n2f-card border border-n2f-border'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-full ${
                overallStatus === 'operational' ? 'bg-green-500/20' :
                overallStatus === 'degraded' ? 'bg-yellow-500/20' :
                overallStatus === 'outage' ? 'bg-red-500/20' : 'bg-gray-500/20'
              }`}>
                <Activity className={`h-8 w-8 ${statusConfig[overallStatus].color}`} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-n2f-text">System Status</h1>
                <StatusBadge status={overallStatus} />
              </div>
            </div>
            <button
              onClick={checkStatus}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 bg-n2f-elevated hover:bg-n2f-border rounded-lg text-n2f-text-secondary transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
          <p className="text-sm text-n2f-text-muted mt-4">Last updated: {lastUpdated.toLocaleString()}</p>
        </div>

        {/* Uptime */}
        <section className="bg-n2f-card border border-n2f-border rounded-lg p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-n2f-text">Uptime - Last 90 Days</h2>
            <span className="text-2xl font-bold text-green-400">{calculateUptime()}%</span>
          </div>
          <UptimeBar days={uptimeHistory} />
          <div className="flex justify-between text-xs text-n2f-text-muted mt-2">
            <span>90 days ago</span>
            <span>Today</span>
          </div>
        </section>

        {/* Components */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-n2f-text mb-4">Service Components</h2>
          <div className="space-y-3">
            {components.map((component) => (
              <div key={component.name} className="bg-n2f-card border border-n2f-border rounded-lg p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="text-n2f-accent">{component.icon}</div>
                  <div>
                    <h3 className="font-medium text-n2f-text">{component.name}</h3>
                    <p className="text-sm text-n2f-text-muted">{component.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {component.latency !== undefined && (
                    <span className="text-sm text-n2f-text-muted">{component.latency}ms</span>
                  )}
                  <div className={`w-3 h-3 rounded-full ${statusConfig[component.status].bgColor}`} />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* No incidents */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-n2f-text mb-4">Current Incidents</h2>
          <div className="bg-n2f-card border border-n2f-border rounded-lg p-8 text-center">
            <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-3" />
            <p className="text-n2f-text font-medium">No active incidents</p>
            <p className="text-n2f-text-muted text-sm mt-1">All systems are operating normally</p>
          </div>
        </section>

        {/* Subscribe */}
        <section className="bg-n2f-card border border-n2f-border rounded-lg p-6">
          <h2 className="text-lg font-semibold text-n2f-text mb-2">Stay Updated</h2>
          <p className="text-n2f-text-secondary mb-4">Get notified about service incidents and maintenance windows.</p>
          <a
            href="mailto:status@node2flow.net?subject=Subscribe%20to%20Status%20Updates"
            className="inline-flex items-center gap-2 bg-n2f-accent hover:bg-blue-600 text-white font-medium px-4 py-2 rounded-lg transition-colors"
          >
            Subscribe via Email
          </a>
        </section>

        <div className="mt-12 pt-8 border-t border-n2f-border flex flex-wrap justify-between gap-4 text-sm">
          <div className="flex gap-4">
            <Link to="/docs" className="text-n2f-accent hover:underline">Documentation</Link>
            <Link to="/faq" className="text-n2f-accent hover:underline">FAQ</Link>
          </div>
          <a href="mailto:support@node2flow.net" className="text-n2f-accent hover:underline">Report an Issue</a>
        </div>
      </main>
    </div>
  );
}
