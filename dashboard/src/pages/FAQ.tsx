import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Zap, ArrowLeft, ChevronDown, Search, HelpCircle, Zap as Lightning, Shield, CreditCard, Code, AlertTriangle } from 'lucide-react';

interface FAQItem {
  question: string;
  answer: string | React.ReactNode;
}

interface FAQCategory {
  name: string;
  icon: React.ReactNode;
  items: FAQItem[];
}

const faqData: FAQCategory[] = [
  {
    name: 'Getting Started',
    icon: <Lightning className="h-5 w-5" />,
    items: [
      {
        question: 'What is WordPress MCP?',
        answer: (
          <div className="space-y-2">
            <p>
              WordPress MCP is a hosted service that allows AI assistants (like Claude, Cursor, or other MCP-compatible clients)
              to interact with your WordPress and WooCommerce sites.
            </p>
            <p>
              MCP (Model Context Protocol) is a standard protocol that enables AI assistants to use external tools.
              Our service acts as a bridge between your AI assistant and your WordPress site's REST API.
            </p>
          </div>
        ),
      },
      {
        question: 'How do I get started?',
        answer: (
          <ol className="list-decimal pl-5 space-y-2">
            <li><strong>Create an account</strong> - Sign up with email or OAuth (GitHub/Google)</li>
            <li><strong>Add your WordPress connection</strong> - Enter your site URL, username, and Application Password</li>
            <li><strong>Generate an API key</strong> - Create an API key for your MCP client</li>
            <li><strong>Configure your MCP client</strong> - Add the MCP server URL and API key to Claude Desktop, Cursor, etc.</li>
          </ol>
        ),
      },
      {
        question: 'How do I configure Claude Desktop?',
        answer: (
          <div className="space-y-3">
            <p>Add this to your Claude Desktop configuration file:</p>
            <pre className="bg-black rounded-lg p-3 text-sm text-green-400 overflow-x-auto">
{`{
  "mcpServers": {
    "wordpress": {
      "url": "https://wordpress-nodeflow-mcp.node2flow.net/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_API_KEY"
      }
    }
  }
}`}
            </pre>
            <p className="text-sm text-n2f-text-muted">
              Replace <code className="bg-n2f-elevated px-1 rounded">YOUR_API_KEY</code> with your actual API key from the Connections page.
            </p>
          </div>
        ),
      },
    ],
  },
  {
    name: 'WordPress Connection',
    icon: <Code className="h-5 w-5" />,
    items: [
      {
        question: 'How do I get my WordPress Application Password?',
        answer: (
          <ol className="list-decimal pl-5 space-y-2">
            <li>Log in to your WordPress admin dashboard</li>
            <li>Go to <strong>Users &rarr; Profile</strong></li>
            <li>Scroll down to <strong>"Application Passwords"</strong></li>
            <li>Enter a name (e.g., "MCP") and click <strong>"Add New Application Password"</strong></li>
            <li>Copy the password and <strong>remove all spaces</strong> before using it</li>
          </ol>
        ),
      },
      {
        question: 'Why does WordPress show my Application Password with spaces?',
        answer: (
          <div className="space-y-2">
            <p>
              WordPress displays Application Passwords with spaces for readability (e.g., <code className="bg-n2f-elevated px-1 rounded">cUAn CKZ1 u5DN</code>).
              However, HTTP Basic Authentication does not support spaces.
            </p>
            <p>
              <strong className="text-n2f-text">Always remove all spaces</strong> before using the password.
              Example: <code className="bg-n2f-elevated px-1 rounded">cUAnCKZ1u5DN</code>
            </p>
          </div>
        ),
      },
      {
        question: 'What WordPress/WooCommerce features can I access via MCP?',
        answer: (
          <div className="space-y-2">
            <p>Our MCP server provides tools covering:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>WordPress</strong> - Posts, pages, media, categories, tags, comments, users, menus</li>
              <li><strong>WooCommerce</strong> - Products, orders, customers, coupons, shipping zones, tax rates</li>
              <li><strong>Media</strong> - Upload images via ImgBB integration</li>
              <li><strong>Settings</strong> - Site settings, WooCommerce settings</li>
            </ul>
          </div>
        ),
      },
      {
        question: 'Can I connect multiple WordPress sites?',
        answer: 'Yes! You can add multiple WordPress connections to your account. Each connection can have its own API keys for different MCP clients or purposes.',
      },
    ],
  },
  {
    name: 'API Keys & Authentication',
    icon: <Shield className="h-5 w-5" />,
    items: [
      {
        question: 'What is the difference between WordPress Application Passwords and service API keys?',
        answer: (
          <div className="space-y-2">
            <p>There are two types of credentials:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>WordPress Application Password</strong> - Generated in your WordPress admin panel.
                Used to authenticate our service with your WordPress site. Stored encrypted.
              </li>
              <li>
                <strong>Service API key (n2f_...)</strong> - Generated in our dashboard. Used to authenticate
                your MCP client with our service. Stored as a hash.
              </li>
            </ul>
          </div>
        ),
      },
      {
        question: 'I lost my API key. Can you recover it?',
        answer: 'No, we cannot recover API keys. For security, we only store a hash of the key, not the actual key. You\'ll need to generate a new API key and update your MCP client configuration.',
      },
      {
        question: 'What is two-factor authentication (2FA)?',
        answer: (
          <div className="space-y-2">
            <p>
              2FA adds an extra layer of security by requiring a time-based code from an authenticator app
              (like Google Authenticator or Authy) in addition to your password.
            </p>
            <p>
              When enabled, sensitive actions like deleting connections or revoking API keys will require a 2FA code.
            </p>
          </div>
        ),
      },
    ],
  },
  {
    name: 'Billing & Plans',
    icon: <CreditCard className="h-5 w-5" />,
    items: [
      {
        question: 'What are the plan limits?',
        answer: (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-n2f-border">
                  <th className="text-left py-2">Plan</th>
                  <th className="text-left py-2">Price</th>
                  <th className="text-left py-2">Daily Limit</th>
                  <th className="text-left py-2">Rate Limit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-n2f-border">
                <tr><td className="py-2">Free</td><td className="py-2">$0/mo</td><td className="py-2">100 req/day</td><td className="py-2">50 req/min</td></tr>
                <tr><td className="py-2">Pro</td><td className="py-2">$19/mo</td><td className="py-2">5,000 req/day</td><td className="py-2">100 req/min</td></tr>
                <tr><td className="py-2">Enterprise</td><td className="py-2">Custom</td><td className="py-2">Unlimited</td><td className="py-2">Custom</td></tr>
              </tbody>
            </table>
          </div>
        ),
      },
      {
        question: 'What happens if I exceed my daily limit?',
        answer: 'Once you reach your daily limit, API requests will return a 429 (Too Many Requests) error until the limit resets at midnight UTC. You can upgrade your plan anytime for higher limits.',
      },
      {
        question: 'Do you offer refunds?',
        answer: 'We do not offer refunds for partial months. However, you can cancel your subscription at any time, and you\'ll continue to have access until the end of your current billing period.',
      },
    ],
  },
  {
    name: 'Troubleshooting',
    icon: <AlertTriangle className="h-5 w-5" />,
    items: [
      {
        question: 'MCP client shows "connection refused" error',
        answer: (
          <div className="space-y-2">
            <p>Check the following:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Verify the MCP server URL is correct: <code className="bg-n2f-elevated px-1 rounded">https://wordpress-nodeflow-mcp.node2flow.net/mcp</code></li>
              <li>Ensure your API key starts with <code className="bg-n2f-elevated px-1 rounded">n2f_</code></li>
              <li>Check that the API key hasn't been revoked</li>
              <li>Make sure the Authorization header format is correct: <code className="bg-n2f-elevated px-1 rounded">Bearer n2f_...</code></li>
            </ul>
          </div>
        ),
      },
      {
        question: 'Getting 401 Unauthorized errors from WordPress',
        answer: (
          <div className="space-y-2">
            <p>This usually means:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>The Application Password has spaces - <strong>remove all spaces</strong></li>
              <li>The WordPress username is incorrect</li>
              <li>The Application Password was revoked in WordPress admin</li>
              <li>Your WordPress site requires HTTPS but the URL uses HTTP</li>
            </ul>
          </div>
        ),
      },
      {
        question: 'How do I report a bug?',
        answer: (
          <div className="space-y-2">
            <p>Contact our support team:</p>
            <p>
              <strong>Email:</strong>{' '}
              <a href="mailto:support@node2flow.net" className="text-n2f-accent hover:underline">support@node2flow.net</a>
            </p>
            <p>Please include: steps to reproduce, expected vs actual behavior, and any error messages.</p>
          </div>
        ),
      },
    ],
  },
];

