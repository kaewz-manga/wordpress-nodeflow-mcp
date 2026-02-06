import { Link } from 'react-router-dom';
import { Zap, ArrowLeft, AlertTriangle, CheckCircle, XCircle, Mail, Scale } from 'lucide-react';

export default function Terms() {
  return (
    <div className="min-h-screen bg-n2f-bg">
      {/* Header */}
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

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-n2f-text mb-2">Terms of Service</h1>
          <p className="text-n2f-text-muted">Last updated: February 6, 2026</p>
        </div>

        {/* Important Notice */}
        <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-6 mb-8">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-6 w-6 text-yellow-500 flex-shrink-0 mt-0.5" />
            <div>
              <h2 className="text-lg font-semibold text-yellow-400 mb-2">Important Notice</h2>
              <p className="text-yellow-200/80 text-sm">
                WordPress MCP is a <strong>tool for AI agents</strong> to interact with your WordPress and WooCommerce sites.
                You are fully responsible for all actions performed by AI agents using this service.
                The Service proxies requests to YOUR WordPress instance - we have no control over what content
                is created, modified, or deleted.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-8 text-n2f-text-secondary">
          <section>
            <h2 className="text-xl font-semibold text-n2f-text mb-4">1. Agreement to Terms</h2>
            <p className="mb-3">
              By accessing or using WordPress MCP ("Service"), you agree to be bound by these Terms of Service ("Terms").
              If you are using the Service on behalf of an organization, you represent that you have authority to bind that organization to these Terms.
            </p>
            <p>If you do not agree to these Terms, you must not use the Service.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-n2f-text mb-4">2. Description of Service</h2>
            <p className="mb-3">
              WordPress MCP provides a hosted Model Context Protocol (MCP) server that enables AI assistants
              (such as Claude, Cursor, or other MCP-compatible clients) to interact with your WordPress and WooCommerce sites.
            </p>
            <p className="mb-3">The Service includes:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>MCP endpoint for AI assistant integration with WordPress REST API</li>
              <li>WooCommerce management tools (products, orders, customers)</li>
              <li>Secure storage of WordPress connection credentials</li>
              <li>Image upload via ImgBB integration</li>
              <li>API key management for authentication</li>
              <li>Usage tracking and rate limiting</li>
              <li>Web dashboard for account management</li>
            </ul>
            <p className="mt-3 text-sm text-n2f-text-muted">
              <strong>Disclaimer:</strong> This Service is NOT affiliated with, endorsed by, or officially connected to
              Automattic Inc. or the WordPress Foundation. "WordPress" and "WooCommerce" are trademarks of their respective owners.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-n2f-text mb-4">3. Service Plans & Billing</h2>
            <div className="overflow-x-auto mb-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-n2f-border">
                    <th className="text-left py-2 text-n2f-text">Plan</th>
                    <th className="text-left py-2 text-n2f-text">Price</th>
                    <th className="text-left py-2 text-n2f-text">Daily Limit</th>
                    <th className="text-left py-2 text-n2f-text">Rate Limit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-n2f-border">
                  <tr><td className="py-2">Free</td><td className="py-2">$0/month</td><td className="py-2">100 requests/day</td><td className="py-2">50 requests/min</td></tr>
                  <tr><td className="py-2">Pro</td><td className="py-2">$19/month</td><td className="py-2">5,000 requests/day</td><td className="py-2">100 requests/min</td></tr>
                  <tr><td className="py-2">Enterprise</td><td className="py-2">Custom</td><td className="py-2">Unlimited</td><td className="py-2">Custom</td></tr>
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-n2f-text mb-4">4. Permitted Use</h2>
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                <span>Connect AI assistants to your own WordPress sites</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                <span>Manage posts, pages, products, orders, and media via MCP</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                <span>Build integrations and automations for legitimate purposes</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                <span>Use for commercial or personal projects within plan limits</span>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-n2f-text mb-4">5. Prohibited Uses</h2>
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <XCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                <span>Violate any applicable laws or regulations</span>
              </div>
              <div className="flex items-start gap-2">
                <XCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                <span>Access WordPress sites you do not own or have authorization to access</span>
              </div>
              <div className="flex items-start gap-2">
                <XCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                <span>Circumvent rate limits or abuse the Service</span>
              </div>
              <div className="flex items-start gap-2">
                <XCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                <span>Distribute spam content or malicious plugins via the Service</span>
              </div>
              <div className="flex items-start gap-2">
                <XCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                <span>Attempt to reverse engineer or disrupt the Service</span>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-n2f-text mb-4">6. AI Agent Responsibility</h2>
            <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 mb-4">
              <p className="text-red-200">
                <strong className="text-red-400">CRITICAL:</strong> You accept full responsibility for all actions
                performed by AI agents using your API keys. This includes but is not limited to:
              </p>
            </div>
            <ul className="list-disc pl-6 space-y-2">
              <li>Post/page creation, modification, or deletion</li>
              <li>WooCommerce product, order, and customer management</li>
              <li>Media uploads and modifications</li>
              <li>Plugin and theme settings changes</li>
              <li>Any content published to your WordPress site</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-n2f-text mb-4">7. Limitation of Liability</h2>
            <div className="bg-n2f-elevated rounded-lg p-4 mb-4">
              <p className="text-sm">
                THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND. OUR MAXIMUM LIABILITY IS LIMITED TO
                THE GREATER OF: (a) $100 USD, OR (b) THE TOTAL AMOUNT YOU PAID US IN THE 12 MONTHS PRECEDING THE CLAIM.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-n2f-text mb-4">8. Governing Law</h2>
            <div className="flex items-start gap-3">
              <Scale className="h-5 w-5 text-n2f-accent flex-shrink-0 mt-0.5" />
              <div>
                <p className="mb-2">
                  These Terms are governed by the laws of <strong className="text-n2f-text">Thailand</strong>,
                  without regard to conflict of law principles.
                </p>
                <p>
                  Any disputes shall be resolved in the courts of Bangkok, Thailand.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-n2f-text mb-4">9. Contact Information</h2>
            <div className="bg-n2f-elevated rounded-lg p-4 flex items-center gap-3">
              <Mail className="h-5 w-5 text-n2f-accent" />
              <div>
                <p className="text-n2f-text font-medium">Email</p>
                <a href="mailto:legal@node2flow.net" className="text-n2f-accent hover:underline">legal@node2flow.net</a>
              </div>
            </div>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-n2f-border flex justify-between">
          <Link to="/privacy" className="text-n2f-accent hover:underline">Privacy Policy</Link>
          <Link to="/" className="text-n2f-accent hover:underline">Back to Home</Link>
        </div>
      </main>
    </div>
  );
}
