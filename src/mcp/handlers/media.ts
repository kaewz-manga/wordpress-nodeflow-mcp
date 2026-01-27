/**
 * WordPress Media Tool Handlers
 */

import { WordPressClient } from '../../wordpress/client';
import { MCPError, MCPErrorCodes } from '../../utils/errors';
import {
  validateRequiredString,
  validateOptionalString,
  validateNumber,
  validateRequiredNumber,
} from '../../utils/validation';

// Type definitions for handler arguments
interface GetMediaArgs {
  per_page?: number;
  page?: number;
  media_type?: string;
}

interface GetMediaItemArgs {
  id: number;
}

interface UploadMediaFromUrlArgs {
  url: string;
  title?: string;
  alt_text?: string;
  caption?: string;
}

interface UploadMediaFromBase64Args {
  base64: string;
  fileName: string;
  mimeType: string;
  title?: string;
  alt_text?: string;
  caption?: string;
}

const MEDIA_TYPES = ['image', 'video', 'audio', 'application'] as const;

export async function handleGetMedia(args: GetMediaArgs, client: WordPressClient) {
  const per_page = validateNumber(args.per_page, 'per_page') || 10;
  const page = validateNumber(args.page, 'page') || 1;
  const media_type = validateOptionalString(args.media_type, 'media_type');

  // Validate media_type if provided
  if (media_type && !MEDIA_TYPES.includes(media_type as typeof MEDIA_TYPES[number])) {
    throw new MCPError(
      MCPErrorCodes.VALIDATION_ERROR,
      `Invalid media_type. Must be one of: ${MEDIA_TYPES.join(', ')}`
    );
  }

  const media = await client.getMedia({
    per_page,
    page,
    media_type,
  });

  return {
    count: media.length,
    media: media.map((item) => ({
      id: item.id,
      title: item.title.rendered,
      link: item.link,
      source_url: item.source_url,
      media_type: item.media_type,
      mime_type: item.mime_type,
      alt_text: item.alt_text,
    })),
  };
}

export async function handleGetMediaItem(args: GetMediaItemArgs, client: WordPressClient) {
  const id = validateRequiredNumber(args.id, 'id');
  const media = await client.getMediaItem(id);

  return {
    id: media.id,
    title: media.title.rendered,
    link: media.link,
    source_url: media.source_url,
    media_type: media.media_type,
    mime_type: media.mime_type,
    alt_text: media.alt_text,
    caption: media.caption.rendered,
    media_details: media.media_details,
  };
}

export async function handleUploadMediaFromUrl(args: UploadMediaFromUrlArgs, client: WordPressClient) {
  const url = validateRequiredString(args.url, 'url');
  const title = validateOptionalString(args.title, 'title');
  const alt_text = validateOptionalString(args.alt_text, 'alt_text');
  const caption = validateOptionalString(args.caption, 'caption');

  const media = await client.uploadMediaFromUrl({
    url,
    title,
    alt_text,
    caption,
  });

  return {
    id: media.id,
    title: media.title.rendered,
    link: media.link,
    source_url: media.source_url,
    media_type: media.media_type,
    mime_type: media.mime_type,
  };
}

export async function handleUploadMediaFromBase64(args: UploadMediaFromBase64Args, client: WordPressClient) {
  const base64 = validateRequiredString(args.base64, 'base64');
  const fileName = validateRequiredString(args.fileName, 'fileName');
  const mimeType = validateRequiredString(args.mimeType, 'mimeType');
  const title = validateOptionalString(args.title, 'title');
  const alt_text = validateOptionalString(args.alt_text, 'alt_text');
  const caption = validateOptionalString(args.caption, 'caption');

  const media = await client.uploadMediaFromBase64({
    base64,
    fileName,
    mimeType,
    title,
    alt_text,
    caption,
  });

  return {
    id: media.id,
    title: media.title.rendered,
    link: media.link,
    source_url: media.source_url,
    media_type: media.media_type,
    mime_type: media.mime_type,
  };
}
