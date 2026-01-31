import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { api } from '../utils/api';
import { formatNumber, formatCurrency, formatDate, TIER_LABELS, TIER_COLORS } from '../utils/format';
import {
  CreditCard,
  Check,
  ArrowRight,
  Download,
  AlertCircle,
  Zap,
} from 'lucide-react';

interface BillingData {
  subscription: {
    tier: string;
    status: string;
    requestsUsed: number;
    requestsLimit: number;
    billingCycleEnd: string;
    nextInvoiceAmount: number;
  };
  paymentMethod: {
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
  } | null;
  invoices: Array<{
    id: string;
    date: string;
    amount: number;
    status: 'paid' | 'pending' | 'failed';
    pdfUrl: string;
  }>;
}

const plans = [
  {
    tier: 'free',
    name: 'Free',
    price: 0,
    requests: 100,
    features: ['1 connection', 'Community support'],
  },
  {
    tier: 'starter',
    name: 'Starter',
    price: 9.99,
    requests: 1000,
    features: ['3 connections', 'Email support', 'Analytics'],
  },
  {
    tier: 'pro',
    name: 'Pro',
    price: 29.99,
    requests: 10000,
    features: ['10 connections', 'Priority support', 'Analytics'],
    popular: true,
  },
  {
    tier: 'enterprise',
    name: 'Enterprise',
    price: 99.99,
    requests: 100000,
    features: ['Unlimited connections', 'Dedicated support', 'SLA'],
  },
];

