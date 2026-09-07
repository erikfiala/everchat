import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useLocale } from '@/hooks/useLocale';
import { ProfilePublicMeta } from '@/components/profile/ProfilePublicMeta';
import { fetchProfileByUsername } from '@/lib/profile';
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

  useEffect(() => {
    if (!open || !username) return;
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
        {!loading && profile && (
          <div className="flex items-start gap-3 py-2">
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
              <ProfilePublicMeta
                about={profile.about}
                website={profile.website}
              />
            </div>
          </div>
        )}
        {!loading && !profile && (
          <p className="text-sm text-[var(--color-muted-foreground)]">
            {t('profile.userNotFound')}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
