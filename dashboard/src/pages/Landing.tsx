import { Link } from 'react-router-dom';
import {
  Zap,
  Key,
  BarChart3,
  Shield,
  Globe,
  ArrowRight,
  Check,
  Code,
  Bot,
} from 'lucide-react';

const features = [
  {
    icon: Bot,
    title: 'MCP Protocol',
    description: 'Connect any MCP-compatible AI client to your WordPress site',
  },
  {
    icon: Key,
    title: 'API Key Management',
    description: 'Generate and manage API keys with fine-grained permissions',
  },
  {
    icon: BarChart3,
    title: 'Usage Analytics',
    description: 'Track requests, response times, and errors in real-time',
  },
  {
    icon: Shield,
    title: 'Enterprise Security',
    description: 'SOC2 compliant with SSO, audit logs, and encryption',
  },
  {
    icon: Globe,
    title: 'Edge Network',
    description: 'Deployed on Cloudflare with 300+ global locations',
  },
  {
    icon: Code,
    title: '24 WordPress Tools',
    description: 'Posts, pages, media, comments, categories, and more',
  },
];

const tiers = [
  {
    name: 'Free',
    price: 0,
    requests: '1,000',
    rateLimit: '10 req/min',
    features: ['1 API key', 'Basic analytics', 'Community support'],
  },
  {
    name: 'Starter',
    price: 9,
    requests: '10,000',
    rateLimit: '30 req/min',
    features: ['5 API keys', 'Advanced analytics', 'Email support', 'Webhooks'],
    popular: true,
  },
  {
    name: 'Pro',
    price: 29,
    requests: '50,000',
    rateLimit: '100 req/min',
    features: ['Unlimited API keys', 'Team management', 'Priority support', 'SLA reports'],
  },
  {
    name: 'Business',
    price: 99,
    requests: '200,000',
    rateLimit: '300 req/min',
    features: ['Everything in Pro', 'Dedicated support', 'Custom domains', 'Audit logs'],
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Zap className="h-8 w-8 text-primary-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">WordPress MCP</span>
            </div>
            <div className="flex items-center space-x-4">
              <Link to="/docs" className="text-gray-600 hover:text-gray-900">
                Docs
              </Link>
              <Link to="/login" className="text-gray-600 hover:text-gray-900">
                Sign in
              </Link>
              <Link to="/register" className="btn btn-primary">
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-20 pb-32 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl sm:text-6xl font-bold text-gray-900 mb-6">
            Connect AI to{' '}
            <span className="text-primary-600">WordPress</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            A managed MCP server that lets you control WordPress with Claude, Cursor,
            or any MCP-compatible AI client. No infrastructure required.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/register" className="btn btn-primary text-lg px-8 py-3">
              Start Free <ArrowRight className="ml-2 h-5 w-5 inline" />
            </Link>
            <Link to="/docs" className="btn btn-secondary text-lg px-8 py-3">
              View Documentation
            </Link>
          </div>
          <p className="mt-4 text-sm text-gray-500">
            Free tier includes 1,000 requests/month
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Everything you need to automate WordPress
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature) => (
              <div key={feature.title} className="card">
                <feature.icon className="h-10 w-10 text-primary-600 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-4">
            Simple, transparent pricing
          </h2>
          <p className="text-center text-gray-600 mb-12">
            Start free, scale as you grow
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {tiers.map((tier) => (
              <div
                key={tier.name}
                className={`card relative ${
                  tier.popular ? 'ring-2 ring-primary-500' : ''
                }`}
              >
                {tier.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary-500 text-white text-xs font-medium px-3 py-1 rounded-full">
                    Most Popular
                  </span>
                )}
                <h3 className="text-lg font-semibold text-gray-900">{tier.name}</h3>
                <div className="mt-4 mb-6">
                  <span className="text-4xl font-bold text-gray-900">
                    ${tier.price}
                  </span>
                  <span className="text-gray-500">/month</span>
                </div>
                <div className="space-y-2 mb-6 text-sm">
                  <p className="text-gray-600">
                    <strong>{tier.requests}</strong> requests/month
                  </p>
                  <p className="text-gray-600">{tier.rateLimit}</p>
                </div>
                <ul className="space-y-2 mb-6">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-center text-sm text-gray-600">
                      <Check className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link
                  to="/register"
                  className={`btn w-full text-center ${
                    tier.popular ? 'btn-primary' : 'btn-secondary'
                  }`}
                >
                  Get Started
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-primary-600">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to automate your WordPress?
          </h2>
          <p className="text-primary-100 mb-8">
            Get started for free. No credit card required.
          </p>
          <Link
            to="/register"
            className="btn bg-white text-primary-600 hover:bg-gray-100 text-lg px-8 py-3"
          >
            Create Free Account
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center mb-4 md:mb-0">
              <Zap className="h-6 w-6 text-primary-500" />
              <span className="ml-2 text-white font-semibold">WordPress MCP</span>
            </div>
            <div className="flex space-x-6 text-sm">
              <Link to="/docs" className="hover:text-white">Documentation</Link>
              <a href="#" className="hover:text-white">Privacy</a>
              <a href="#" className="hover:text-white">Terms</a>
              <a href="https://github.com" className="hover:text-white">GitHub</a>
            </div>
          </div>
          <div className="mt-8 text-center text-sm">
            &copy; 2026 WordPress MCP. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
