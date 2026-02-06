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
    title: 'Secure by Default',
    description: 'AES-GCM encryption, API key auth, and SSRF protection',
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
    requests: '100',
    features: ['1 connection', 'Community support'],
  },
  {
    name: 'Starter',
    price: 9.99,
    requests: '1,000',
    features: ['3 connections', 'Email support', 'Analytics'],
    popular: true,
  },
  {
    name: 'Pro',
    price: 29.99,
    requests: '10,000',
    features: ['10 connections', 'Priority support', 'Analytics'],
  },
  {
    name: 'Enterprise',
    price: 99.99,
    requests: '100,000',
    features: ['Unlimited connections', 'Dedicated support', 'SLA'],
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-n2f-bg">
      {/* Header */}
      <header className="border-b border-n2f-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="bg-n2f-accent p-2 rounded-lg">
                <Zap className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-n2f-text">WordPress MCP</span>
            </div>
            <div className="flex items-center gap-4">
              <Link to="/docs" className="text-n2f-text-secondary hover:text-n2f-text">
                Docs
              </Link>
              <Link to="/login" className="text-n2f-text-secondary hover:text-n2f-text">
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
      <section className="py-20 bg-gradient-to-b from-n2f-card to-n2f-bg px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl sm:text-6xl font-bold text-n2f-text mb-6">
            Connect AI to{' '}
            <span className="text-n2f-accent">WordPress</span>
          </h1>
          <p className="text-xl text-n2f-text-secondary mb-8 max-w-2xl mx-auto">
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
          <p className="mt-4 text-sm text-n2f-text-muted">
            Free plan includes 100 requests/month
          </p>

          {/* Demo Code Block */}
          <div className="mt-12 max-w-2xl mx-auto bg-black rounded-xl p-6 text-left shadow-2xl border border-n2f-border">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="ml-2 text-n2f-text-muted text-sm">Claude Desktop</span>
            </div>
            <pre className="text-sm text-green-400 overflow-x-auto">
              <code>{`> Create a new blog post about AI automation

Done! I created "AI Automation in 2026" as a draft post.

Post ID: 42
Status: draft
URL: https://your-site.com/?p=42

Would you like me to publish it or add a featured image?`}</code>
            </pre>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-n2f-text mb-4">
              Everything you need to automate WordPress
            </h2>
            <p className="text-lg text-n2f-text-secondary max-w-2xl mx-auto">
              Our MCP server provides a complete interface between your AI assistant and WordPress.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature) => (
              <div key={feature.title} className="bg-n2f-card p-6 rounded-xl border border-n2f-border hover:border-n2f-accent/30 hover:shadow-lg transition-all">
                <div className="bg-n2f-accent/10 w-12 h-12 rounded-lg flex items-center justify-center text-n2f-accent mb-4">
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold text-n2f-text mb-2">
                  {feature.title}
                </h3>
                <p className="text-n2f-text-secondary">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 bg-n2f-card border-t border-b border-n2f-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-n2f-text mb-4">
              Simple, transparent pricing
            </h2>
            <p className="text-lg text-n2f-text-secondary">
              Start free, scale as you grow
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {tiers.map((tier) => (
              <div
                key={tier.name}
                className={`bg-n2f-bg p-6 rounded-xl border-2 relative ${
                  tier.popular ? 'border-n2f-accent shadow-lg' : 'border-n2f-border'
                }`}
              >
                {tier.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-n2f-accent text-white text-xs font-medium px-3 py-1 rounded-full">
                    Most Popular
                  </span>
                )}
                <h3 className="text-lg font-semibold text-n2f-text">{tier.name}</h3>
                <div className="mt-4 mb-6">
                  <span className="text-4xl font-bold text-n2f-text">
                    ${tier.price}
                  </span>
                  <span className="text-n2f-text-muted">/month</span>
                </div>
                <div className="mb-6 text-sm">
                  <p className="text-n2f-text-secondary">
                    <strong className="text-n2f-text">{tier.requests}</strong> requests/month
                  </p>
                </div>
                <ul className="space-y-2 mb-6">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-center text-sm text-n2f-text-secondary">
                      <Check className="h-4 w-4 text-green-400 mr-2 flex-shrink-0" />
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
      <section className="py-20">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-n2f-text mb-4">
            Ready to automate your WordPress?
          </h2>
          <p className="text-xl text-n2f-text-secondary mb-8 max-w-2xl mx-auto">
            Get started for free. No credit card required.
          </p>
          <Link
            to="/register"
            className="inline-flex items-center px-8 py-3 bg-n2f-accent text-white font-semibold rounded-lg hover:bg-n2f-accent-hover transition-colors"
          >
            Create Free Account <ArrowRight className="h-5 w-5 ml-2" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 bg-n2f-bg border-t border-n2f-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center gap-2 mb-4 md:mb-0">
              <div className="bg-n2f-accent p-1.5 rounded-lg">
                <Zap className="h-4 w-4 text-white" />
              </div>
              <span className="text-n2f-text font-semibold">WordPress MCP</span>
            </div>
            <div className="flex space-x-6 text-sm">
              <Link to="/docs" className="text-n2f-text-muted hover:text-n2f-accent">Documentation</Link>
              <a href="#" className="text-n2f-text-muted hover:text-n2f-accent">Privacy</a>
              <a href="#" className="text-n2f-text-muted hover:text-n2f-accent">Terms</a>
              <a href="https://github.com" className="text-n2f-text-muted hover:text-n2f-accent">GitHub</a>
            </div>
          </div>
          <div className="mt-8 text-center text-sm text-n2f-text-muted">
            &copy; 2026 WordPress MCP. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
