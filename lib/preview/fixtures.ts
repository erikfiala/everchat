import type {
  MessageWithAuthor,
  SessionUser,
  TabInfo,
  WebAuthnCredential,
} from '@/lib/database.types';
import type { ExplorePageRow } from '@/lib/pages';

const PAGE_ID = 'preview-page';
const NOW = Date.parse('2026-09-09T01:00:00.000Z');

export const PREVIEW_TAB: TabInfo = {
  tabId: 1,
  url: 'https://news.example/story/the-page-youre-on',
  title: 'Say what you think without leaving the page',
  favIconUrl: null,
  canonicalUrl: 'https://news.example/story/the-page-youre-on',
  focusMessageId: null,
  host: 'news.example',
};

export const PREVIEW_USER: SessionUser = {
  id: 'preview-you',
  username: 'you',
  avatar_url: null,
  about: 'Preview account',
  website: null,
  karma: 42,
  token: 'preview',
  expiresAt: NOW + 86_400_000,
};

const mira = {
  id: 'preview-mira',
  username: 'mira',
  avatar_url: null,
  karma: 128,
};
const kai = {
  id: 'preview-kai',
  username: 'kai',
  avatar_url: null,
  karma: 64,
};
const nova = {
  id: 'preview-nova',
  username: 'nova',
  avatar_url: null,
  karma: 96,
};

function msg(
  id: string,
  author: typeof mira,
  body: string,
  minsAgo: number,
  parentId: string | null = null,
  score = 4,
): MessageWithAuthor {
  return {
    id,
    page_id: PAGE_ID,
    author_id: author.id,
    parent_id: parentId,
    body,
    gif_url: null,
    score,
    upvotes: score,
    downvotes: 0,
    deleted_at: null,
    created_at: new Date(NOW - minsAgo * 60_000).toISOString(),
    author,
  };
}

export const PREVIEW_MESSAGES: MessageWithAuthor[] = [
  msg(
    'preview-m1',
    mira,
    'Finally, talk about the page without leaving it.',
    8,
    null,
    12,
  ),
  msg(
    'preview-m2',
    kai,
    'Same URL, same room. Tracking params stripped.',
    5,
    'preview-m1',
    6,
  ),
  msg(
    'preview-m3',
    nova,
    'No email. Passkeys when you want to speak.',
    1,
    null,
    9,
  ),
];

export const PREVIEW_CREDENTIAL_ID = 'preview-credential';

export const PREVIEW_DEVICES: Pick<
  WebAuthnCredential,
  'id' | 'credential_id' | 'device_label' | 'created_at' | 'last_used_at'
>[] = [
  {
    id: 'preview-device-1',
    credential_id: PREVIEW_CREDENTIAL_ID,
    device_label: 'Chrome on macOS',
    created_at: new Date(NOW - 7 * 86_400_000).toISOString(),
    last_used_at: new Date(NOW).toISOString(),
  },
];

export const PREVIEW_EXPLORE: ExplorePageRow[] = [
  {
    id: PAGE_ID,
    canonical_url: PREVIEW_TAB.canonicalUrl!,
    url: PREVIEW_TAB.url,
    title: PREVIEW_TAB.title,
    description: 'Every URL deserves a conversation.',
    favicon_url: null,
    message_count: 3,
    post_count: 2,
    last_active_at: new Date(NOW).toISOString(),
    online_count: 4,
  },
];
