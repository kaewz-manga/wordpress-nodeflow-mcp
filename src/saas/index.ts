/**
 * SaaS Module - Entry Point
 * Export all SaaS services
 */

// Types
export * from './types';

// API Keys
export {
  generateApiKey,
  hashApiKey,
  isValidApiKeyFormat,
  getApiKeyEnvironment,
  findApiKeyByKey,
  findApiKeyByHash,
  createApiKey,
  listApiKeys,
  revokeApiKey,
  deleteApiKey,
  updateApiKeyLastUsed,
} from './api-keys';

// Customers
export {
  hashPassword,
  verifyPassword,
  createCustomer,
  findCustomerByEmail,
  findCustomerById,
  authenticateCustomer,
  updateCustomer,
  findSubscriptionByCustomerId,
  updateSubscriptionTier,
  incrementUsage,
  resetMonthlyUsage,
  checkUsageLimit,
} from './customers';

// Rate Limiting
export {
  checkRateLimit,
  getRateLimitStatus,
  resetRateLimit,
  getRateLimitHeaders,
  createRateLimitExceededResponse,
} from './rate-limit';

// Usage Tracking
export {
  logUsage,
  getUsageStats,
  getUsageHistory,
  getRecentLogs,
  getToolUsageBreakdown,
  cleanupOldLogs,
} from './usage';

// Middleware
export {
  extractApiKey,
  authenticateRequest,
  isLegacyAuthRequest,
  addUsageHeaders,
  type AuthResult,
  type MiddlewareEnv,
} from './middleware';
