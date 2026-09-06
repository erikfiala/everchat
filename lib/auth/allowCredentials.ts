/** Side-panel get() with an empty allow-list never shows OS UI and times out. */
export function allowCredentialsForLogin(
  fromServer: { id: string }[] | undefined,
  storedIds: string[],
): { id: string; type: 'public-key' }[] {
  if (fromServer?.length) {
    return fromServer.map((c) => ({ id: c.id, type: 'public-key' as const }));
  }
  return storedIds.map((id) => ({ id, type: 'public-key' as const }));
}
