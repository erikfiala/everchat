/** Community collapse: downvotes/(up+down) ≥ 0.67 and total ≥ 3 */
export const COLLAPSE_DOWNVOTE_RATIO = 0.67;
export const COLLAPSE_MIN_VOTES = 3;

export const MAX_BODY_LENGTH = 300;
/** Remaining-count warning zone (Twitter-style): red when length >= this. */
export const BODY_WARN_AT = 250;
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
export const USERNAME_RESERVATION_MINUTES = 15;
export const RATE_LIMIT_POSTS_PER_MINUTE = 10;
export const RATE_LIMIT_VOTES_PER_MINUTE = 60;
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
export const DESCRIPTION_TRUNCATE = 120;
export const TRENDING_LIMIT = 10;
export const EC_MSG_PREFIX = 'ec-msg-';

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
