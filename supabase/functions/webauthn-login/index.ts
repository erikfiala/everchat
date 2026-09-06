import {
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from 'npm:@simplewebauthn/server@11.0.0';
import {
  adminClient,
  b64urlToUint8,
  corsHeaders,
  isValidUsername,
  json,
  mintSession,
  normalizeUsername,
  rpConfig,
} from '../_shared/auth.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const action = body.action as string;
    const sb = adminClient();
    const { rpID, origin } = rpConfig();

    if (action === 'options') {
      const username = normalizeUsername(body.username || '');
      let allowCredentials: { id: string }[] | undefined;

      if (username) {
        if (!isValidUsername(username)) {
          return json({ error: 'Invalid username' }, 400);
        }
        const { data: profile } = await sb
          .from('profiles')
          .select('id')
          .eq('username', username)
          .maybeSingle();
        if (!profile) {
          return json({ error: 'Unknown handle' }, 404);
        }
        const { data: creds } = await sb
          .from('webauthn_credentials')
          .select('credential_id')
          .eq('user_id', profile.id);
        allowCredentials = (creds || []).map((c) => ({
          id: c.credential_id,
        }));
        if (!allowCredentials.length) {
          return json({ error: 'Unknown passkey' }, 404);
        }
      }

      const options = await generateAuthenticationOptions({
        rpID,
        userVerification: 'preferred',
        timeout: 120_000,
        ...(allowCredentials?.length ? { allowCredentials } : {}),
      });

      const challengeId = crypto.randomUUID();
      const { error: challengeError } = await sb.from('webauthn_challenges').upsert({
        id: challengeId,
        challenge: options.challenge,
        expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      });
      if (challengeError) {
        console.error('webauthn_challenges upsert failed', challengeError);
        return json({ error: 'Could not start passkey sign-in' }, 500);
      }

      return json({ options, challengeId });
    }

    if (action === 'verify') {
      const assertion = body.assertion;
      const challengeId = body.challengeId as string | undefined;

      // Find challenge - prefer explicit id, else match by challenge in assertion
      let challengeRow = null as {
        id: string;
        challenge: string;
        expires_at: string;
      } | null;

      if (challengeId) {
        const { data } = await sb
          .from('webauthn_challenges')
          .select('*')
          .eq('id', challengeId)
          .maybeSingle();
        challengeRow = data;
      }

      if (!challengeRow) {
        // Fallback: most recent unexpired
        const { data } = await sb
          .from('webauthn_challenges')
          .select('*')
          .gt('expires_at', new Date().toISOString())
          .order('expires_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        challengeRow = data;
      }

      if (!challengeRow) {
        return json({ error: 'Challenge expired' }, 400);
      }

      const credId =
        typeof assertion.id === 'string'
          ? assertion.id
          : assertion.rawId;

      const { data: cred } = await sb
        .from('webauthn_credentials')
        .select('*, profiles(*)')
        .eq('credential_id', credId)
        .maybeSingle();

      if (!cred) {
        return json({ error: 'Unknown passkey' }, 404);
      }

      // Match options userVerification: 'preferred' (library default require=true
      // would reject UV-unset assertions with the browser-identical error string).
      const verification = await verifyAuthenticationResponse({
        response: assertion,
        expectedChallenge: challengeRow.challenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
        credential: {
          id: cred.credential_id,
          publicKey: b64urlToUint8(cred.public_key),
          counter: Number(cred.sign_count),
          transports: cred.transports ?? undefined,
        },
        requireUserVerification: false,
      });

      if (!verification.verified) {
        return json({ error: 'Assertion failed' }, 400);
      }

      await sb
        .from('webauthn_credentials')
        .update({
          sign_count: verification.authenticationInfo.newCounter,
          last_used_at: new Date().toISOString(),
        })
        .eq('id', cred.id);

      await sb.from('webauthn_challenges').delete().eq('id', challengeRow.id);

      const profile = Array.isArray(cred.profiles)
        ? cred.profiles[0]
        : cred.profiles;
      if (!profile?.id || !profile?.username) {
        return json({ error: 'Profile missing for passkey' }, 500);
      }
      const session = await mintSession(profile);
      return json(session);
    }

    return json({ error: 'Unknown action' }, 400);
  } catch (e) {
    console.error(e);
    return json({ error: (e as Error).message || 'Login failed' }, 500);
  }
});
