import { useEffect, useRef, useState } from 'react';
import { Camera, LogOut, PenSquare, Trash2 } from 'lucide-react';
import { Favicon } from '@/components/Favicon';
import { AuthLanding } from '@/components/auth/AuthLanding';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useAuth } from '@/hooks/useAuth';
import { useLocale } from '@/hooks/useLocale';
import {
  DEVICE_LABEL_MAX_LEN,
  fetchActivity,
  listDevices,
  renameDevice,
  revokeDevice,
  uploadAvatar,
} from '@/lib/profile';
import { getStoredCredentialIds } from '@/lib/auth/passkeyHint';
import { addPasskeyDevice } from '@/lib/auth/webauthn';
import { displayDeviceLabel, guessDeviceLabel } from '@/lib/deviceLabel';
import type { ActivityItem } from '@/lib/database.types';
import { formatScore, scoreColorClass, safeRelativeTime } from '@/lib/collapse';
import { bindRelativeTime } from '@/lib/time';
import { buildDeepLink, httpsUrlFromCanonical } from '@/lib/canonicalize';
import { DESCRIPTION_TRUNCATE } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export function ProfileTab() {
  const { t, tError, locale } = useLocale();
  const formatTime = bindRelativeTime(locale, t('time.lessThanMinute'));
  const { user, loading: authLoading, logout, patchUser, refreshProfile } =
    useAuth();
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [devices, setDevices] = useState<
    {
      id: string;
      credential_id: string;
      device_label: string | null;
      created_at: string;
      last_used_at: string | null;
    }[]
  >([]);
  const [localCredentialIds, setLocalCredentialIds] = useState<string[]>([]);
  const [guessedLabel, setGuessedLabel] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmSignOutOpen, setConfirmSignOutOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void guessDeviceLabel().then(setGuessedLabel);
  }, []);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    Promise.all([
      fetchActivity(user.id),
      listDevices(user.id),
      getStoredCredentialIds(),
      refreshProfile(),
    ])
      .then(([acts, devs, ids]) => {
        setActivity(acts);
        setDevices(devs);
        setLocalCredentialIds(ids);
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
      const [devs, ids] = await Promise.all([
        listDevices(user.id),
        getStoredCredentialIds(),
      ]);
      setDevices(devs);
      setLocalCredentialIds(ids);
      toast.success(t('profile.toastDeviceAdded'));
    } catch (e) {
      toast.error(tError(e, 'profile.toastAddDeviceFailed'));
    }
  };

  const currentDeviceRegistered = devices.some((d) =>
    localCredentialIds.includes(d.credential_id),
  );
  const firstDevice = devices[0];

  const removeDevice = async (id: string) => {
    try {
      await revokeDevice(id, user.id);
      setDevices((d) => d.filter((x) => x.id !== id));
      toast.success(t('profile.toastDeviceRemoved'));
    } catch (e) {
      toast.error(tError(e));
    }
  };

  const saveDeviceName = async (id: string, label: string) => {
    try {
      const device_label = await renameDevice(id, user.id, label);
      setDevices((d) =>
        d.map((x) => (x.id === id ? { ...x, device_label } : x)),
      );
      toast.success(t('profile.toastDeviceRenamed'));
    } catch (e) {
      toast.error(tError(e, 'profile.toastRenameFailed'));
      throw e;
    }
  };

  return (
    <TooltipProvider delayDuration={200}>
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
                {(user.username || '?').slice(0, 2).toUpperCase()}
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
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 truncate text-lg font-semibold">
                @{user.username || t('message.unknownAuthor')}
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    onClick={() => setConfirmSignOutOpen(true)}
                    aria-label={t('profile.signOut')}
                  >
                    <LogOut className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t('profile.signOut')}</TooltipContent>
              </Tooltip>
            </div>
            <div
              className={cn(
                'text-sm font-normal',
                scoreColorClass(user.karma ?? 0),
              )}
            >
              {t('profile.karma', { score: formatScore(user.karma ?? 0) })}
            </div>
          </div>
        </div>
      </div>

      <section className="border-b border-[var(--color-border)] px-4 py-3">
        <h2 className="mb-2 text-xs font-semibold text-[var(--color-muted-foreground)]">
          {t('profile.devices')}
        </h2>
        <p className="mb-2 text-sm text-[var(--color-muted-foreground)]">
          {t('profile.devicesHint')}
        </p>
        <ul className="space-y-1">
          {firstDevice && (
            <DeviceRow
              label={displayDeviceLabel(firstDevice.device_label, {
                isCurrent: localCredentialIds.includes(
                  firstDevice.credential_id,
                ),
                guessed: guessedLabel,
                fallback: t('common.device'),
              })}
              renameLabel={t('profile.renameDevice')}
              isLastDevice={devices.length === 1}
              onRename={(name) => saveDeviceName(firstDevice.id, name)}
              onRemove={() => removeDevice(firstDevice.id)}
            />
          )}
          <AddCurrentDeviceRow
            disabled={loading || currentDeviceRegistered}
            onAdd={addDevice}
          />
          {devices.slice(1).map((d) => (
            <DeviceRow
              key={d.id}
              label={displayDeviceLabel(d.device_label, {
                isCurrent: localCredentialIds.includes(d.credential_id),
                guessed: guessedLabel,
                fallback: t('common.device'),
              })}
              renameLabel={t('profile.renameDevice')}
              isLastDevice={false}
              onRename={(name) => saveDeviceName(d.id, name)}
              onRemove={() => removeDevice(d.id)}
            />
          ))}
        </ul>
      </section>

      <section className="px-2 py-3">
        <h2 className="mb-2 px-2 text-xs font-semibold text-[var(--color-muted-foreground)]">
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
                  {safeRelativeTime(item.created_at, formatTime)}
                </span>
              </div>
            </div>
          </button>
        ))}
      </section>

      <Dialog open={confirmSignOutOpen} onOpenChange={setConfirmSignOutOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('profile.signOutConfirmTitle')}</DialogTitle>
            <DialogDescription>
              {t('profile.signOutConfirmBody')}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setConfirmSignOutOpen(false)}
            >
              {t('common.cancel')}
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                setConfirmSignOutOpen(false);
                logout();
              }}
            >
              {t('profile.signOut')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </TooltipProvider>
  );
}

