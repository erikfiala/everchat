/** Community collapse: downvotes/(up+down) ≥ 0.67 and total ≥ 3 */
export const COLLAPSE_DOWNVOTE_RATIO = 0.67;
export const COLLAPSE_MIN_VOTES = 3;

export const MAX_BODY_LENGTH = 300;
/** Show remaining-count in red when fewer than this many characters remain. */
export const BODY_WARN_REMAINING = 50;
export const HANDLE_MIN = 3;
export const HANDLE_MAX = 20;
export const HANDLE_REGEX = /^[a-z0-9_]{3,20}$/;

export const RESERVED_HANDLES = new Set([
  'everchat',
  'admin',
  'mod',
  'moderator',
  'support',
  'system',
  'null',
  'undefined',
  'me',
  'root',
  'official',
  'help',
  'api',
  'staff',
]);

export const DEPTH_COLLAPSE_LEVEL = 3;
/** Short ceremony window; released on cancel/failure, else expires. */
export const USERNAME_RESERVATION_MINUTES = 5;
/** Mirrored in `public.check_rate_limit`; server is source of truth. */
export const RATE_LIMIT_POSTS_PER_MINUTE = 10;
export const RATE_LIMIT_VOTES_PER_MINUTE = 60;
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
export const DESCRIPTION_TRUNCATE = 120;
export const TRENDING_LIMIT = 10;
export const LIST_PAGE_SIZE = 20;
export const LEADERBOARD_LIMIT = 100;
export const EC_MSG_PREFIX = 'ec-msg-';
/** Public marketing origin used in share URLs (everch.at). */
export const WWW_ORIGIN = 'https://everch.at';

export const TRACKING_PARAM_DENYLIST = new Set([
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'utm_id',
  'utm_reader',
  'utm_name',
  'utm_social',
  'utm_social-type',
  'fbclid',
  'gclid',
  'gclsrc',
  'dclid',
  'msclkid',
  'twclid',
  'igshid',
  '_ga',
  '_gl',
  'mc_cid',
  'mc_eid',
  'ref',
  'ref_src',
  'wickedid',
  '_hsenc',
  '_hsmi',
  'mkt_tok',
  'si',
  'feature',
  'list',
]);