function FAQAccordion({ item, isOpen, onToggle }: { item: FAQItem; isOpen: boolean; onToggle: () => void }) {
  return (
    <div className="border border-n2f-border rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-n2f-elevated transition-colors"
      >
        <span className="font-medium text-n2f-text pr-4">{item.question}</span>
        <ChevronDown className={`h-5 w-5 text-n2f-text-muted flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="px-4 pb-4 text-n2f-text-secondary">
          {typeof item.answer === 'string' ? <p>{item.answer}</p> : item.answer}
        </div>
      )}
    </div>
  );
}

export default function FAQ() {
  const [searchQuery, setSearchQuery] = useState('');
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());

  const toggleItem = (key: string) => {
    setOpenItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(key)) newSet.delete(key);
      else newSet.add(key);
      return newSet;
    });
  };

  const filteredCategories = faqData
    .map((category) => ({
      ...category,
      items: category.items.filter(
        (item) =>
          item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (typeof item.answer === 'string' && item.answer.toLowerCase().includes(searchQuery.toLowerCase()))
      ),
    }))
    .filter((category) => category.items.length > 0);

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
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-n2f-accent/10 rounded-full mb-4">
            <HelpCircle className="h-8 w-8 text-n2f-accent" />
          </div>
          <h1 className="text-3xl font-bold text-n2f-text mb-2">Frequently Asked Questions</h1>
          <p className="text-n2f-text-secondary max-w-xl mx-auto">
            Find answers to common questions about WordPress MCP. Can't find what you're looking for?{' '}
            <a href="mailto:support@node2flow.net" className="text-n2f-accent hover:underline">Contact support</a>.
          </p>
        </div>

        <div className="relative mb-8">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-n2f-text-muted" />
          <input
            type="text"
            placeholder="Search FAQs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-n2f-card border border-n2f-border rounded-lg text-n2f-text placeholder-n2f-text-muted focus:outline-none focus:ring-2 focus:ring-n2f-accent focus:border-transparent"
          />
        </div>

        {filteredCategories.length > 0 ? (
          <div className="space-y-8">
            {filteredCategories.map((category) => (
              <section key={category.name}>
                <div className="flex items-center gap-2 mb-4">
                  <div className="text-n2f-accent">{category.icon}</div>
                  <h2 className="text-xl font-semibold text-n2f-text">{category.name}</h2>
                </div>
                <div className="space-y-3">
                  {category.items.map((item, index) => {
                    const key = `${category.name}-${index}`;
                    return <FAQAccordion key={key} item={item} isOpen={openItems.has(key)} onToggle={() => toggleItem(key)} />;
                  })}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-n2f-text-secondary mb-4">No results found for "{searchQuery}"</p>
            <button onClick={() => setSearchQuery('')} className="text-n2f-accent hover:underline">Clear search</button>
          </div>
        )}

        <div className="mt-12 bg-n2f-card border border-n2f-border rounded-lg p-6 text-center">
          <h3 className="text-lg font-semibold text-n2f-text mb-2">Still have questions?</h3>
          <p className="text-n2f-text-secondary mb-4">We're here to help. Reach out to our support team.</p>
          <a
            href="mailto:support@node2flow.net"
            className="inline-flex items-center gap-2 bg-n2f-accent hover:bg-blue-600 text-white font-medium px-6 py-2 rounded-lg transition-colors"
          >
            Contact Support
          </a>
        </div>

        <div className="mt-12 pt-8 border-t border-n2f-border flex justify-between text-sm">
          <Link to="/terms" className="text-n2f-accent hover:underline">Terms of Service</Link>
          <Link to="/privacy" className="text-n2f-accent hover:underline">Privacy Policy</Link>
        </div>
      </main>
    </div>
  );
}