function AddCurrentDeviceRow({
  disabled,
  onAdd,
}: {
  disabled?: boolean;
  onAdd: () => void;
}) {
  const { t } = useLocale();
  const button = (
    <Button
      type="button"
      variant="ghost"
      disabled={disabled}
      aria-disabled={disabled}
      onClick={disabled ? undefined : onAdd}
      className="h-auto min-h-7 w-full justify-center py-1.5 text-sm font-medium text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
    >
      {t('profile.addCurrentDevice')}
    </Button>
  );

  return (
    <li className="min-h-7 w-full text-center">
      {disabled ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="block w-full">{button}</span>
          </TooltipTrigger>
          <TooltipContent>
            {t('profile.addCurrentDeviceAlreadyAdded')}
          </TooltipContent>
        </Tooltip>
      ) : (
        button
      )}
    </li>
  );
}

function DeviceRow({
  label,
  renameLabel,
  isLastDevice,
  onRename,
  onRemove,
}: {
  label: string;
  renameLabel: string;
  isLastDevice: boolean;
  onRename: (name: string) => Promise<void>;
  onRemove: () => void;
}) {
  const { t } = useLocale();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(label);
  const [saving, setSaving] = useState(false);
  const [confirmRemoveOpen, setConfirmRemoveOpen] = useState(false);
  const skipBlur = useRef(false);
  const inFlight = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editing) return;
    const el = inputRef.current;
    if (!el) return;
    el.focus();
    el.select();
  }, [editing]);

  const startEdit = () => {
    skipBlur.current = false;
    setDraft(label);
    setEditing(true);
  };

  const cancel = () => {
    skipBlur.current = true;
    setDraft(label);
    setEditing(false);
  };

  const commit = async () => {
    if (inFlight.current) return;
    const next = draft.trim();
    if (!next || next === label) {
      setDraft(label);
      setEditing(false);
      return;
    }
    inFlight.current = true;
    setSaving(true);
    try {
      await onRename(next);
      setEditing(false);
    } catch {
      /* parent toasts */
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  };

  return (
    <li className="flex items-center gap-1 rounded-md py-1.5 ps-3 pe-2 text-sm hover:bg-[var(--color-accent)]">
      {editing ? (
        <Input
          ref={inputRef}
          value={draft}
          maxLength={DEVICE_LABEL_MAX_LEN}
          disabled={saving}
          aria-label={renameLabel}
          className="h-7 min-w-0 flex-1 px-2"
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            if (skipBlur.current) {
              skipBlur.current = false;
              return;
            }
            void commit();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              void commit();
            } else if (e.key === 'Escape') {
              e.preventDefault();
              cancel();
            }
          }}
        />
      ) : (
        <span className="min-w-0 flex-1 truncate">{label}</span>
      )}
      <div className="flex shrink-0 items-center">
        {!editing && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                onClick={startEdit}
                aria-label={t('profile.rename')}
              >
                <PenSquare className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('profile.rename')}</TooltipContent>
          </Tooltip>
        )}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0 text-[var(--color-destructive)]"
              onClick={() => setConfirmRemoveOpen(true)}
              aria-label={t('profile.delete')}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('profile.delete')}</TooltipContent>
        </Tooltip>
      </div>
      <Dialog open={confirmRemoveOpen} onOpenChange={setConfirmRemoveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t(
                isLastDevice
                  ? 'profile.removeLastDeviceConfirmTitle'
                  : 'profile.removeDeviceConfirmTitle',
              )}
            </DialogTitle>
            <DialogDescription>
              {t(
                isLastDevice
                  ? 'profile.removeLastDeviceConfirmBody'
                  : 'profile.removeDeviceConfirmBody',
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setConfirmRemoveOpen(false)}
            >
              {t('common.cancel')}
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => {
                setConfirmRemoveOpen(false);
                onRemove();
              }}
            >
              {t('profile.removeDevice')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </li>
  );
}
