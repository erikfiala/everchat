import { getSupabase } from './supabase';
import { RATE_LIMIT_VOTES_PER_MINUTE } from './constants';

/**
 * Toggle vote: same value clears; opposite flips; none inserts.
 */
export async function setVote(input: {
  messageId: string;
  userId: string;
  value: 1 | -1;
}): Promise<'cleared' | 'set'> {
  const sb = getSupabase();

  const { data: allowed, error: rlError } = await sb.rpc('check_rate_limit', {
    p_user_id: input.userId,
    p_action: 'vote',
    p_limit: RATE_LIMIT_VOTES_PER_MINUTE,
  });
  if (rlError) throw rlError;
  if (allowed === false) {
    throw new Error('Slow down. Vote rate limit reached.');
  }

  const { data: existing } = await sb
    .from('votes')
    .select('*')
    .eq('message_id', input.messageId)
    .eq('user_id', input.userId)
    .maybeSingle();

  if (existing && existing.value === input.value) {
    const { error } = await sb
      .from('votes')
      .delete()
      .eq('message_id', input.messageId)
      .eq('user_id', input.userId);
    if (error) throw error;
    return 'cleared';
  }

  const { error } = await sb.from('votes').upsert({
    message_id: input.messageId,
    user_id: input.userId,
    value: input.value,
  });
  if (error) throw error;
  return 'set';
}
