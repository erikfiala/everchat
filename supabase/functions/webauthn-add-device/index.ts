import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
} from 'npm:@simplewebauthn/server@11.0.0';
import {
  adminClient,
  corsHeaders,
  json,
  rpConfig,
  toBase64Url,
  verifySessionToken,
} from '../_shared/auth.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const userId = await verifySessionToken(req.headers.get('Authorization'));
    if (!userId) return json({ error: 'Unauthorized' }, 401);

    const body = await req.json();
    const action = body.action as string;
    const sb = adminClient();
    const { rpID, rpName, origin } = rpConfig();

    const { data: profile } = await sb
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (!profile) return json({ error: 'User not found' }, 404);

    if (action === 'options') {
      const { data: existing } = await sb
        .from('webauthn_credentials')
        .select('credential_id')
        .eq('user_id', userId);

      const options = await generateRegistrationOptions({
        rpName,
        rpID,
        userName: profile.username,
        userID: new TextEncoder().encode(userId),
        userDisplayName: `@${profile.username}`,
        attestationType: 'none',
        excludeCredentials: (existing || []).map((c) => ({
          id: c.credential_id,
        })),
        authenticatorSelection: {
          residentKey: 'preferred',
          userVerification: 'preferred',
        },
      });

      const challengeId = crypto.randomUUID();
      const { error: challengeError } = await sb.from('webauthn_challenges').upsert({
        id: challengeId,
        challenge: options.challenge,
        user_id: userId,
        username: profile.username,
        expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      });
      if (challengeError) {
        console.error('webauthn_challenges upsert failed', challengeError);
        return json({ error: 'Could not start passkey setup' }, 500);
      }

      return json({ options, challengeId });
    }

    if (action === 'verify') {
      const challengeId = body.challengeId as string;
      const attestation = body.attestation;
      const rawLabel =
        typeof body.deviceLabel === 'string' ? body.deviceLabel.trim() : '';
      const deviceLabel = rawLabel.slice(0, 64) || 'Chrome';

      const { data: challengeRow } = await sb
        .from('webauthn_challenges')
        .select('*')
        .eq('id', challengeId)
        .eq('user_id', userId)
        .maybeSingle();

      if (!challengeRow) {
        return json({ error: 'Challenge expired' }, 400);
      }

      // Match options userVerification: 'preferred' — do not enforce UV flag.
      const verification = await verifyRegistrationResponse({
        response: attestation,
        expectedChallenge: challengeRow.challenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
        requireUserVerification: false,
      });

      if (!verification.verified || !verification.registrationInfo) {
        return json({ error: 'Verification failed' }, 400);
      }

      const { credential } = verification.registrationInfo;

      await sb.from('webauthn_credentials').insert({
        user_id: userId,
        credential_id:
          typeof credential.id === 'string'
            ? credential.id
            : toBase64Url(credential.id),
        public_key: toBase64Url(credential.publicKey),
        sign_count: credential.counter,
        transports: attestation.response?.transports ?? null,
        device_label: deviceLabel,
      });

      await sb.from('webauthn_challenges').delete().eq('id', challengeId);
      return json({ ok: true });
    }

    return json({ error: 'Unknown action' }, 400);
  } catch (e) {
    console.error(e);
    return json({ error: (e as Error).message || 'Add device failed' }, 500);
  }
});
