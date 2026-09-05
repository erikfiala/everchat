import {
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from 'npm:@simplewebauthn/server@11.0.0';
import {
  adminClient,
  b64urlToUint8,
  corsHeaders,
  json,
  mintSession,
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
      const options = await generateAuthenticationOptions({
        rpID,
        userVerification: 'preferred',
      });

      const challengeId = crypto.randomUUID();
      await sb.from('webauthn_challenges').upsert({
        id: challengeId,
        challenge: options.challenge,
        expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      });

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

      const profile = cred.profiles;
      const session = await mintSession(profile);
      return json(session);
    }

    return json({ error: 'Unknown action' }, 400);
  } catch (e) {
    console.error(e);
    return json({ error: (e as Error).message || 'Login failed' }, 500);
  }
});
