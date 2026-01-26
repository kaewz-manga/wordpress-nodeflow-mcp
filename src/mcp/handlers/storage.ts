/**
 * Storage Tools Handlers
 */

import { Env } from '../../index';
import { ImgBBClient } from '../../storage/imgbb';
import { MCPError, MCPErrorCodes } from '../../utils/errors';
import {
  validateRequiredString,
  validateOptionalString,
  validateNumber,
} from '../../utils/validation';

/**
 * Get ImgBB API key from request headers, arguments, or environment
 * Priority: Header > Arguments > Environment
 */
function getImgBBApiKey(request: Request, args: any, env: Env): string {
  // Check header first (multi-tenant mode)
  const headerApiKey = request.headers.get('x-imgbb-api-key');
  if (headerApiKey && headerApiKey.trim()) {
    return headerApiKey.trim();
  }

  // Check arguments
  const argsApiKey = validateOptionalString(args.apiKey, 'apiKey');
  if (argsApiKey) {
    return argsApiKey;
  }

  // Check environment variable (single-tenant mode)
  if (env.IMGBB_API_KEY && env.IMGBB_API_KEY.trim()) {
    return env.IMGBB_API_KEY.trim();
  }

  // No API key found
  throw new MCPError(
    MCPErrorCodes.NO_CREDENTIALS,
    'ImgBB API key required. Provide via: (1) header x-imgbb-api-key, (2) argument apiKey, or (3) env IMGBB_API_KEY'
  );
}

export async function handleUploadToImgBB(args: any, request: Request, env: Env) {
  const base64 = validateRequiredString(args.base64, 'base64');
  const apiKey = getImgBBApiKey(request, args, env);
  const name = validateOptionalString(args.name, 'name');
  const expiration = validateNumber(args.expiration, 'expiration');

  const client = new ImgBBClient(apiKey);

  const result = await client.uploadFromBase64({
    base64,
    name,
    expiration,
  });

  return {
    originalContentUrl: result.originalContentUrl,
    previewImageUrl: result.previewImageUrl,
    displayUrl: result.displayUrl,
    deleteUrl: result.deleteUrl,
  };
}
