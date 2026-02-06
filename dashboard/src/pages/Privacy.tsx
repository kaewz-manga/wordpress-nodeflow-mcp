import { Link } from 'react-router-dom';
import { Zap, ArrowLeft, Shield, Database, Lock, Globe, Trash2, Mail } from 'lucide-react';

export default function Privacy() {
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
          <h1 className="text-3xl font-bold text-n2f-text mb-2">Privacy Policy</h1>
          <p className="text-n2f-text-muted">Last updated: February 6, 2026</p>
        </div>

        {/* Quick Summary */}
        <div className="bg-n2f-card border border-n2f-border rounded-lg p-6 mb-8">
          <h2 className="text-lg font-semibold text-n2f-text mb-4 flex items-center gap-2">
            <Shield className="h-5 w-5 text-n2f-accent" />
            Privacy at a Glance
          </h2>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div className="flex items-start gap-3">
              <Database className="h-4 w-4 text-green-400 mt-0.5" />
              <div>
                <p className="text-n2f-text font-medium">Minimal Data Collection</p>
                <p className="text-n2f-text-muted">Only what's necessary to provide the service</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Lock className="h-4 w-4 text-green-400 mt-0.5" />
              <div>
                <p className="text-n2f-text font-medium">Encrypted at Rest</p>
                <p className="text-n2f-text-muted">AES-256-GCM for sensitive data</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Globe className="h-4 w-4 text-green-400 mt-0.5" />
              <div>
                <p className="text-n2f-text font-medium">No Tracking</p>
                <p className="text-n2f-text-muted">No third-party analytics or ads</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Trash2 className="h-4 w-4 text-green-400 mt-0.5" />
              <div>
                <p className="text-n2f-text font-medium">Easy Deletion</p>
                <p className="text-n2f-text-muted">Delete your account anytime from Settings</p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-8 text-n2f-text-secondary">
          <section>
            <h2 className="text-xl font-semibold text-n2f-text mb-4">1. Introduction</h2>
            <p className="mb-3">
              WordPress MCP ("Service", "we", "us", "our") is operated by Node2Flow. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our hosted MCP service for WordPress and WooCommerce management.
            </p>
            <p>
              We are committed to protecting your privacy. We do not sell your personal information and we minimize data collection to only what is necessary to provide the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-n2f-text mb-4">2. Definitions</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong className="text-n2f-text">Personal Data:</strong> Information that can be used to identify you (e.g., email address)</li>
              <li><strong className="text-n2f-text">Usage Data:</strong> Automatically collected information about how you use the Service</li>
              <li><strong className="text-n2f-text">Connection Data:</strong> Information about your WordPress instances (URLs, encrypted credentials)</li>
              <li><strong className="text-n2f-text">MCP:</strong> Model Context Protocol - a standard for AI assistant integrations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-n2f-text mb-4">3. Information We Collect</h2>

            <div className="space-y-6">
              <div className="bg-n2f-elevated rounded-lg p-4">
                <h3 className="text-lg font-medium text-n2f-text mb-2">3A. Account Information</h3>
                <ul className="list-disc pl-6 space-y-1">
                  <li><strong className="text-n2f-text">Email address:</strong> Used for login and account notifications</li>
                  <li><strong className="text-n2f-text">Password:</strong> Hashed using PBKDF2 with 100,000 iterations (we never store plain text)</li>
                  <li><strong className="text-n2f-text">OAuth data:</strong> If using GitHub/Google login, we receive your email and profile ID</li>
                </ul>
              </div>

              <div className="bg-n2f-elevated rounded-lg p-4">
                <h3 className="text-lg font-medium text-n2f-text mb-2">3B. API Keys</h3>
                <ul className="list-disc pl-6 space-y-1">
                  <li><strong className="text-n2f-text">Your API keys:</strong> Stored as SHA-256 hashes only - we cannot retrieve the original key</li>
                  <li><strong className="text-n2f-text">Key prefix:</strong> First 8 characters stored for identification (e.g., n2f_abc1...)</li>
                  <li><strong className="text-n2f-text">Key metadata:</strong> Name, creation date, last used timestamp</li>
                </ul>
              </div>

              <div className="bg-n2f-elevated rounded-lg p-4">
                <h3 className="text-lg font-medium text-n2f-text mb-2">3C. WordPress Connection Data</h3>
                <ul className="list-disc pl-6 space-y-1">
                  <li><strong className="text-n2f-text">Site URL:</strong> Your WordPress site address</li>
                  <li><strong className="text-n2f-text">Username:</strong> WordPress admin username (encrypted)</li>
                  <li><strong className="text-n2f-text">Application Password:</strong> Encrypted using AES-256-GCM before storage</li>
                  <li><strong className="text-n2f-text">ImgBB API Key:</strong> Encrypted for image upload functionality</li>
                </ul>
              </div>

              <div className="bg-n2f-elevated rounded-lg p-4">
                <h3 className="text-lg font-medium text-n2f-text mb-2">3D. Usage Data</h3>
                <ul className="list-disc pl-6 space-y-1">
                  <li><strong className="text-n2f-text">Request logs:</strong> Timestamp, tool name, success/failure status</li>
                  <li><strong className="text-n2f-text">Rate limiting:</strong> Request counts for enforcing plan limits</li>
                  <li><strong className="text-n2f-text">Error logs:</strong> For debugging and service improvement</li>
                </ul>
                <p className="mt-2 text-sm text-n2f-text-muted">
                  Usage logs are automatically deleted after <strong>90 days</strong>.
                </p>
              </div>

              <div className="bg-n2f-elevated rounded-lg p-4">
                <h3 className="text-lg font-medium text-n2f-text mb-2">3E. Payment Information</h3>
                <p>
                  Payment processing is handled by <strong>Stripe</strong>. We do not store your credit card details. We only receive:
                </p>
                <ul className="list-disc pl-6 space-y-1 mt-2">
                  <li>Stripe customer ID (for subscription management)</li>
                  <li>Subscription status and plan type</li>
                  <li>Invoice history references</li>
                </ul>
              </div>

              <div className="bg-red-900/20 border border-red-800 rounded-lg p-4">
                <h3 className="text-lg font-medium text-red-400 mb-2">3F. What We DON'T Collect</h3>
                <ul className="list-disc pl-6 space-y-1">
                  <li><strong className="text-n2f-text">Post content:</strong> We never store your WordPress posts, pages, or media</li>
                  <li><strong className="text-n2f-text">Customer data:</strong> Your WooCommerce customer data stays on your WordPress site</li>
                  <li><strong className="text-n2f-text">Order details:</strong> Your WooCommerce orders are never cached by us</li>
                  <li><strong className="text-n2f-text">Telemetry:</strong> We do not collect anonymous usage telemetry</li>
                  <li><strong className="text-n2f-text">Tracking:</strong> No Google Analytics, Facebook pixels, or third-party trackers</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-n2f-text mb-4">4. How We Use Your Information</h2>
            <p className="mb-3">We use collected information for:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong className="text-n2f-text">Authentication:</strong> Verifying your identity when you log in</li>
              <li><strong className="text-n2f-text">Service delivery:</strong> Proxying MCP requests to your WordPress instances</li>
              <li><strong className="text-n2f-text">Rate limiting:</strong> Enforcing plan limits to ensure fair usage</li>
              <li><strong className="text-n2f-text">Billing:</strong> Processing subscription payments via Stripe</li>
              <li><strong className="text-n2f-text">Security:</strong> Detecting and preventing unauthorized access</li>
              <li><strong className="text-n2f-text">Communication:</strong> Sending important service updates (no marketing)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-n2f-text mb-4">5. Data Security</h2>
            <p className="mb-4">We implement comprehensive security measures:</p>
            <div className="space-y-4">
              <div className="bg-n2f-elevated rounded-lg p-4">
                <h3 className="font-medium text-n2f-text mb-2">Encryption</h3>
                <ul className="list-disc pl-6 space-y-1 text-sm">
                  <li><strong>In transit:</strong> All communications use HTTPS with TLS 1.3</li>
                  <li><strong>At rest:</strong> Sensitive data encrypted with AES-256-GCM</li>
                  <li><strong>Passwords:</strong> PBKDF2 with 100,000 iterations and unique salts</li>
                  <li><strong>API keys:</strong> SHA-256 hashed (one-way, irreversible)</li>
                </ul>
              </div>
              <div className="bg-n2f-elevated rounded-lg p-4">
                <h3 className="font-medium text-n2f-text mb-2">Infrastructure</h3>
                <ul className="list-disc pl-6 space-y-1 text-sm">
                  <li><strong>Hosting:</strong> Cloudflare Workers (edge computing, no persistent servers)</li>
                  <li><strong>Database:</strong> Cloudflare D1 (SQLite at the edge)</li>
                  <li><strong>Rate limiting:</strong> Cloudflare KV (distributed key-value store)</li>
                  <li><strong>DDoS protection:</strong> Built-in Cloudflare protection</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-n2f-text mb-4">6. Data Sharing & Third Parties</h2>
            <p className="mb-4">We share data only with essential service providers:</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-n2f-border">
                    <th className="text-left py-2 text-n2f-text">Provider</th>
                    <th className="text-left py-2 text-n2f-text">Purpose</th>
                    <th className="text-left py-2 text-n2f-text">Data Shared</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-n2f-border">
                  <tr>
                    <td className="py-2">Cloudflare</td>
                    <td className="py-2">Hosting, CDN, DDoS protection</td>
                    <td className="py-2">All service data</td>
                  </tr>
                  <tr>
                    <td className="py-2">Stripe</td>
                    <td className="py-2">Payment processing</td>
                    <td className="py-2">Email, subscription data</td>
                  </tr>
                  <tr>
                    <td className="py-2">GitHub/Google</td>
                    <td className="py-2">OAuth authentication</td>
                    <td className="py-2">OAuth tokens (temporary)</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-4">
              <strong className="text-n2f-text">We do NOT share data with:</strong> Advertisers, data brokers, analytics companies, or any third party for marketing purposes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-n2f-text mb-4">7. Data Retention</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-n2f-border">
                    <th className="text-left py-2 text-n2f-text">Data Type</th>
                    <th className="text-left py-2 text-n2f-text">Retention Period</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-n2f-border">
                  <tr><td className="py-2">Account data</td><td className="py-2">Until account deletion</td></tr>
                  <tr><td className="py-2">Connection data</td><td className="py-2">Until connection or account deletion</td></tr>
                  <tr><td className="py-2">Usage logs</td><td className="py-2">90 days (auto-deleted)</td></tr>
                  <tr><td className="py-2">Error logs</td><td className="py-2">30 days (auto-deleted)</td></tr>
                  <tr><td className="py-2">Deleted account data</td><td className="py-2">30 days (grace period), then permanently deleted</td></tr>
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-n2f-text mb-4">8. Your Rights</h2>
            <p className="mb-4">Under GDPR, CCPA, and Thailand's PDPA, you have the following rights:</p>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-n2f-elevated rounded-lg p-4">
                <h3 className="font-medium text-n2f-text mb-2">Access</h3>
                <p className="text-sm">Request a copy of your personal data. Available in Dashboard Settings.</p>
              </div>
              <div className="bg-n2f-elevated rounded-lg p-4">
                <h3 className="font-medium text-n2f-text mb-2">Rectification</h3>
                <p className="text-sm">Update inaccurate data directly in your account settings.</p>
              </div>
              <div className="bg-n2f-elevated rounded-lg p-4">
                <h3 className="font-medium text-n2f-text mb-2">Erasure</h3>
                <p className="text-sm">Delete your account and all associated data from Settings.</p>
              </div>
              <div className="bg-n2f-elevated rounded-lg p-4">
                <h3 className="font-medium text-n2f-text mb-2">Portability</h3>
                <p className="text-sm">Export your data in a machine-readable format (JSON).</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-n2f-text mb-4">9. Cookies & Local Storage</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong className="text-n2f-text">localStorage (JWT token):</strong> Stores your authentication token. Essential for login persistence. Cleared on logout.</li>
              <li><strong className="text-n2f-text">No tracking cookies:</strong> We do not use any third-party tracking cookies.</li>
              <li><strong className="text-n2f-text">No advertising cookies:</strong> We do not serve ads or use advertising networks.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-n2f-text mb-4">10. Contact Information</h2>
            <p className="mb-4">For privacy-related questions or to exercise your rights:</p>
            <div className="bg-n2f-elevated rounded-lg p-4 flex items-center gap-3">
              <Mail className="h-5 w-5 text-n2f-accent" />
              <div>
                <p className="text-n2f-text font-medium">Email</p>
                <a href="mailto:privacy@node2flow.net" className="text-n2f-accent hover:underline">
                  privacy@node2flow.net
                </a>
              </div>
            </div>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-n2f-border flex justify-between">
          <Link to="/terms" className="text-n2f-accent hover:underline">Terms of Service</Link>
          <Link to="/" className="text-n2f-accent hover:underline">Back to Home</Link>
        </div>
      </main>
    </div>
  );
}
