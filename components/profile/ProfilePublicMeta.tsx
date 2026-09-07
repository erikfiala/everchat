import { useLocale } from '@/hooks/useLocale';
import {
  openExternalUrl,
  websiteDisplayLabel,
} from '@/lib/profile';

export function ProfilePublicMeta({
  about,
  website,
}: {
  about: string | null | undefined;
  website: string | null | undefined;
}) {
  const { t } = useLocale();
  const bio = about?.trim() || '';
  const href = website?.trim() || '';
  const label = href ? websiteDisplayLabel(href) : '';

  if (!bio && !href) return null;

  return (
    <div className="mt-2 min-w-0 space-y-1">
      {bio ? (
        <p className="whitespace-pre-wrap break-words text-sm">{bio}</p>
      ) : null}
      {href && label ? (
        <button
          type="button"
          onClick={() => void openExternalUrl(href)}
          className="max-w-full truncate text-sm text-[var(--color-muted-foreground)] underline-offset-4 hover:underline"
          aria-label={t('profile.website')}
          title={href}
        >
          {label}
        </button>
      ) : null}
    </div>
  );
}
