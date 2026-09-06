import { useEffect, useRef, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Camera, Plus, Trash2 } from 'lucide-react';
import { Favicon } from '@/components/Favicon';
import { AuthLanding } from '@/components/auth/AuthLanding';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { useLocale } from '@/hooks/useLocale';
import {
  fetchActivity,
  listDevices,
  revokeDevice,
  uploadAvatar,
} from '@/lib/profile';
import { addPasskeyDevice } from '@/lib/auth/webauthn';
import type { ActivityItem } from '@/lib/database.types';
import { formatScore, scoreColorClass } from '@/lib/collapse';
import { buildDeepLink, httpsUrlFromCanonical } from '@/lib/canonicalize';
import { DESCRIPTION_TRUNCATE } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export function ProfileTab() {
  const { t, tError } = useLocale();
  const { user, loading: authLoading, logout, patchUser, refreshProfile } =
    useAuth();
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [devices, setDevices] = useState<
    { id: string; device_label: string | null; created_at: string; last_used_at: string | null }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    Promise.all([fetchActivity(user.id), listDevices(user.id), refreshProfile()])
      .then(([acts, devs]) => {
        setActivity(acts);
        setDevices(devs);
      })
      .catch((e) => toast.error(tError(e)))
      .finally(() => setLoading(false));
  }, [user?.id]);

  if (authLoading) {
    return (
      <div className="p-3">
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (!user) return <AuthLanding />;

  const onAvatar = async (file: File | null) => {
    if (!file) return;
    try {
      const url = await uploadAvatar(user.id, file);
      await patchUser({ avatar_url: url });
      toast.success(t('profile.toastAvatarUpdated'));
    } catch (e) {
      toast.error(tError(e));
    }
  };

  const openActivity = async (item: ActivityItem) => {
    if (!item.page) return;
    const base = httpsUrlFromCanonical(item.page.canonical_url);
    const url = buildDeepLink(base, item.id);
    const tab = await browser.tabs.create({ url });
    if (tab.id != null) {
      await browser.runtime.sendMessage({
        type: 'OPEN_PANEL_FOR_TAB',
        tabId: tab.id,
        focusMessageId: item.id,
      });
    }
  };

  const addDevice = async () => {
    try {
      await addPasskeyDevice(user.token);
      const devs = await listDevices(user.id);
      setDevices(devs);
      toast.success(t('profile.toastDeviceAdded'));
    } catch (e) {
      toast.error(tError(e, 'profile.toastAddDeviceFailed'));
    }
  };

  const removeDevice = async (id: string) => {
    try {
      await revokeDevice(id, user.id);
      setDevices((d) => d.filter((x) => x.id !== id));
      toast.success(t('profile.toastDeviceRemoved'));
    } catch (e) {
      toast.error(tError(e));
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto">
      <div className="border-b border-[var(--color-border)] px-4 py-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="relative"
            onClick={() => fileRef.current?.click()}
          >
            <Avatar className="h-14 w-14">
              {user.avatar_url && <AvatarImage src={user.avatar_url} />}
              <AvatarFallback className="text-base">
                {user.username.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="absolute bottom-0 end-0 rounded-full bg-[var(--color-card)] p-1 shadow">
              <Camera className="h-3 w-3" />
            </span>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => onAvatar(e.target.files?.[0] ?? null)}
          />
          <div>
            <div className="text-lg font-semibold">@{user.username}</div>
            <div className={cn('text-sm font-medium', scoreColorClass(user.karma))}>
              {t('profile.karma', { score: formatScore(user.karma) })}
            </div>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="mt-3"
          onClick={() => logout()}
        >
          {t('profile.signOut')}
        </Button>
      </div>

      <section className="border-b border-[var(--color-border)] px-4 py-3">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">
            {t('profile.devices')}
          </h2>
          <Button variant="ghost" size="sm" className="h-7 gap-1" onClick={addDevice}>
            <Plus className="h-3.5 w-3.5" />
            {t('profile.addDevice')}
          </Button>
        </div>
        <p className="mb-2 text-[11px] text-[var(--color-muted-foreground)]">
          {t('profile.devicesHint')}
        </p>
        <ul className="space-y-1">
          {devices.map((d) => (
            <li
              key={d.id}
              className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-[var(--color-accent)]"
            >
              <span>{d.device_label || t('common.device')}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => removeDevice(d.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      </section>

      <section className="px-2 py-3">
        <h2 className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">
          {t('profile.activity')}
        </h2>
        {loading && <Skeleton className="mx-2 h-16" />}
        {!loading && activity.length === 0 && (
          <p className="px-2 py-6 text-center text-sm text-[var(--color-muted-foreground)]">
            {t('profile.emptyActivity')}
          </p>
        )}
        {activity.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => openActivity(item)}
            className="flex w-full items-start gap-2 rounded-md px-2 py-2 text-start hover:bg-[var(--color-accent)]"
          >
            <Favicon src={item.page?.favicon_url} className="mt-0.5" />
            <div className="min-w-0 flex-1 overflow-hidden">
              <div className="flex min-w-0 items-center gap-2">
                <span className="min-w-0 truncate text-sm font-medium">
                  {item.page?.title || item.page?.canonical_url}
                </span>
                <span className="shrink-0 rounded bg-[var(--color-muted)] px-1.5 py-0.5 text-[10px] font-medium uppercase">
                  {item.parent_id
                    ? t('profile.activityReply')
                    : t('profile.activityPost')}
                </span>
              </div>
              <div className="truncate text-xs text-[var(--color-muted-foreground)]">
                {(
                  item.page?.description ||
                  item.page?.canonical_url ||
                  ''
                ).slice(0, DESCRIPTION_TRUNCATE)}
              </div>
              <div className="mt-0.5 truncate text-xs">
                {item.gif_url && !item.body
                  ? t('profile.gifPlaceholder')
                  : item.body}
              </div>
              <div className="mt-0.5 flex gap-2 text-[11px] text-[var(--color-muted-foreground)]">
                <span
                  className={cn('font-medium', scoreColorClass(item.score))}
                >
                  {formatScore(item.score)}
                </span>
                <span>
                  {formatDistanceToNow(new Date(item.created_at), {
                    addSuffix: true,
                  })}
                </span>
              </div>
            </div>
          </button>
        ))}
      </section>
    </div>
  );
}
