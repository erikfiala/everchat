import { useEffect, useState } from 'react';
import { HatGlasses } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useLocale } from '@/hooks/useLocale';
import { ProfilePublicMeta } from '@/components/profile/ProfilePublicMeta';
import { fetchProfileByUsername, isAnonymousHandle } from '@/lib/profile';
import { ANONYMOUS_HANDLE } from '@/lib/constants';
import type { Profile } from '@/lib/database.types';
import { formatScore, scoreColorClass } from '@/lib/collapse';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface ProfileSheetProps {
  username: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProfileSheet({
  username,
  open,
  onOpenChange,
}: ProfileSheetProps) {
  const { t } = useLocale();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);
  const anonymous = isAnonymousHandle(username);

  useEffect(() => {
    if (!open || !username) return;
    if (isAnonymousHandle(username)) {
      setProfile(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchProfileByUsername(username)
      .then(setProfile)
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));
  }, [open, username]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('profile.title')}</DialogTitle>
        </DialogHeader>
        {loading && <Skeleton className="h-20 w-full" />}
        {!loading && anonymous && (
          <div className="pt-2">
            <div className="flex items-start gap-4">
              <Avatar className="ec-anonymous-avatar h-12 w-12">
                <AvatarFallback className="bg-transparent text-[var(--color-foreground)]">
                  <HatGlasses className="h-5 w-5" aria-hidden />
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="text-base font-semibold">
                  @{ANONYMOUS_HANDLE}
                </div>
                <div
                  className={cn(
                    'text-sm font-normal',
                    scoreColorClass(0),
                  )}
                >
                  {t('profile.karma', {
                    score: formatScore(0),
                  })}
                </div>
              </div>
            </div>
            <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">
              {t('profile.anonymousReserved')}
            </p>
          </div>
        )}
        {!loading && !anonymous && profile && (
          <div className="pt-2">
            <div className="flex items-start gap-4">
              <Avatar className="h-12 w-12">
                {profile.avatar_url && <AvatarImage src={profile.avatar_url} />}
                <AvatarFallback>
                  {(profile.username || '?').slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="text-base font-semibold">
                  @{profile.username || t('message.unknownAuthor')}
                </div>
                <div
                  className={cn(
                    'text-sm font-normal',
                    scoreColorClass(profile.karma ?? 0),
                  )}
                >
                  {t('profile.karma', {
                    score: formatScore(profile.karma ?? 0),
                  })}
                </div>
              </div>
            </div>
            <ProfilePublicMeta
              about={profile.about}
              website={profile.website}
            />
          </div>
        )}
        {!loading && !anonymous && !profile && (
          <p className="text-sm text-[var(--color-muted-foreground)]">
            {t('profile.userNotFound')}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