export default function Billing() {
  const { user, refreshUser } = useAuth();
  const [data, setData] = useState<BillingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [isUpgrading, setIsUpgrading] = useState(false);

  useEffect(() => {
    loadBilling();
  }, []);

  async function loadBilling() {
    try {
      const result = await api.get<BillingData>('/api/billing');
      setData(result);
    } catch (error) {
      console.error('Failed to load billing:', error);
      // Mock data
      setData({
        subscription: {
          tier: user?.plan || 'free',
          status: 'active',
          requestsUsed: 3421,
          requestsLimit: 10000,
          billingCycleEnd: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
          nextInvoiceAmount: 9,
        },
        paymentMethod: user?.plan !== 'free' ? {
          brand: 'visa',
          last4: '4242',
          expMonth: 12,
          expYear: 2027,
        } : null,
        invoices: [
          { id: '1', date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), amount: 9, status: 'paid', pdfUrl: '#' },
          { id: '2', date: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(), amount: 9, status: 'paid', pdfUrl: '#' },
        ],
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleUpgrade(tier: string) {
    setSelectedPlan(tier);
    setIsUpgrading(true);

    try {
      const result = await api.post<{ checkoutUrl: string }>('/api/billing/checkout', { tier });
      // Redirect to Stripe checkout
      window.location.href = result.checkoutUrl;
    } catch (error) {
      console.error('Failed to start checkout:', error);
      alert('Failed to start checkout. Please try again.');
    } finally {
      setIsUpgrading(false);
      setSelectedPlan(null);
    }
  }

  async function handleManageBilling() {
    try {
      const result = await api.post<{ portalUrl: string }>('/api/billing/portal');
      window.location.href = result.portalUrl;
    } catch (error) {
      console.error('Failed to open billing portal:', error);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const usagePercent = data ? (data.subscription.requestsUsed / data.subscription.requestsLimit) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Billing</h1>
        <p className="text-gray-600">Manage your subscription and payment methods</p>
      </div>

      {/* Current Plan */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Current Plan</h2>
            <div className="flex items-center mt-2">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${TIER_COLORS[data?.subscription.tier || 'free']}`}>
                {TIER_LABELS[data?.subscription.tier || 'free']}
              </span>
              <span className="ml-3 text-gray-500">
                {data?.subscription.tier !== 'free' && (
                  <>Renews {formatDate(data?.subscription.billingCycleEnd || '')}</>
                )}
              </span>
            </div>
          </div>
          {data?.subscription.tier !== 'free' && (
            <button onClick={handleManageBilling} className="btn btn-secondary">
              Manage Billing
            </button>
          )}
        </div>

        {/* Usage */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-600">
              {formatNumber(data?.subscription.requestsUsed || 0)} / {formatNumber(data?.subscription.requestsLimit || 0)} requests used
            </span>
            <span className="font-medium">{usagePercent.toFixed(1)}%</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                usagePercent > 90 ? 'bg-red-500' : usagePercent > 70 ? 'bg-orange-500' : 'bg-primary-500'
              }`}
              style={{ width: `${Math.min(usagePercent, 100)}%` }}
            />
          </div>
          {usagePercent > 80 && (
            <p className="text-sm text-orange-600 mt-2 flex items-center">
              <AlertCircle className="h-4 w-4 mr-1" />
              You're approaching your request limit. Consider upgrading.
            </p>
          )}
        </div>
      </div>

      {/* Payment Method */}
      {data?.paymentMethod && (
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment Method</h2>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-12 h-8 bg-gray-100 rounded flex items-center justify-center mr-4">
                <CreditCard className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900 capitalize">
                  {data.paymentMethod.brand} •••• {data.paymentMethod.last4}
                </p>
                <p className="text-sm text-gray-500">
                  Expires {data.paymentMethod.expMonth}/{data.paymentMethod.expYear}
                </p>
              </div>
            </div>
            <button onClick={handleManageBilling} className="text-primary-600 hover:text-primary-700 text-sm font-medium">
              Update
            </button>
          </div>
        </div>
      )}

      {/* Plans */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Available Plans</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {plans.map((plan) => {
            const isCurrentPlan = plan.tier === data?.subscription.tier;
            const isDowngrade = plans.findIndex(p => p.tier === plan.tier) < plans.findIndex(p => p.tier === data?.subscription.tier);

            return (
              <div
                key={plan.tier}
                className={`card relative ${plan.popular ? 'ring-2 ring-primary-500' : ''} ${isCurrentPlan ? 'bg-primary-50' : ''}`}
              >
                {plan.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary-500 text-white text-xs font-medium px-3 py-1 rounded-full">
                    Popular
                  </span>
                )}
                {isCurrentPlan && (
                  <span className="absolute -top-3 right-4 bg-green-500 text-white text-xs font-medium px-3 py-1 rounded-full">
                    Current
                  </span>
                )}

                <h3 className="text-lg font-semibold text-gray-900">{plan.name}</h3>
                <div className="mt-2 mb-4">
                  <span className="text-3xl font-bold text-gray-900">${plan.price}</span>
                  <span className="text-gray-500">/month</span>
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  {formatNumber(plan.requests)} requests/month
                </p>

                <ul className="space-y-2 mb-6">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center text-sm text-gray-600">
                      <Check className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => !isCurrentPlan && !isDowngrade && handleUpgrade(plan.tier)}
                  disabled={isCurrentPlan || isDowngrade || isUpgrading}
                  className={`btn w-full ${
                    isCurrentPlan
                      ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                      : isDowngrade
                      ? 'btn-secondary'
                      : 'btn-primary'
                  }`}
                >
                  {isUpgrading && selectedPlan === plan.tier ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Processing...
                    </span>
                  ) : isCurrentPlan ? (
                    'Current Plan'
                  ) : isDowngrade ? (
                    'Contact Support'
                  ) : (
                    <>
                      Upgrade <ArrowRight className="h-4 w-4 ml-1" />
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Enterprise */}
      <div className="card bg-gradient-to-r from-gray-900 to-gray-800 text-white">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center mb-2">
              <Zap className="h-6 w-6 text-yellow-400 mr-2" />
              <h2 className="text-xl font-bold">Enterprise</h2>
            </div>
            <p className="text-gray-300 mb-4">
              Need unlimited requests, custom SLA, or dedicated support? Contact us for enterprise pricing.
            </p>
            <ul className="flex flex-wrap gap-4 text-sm text-gray-300">
              <li className="flex items-center"><Check className="h-4 w-4 text-green-400 mr-1" /> 100,000 requests/mo</li>
              <li className="flex items-center"><Check className="h-4 w-4 text-green-400 mr-1" /> Unlimited connections</li>
              <li className="flex items-center"><Check className="h-4 w-4 text-green-400 mr-1" /> Dedicated support</li>
              <li className="flex items-center"><Check className="h-4 w-4 text-green-400 mr-1" /> SLA guarantee</li>
            </ul>
          </div>
          <button className="btn bg-white text-gray-900 hover:bg-gray-100">
            Contact Sales
          </button>
        </div>
      </div>

      {/* Invoices */}
      {data?.invoices && data.invoices.length > 0 && (
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Invoice History</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Date</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Amount</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Status</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Invoice</th>
                </tr>
              </thead>
              <tbody>
                {data.invoices.map((invoice) => (
                  <tr key={invoice.id} className="border-b border-gray-100 last:border-0">
                    <td className="py-3 px-4 text-sm text-gray-900">{formatDate(invoice.date)}</td>
                    <td className="py-3 px-4 text-sm text-gray-900">{formatCurrency(invoice.amount)}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          invoice.status === 'paid'
                            ? 'bg-green-100 text-green-700'
                            : invoice.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <a
                        href={invoice.pdfUrl}
                        className="text-primary-600 hover:text-primary-700 inline-flex items-center"
                      >
                        <Download className="h-4 w-4 mr-1" />
                        PDF
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
