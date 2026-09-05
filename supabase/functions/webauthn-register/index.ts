import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
} from 'npm:@simplewebauthn/server@11.0.0';
import {
  adminClient,
  corsHeaders,
  isValidUsername,
  json,
  mintSession,
  normalizeUsername,
  rpConfig,
  toBase64Url,
} from '../_shared/auth.ts';

const RESERVATION_MS = 5 * 60 * 1000;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const action = body.action as string;
    const sb = adminClient();
    const { rpID, rpName, origin } = rpConfig();

    if (action === 'check') {
      const username = normalizeUsername(body.username || '');
      if (!isValidUsername(username)) {
        return json({ available: false });
      }
      const sessionToken =
        typeof body.sessionToken === 'string' ? body.sessionToken : null;
      const { data } = await sb.rpc('check_username_available', {
        p_username: username,
        p_session_token: sessionToken,
      });
      return json({ available: Boolean(data) });
    }

    if (action === 'release') {
      const username = normalizeUsername(body.username || '');
      const sessionToken = body.sessionToken as string;
      if (!username || !sessionToken) {
        return json({ error: 'Missing username or session' }, 400);
      }
      await sb.rpc('release_username', {
        p_username: username,
        p_session_token: sessionToken,
      });
      await sb.from('webauthn_challenges').delete().eq('id', sessionToken);
      return json({ ok: true });
    }

    if (action === 'options') {
      const username = normalizeUsername(body.username || '');
      if (!isValidUsername(username)) {
        return json({ error: 'Invalid username' }, 400);
      }

      // Profiles permanently claim handles. Active reservations from a prior
      // failed ceremony are overwritten by reserve_username so retries work.
      const { data: existing } = await sb
        .from('profiles')
        .select('id')
        .eq('username', username)
        .maybeSingle();
      if (existing) {
        return json({ error: 'Username taken' }, 409);
      }

      const sessionToken = crypto.randomUUID();
      const { data: reserved } = await sb.rpc('reserve_username', {
        p_username: username,
        p_session_token: sessionToken,
      });
      if (!reserved) {
        return json({ error: 'Username taken' }, 409);
      }

      const userId = crypto.randomUUID();
      const options = await generateRegistrationOptions({
        rpName,
        rpID,
        userName: username,
        userID: new TextEncoder().encode(userId),
        userDisplayName: `@${username}`,
        attestationType: 'none',
        authenticatorSelection: {
          residentKey: 'preferred',
          userVerification: 'preferred',
        },
      });

      await sb.from('webauthn_challenges').upsert({
        id: sessionToken,
        challenge: options.challenge,
        username,
        user_id: userId,
        expires_at: new Date(Date.now() + RESERVATION_MS).toISOString(),
      });

      return json({ options, sessionToken, userId });
    }

    if (action === 'verify') {
      const username = normalizeUsername(body.username || '');
      const sessionToken = body.sessionToken as string;
      const attestation = body.attestation;

      const { data: challengeRow } = await sb
        .from('webauthn_challenges')
        .select('*')
        .eq('id', sessionToken)
        .maybeSingle();

      if (!challengeRow || new Date(challengeRow.expires_at) < new Date()) {
        return json({ error: 'Ceremony expired' }, 400);
      }

      const { data: reservation } = await sb
        .from('username_reservations')
        .select('*')
        .eq('username', username)
        .eq('session_token', sessionToken)
        .maybeSingle();

      if (!reservation || new Date(reservation.reserved_until) < new Date()) {
        return json({ error: 'Username reservation expired' }, 400);
      }

      const verification = await verifyRegistrationResponse({
        response: attestation,
        expectedChallenge: challengeRow.challenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
      });

      if (!verification.verified || !verification.registrationInfo) {
        return json({ error: 'Passkey verification failed' }, 400);
      }

      const { credential } = verification.registrationInfo;
      const userId = challengeRow.user_id as string;

      const { error: profileError } = await sb.from('profiles').insert({
        id: userId,
        username,
      });
      if (profileError) {
        return json({ error: profileError.message }, 400);
      }

      const credentialId =
        typeof credential.id === 'string'
          ? credential.id
          : toBase64Url(credential.id);
      const publicKey = toBase64Url(credential.publicKey);

      await sb.from('webauthn_credentials').insert({
        user_id: userId,
        credential_id: credentialId,
        public_key: publicKey,
        sign_count: credential.counter,
        transports: attestation.response?.transports ?? null,
        device_label: 'Primary device',
      });

      await sb.from('username_reservations').delete().eq('username', username);
      await sb.from('webauthn_challenges').delete().eq('id', sessionToken);

      const { data: profile } = await sb
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      const session = await mintSession(profile);
      return json(session);
    }

    return json({ error: 'Unknown action' }, 400);
  } catch (e) {
    console.error(e);
    return json({ error: (e as Error).message || 'Register failed' }, 500);
  }
});
