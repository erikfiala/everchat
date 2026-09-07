import { useEffect, useRef, useState } from 'react';
import { ImagePlay, Smile, X } from 'lucide-react';
import { EmojiPicker } from '@/components/chat/EmojiPicker';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { BODY_WARN_REMAINING, MAX_BODY_LENGTH } from '@/lib/constants';
import { searchGiphy } from '@/lib/profile';
import { useAuth } from '@/hooks/useAuth';
import { useLocale } from '@/hooks/useLocale';
import { cn } from '@/lib/utils';

const TYPING_IDLE_MS = 2500;

interface ComposerProps {
  replyToHandle?: string | null;
  onCancelReply?: () => void;
  onSubmit: (body: string, gifUrl?: string | null) => Promise<void>;
  gated?: boolean;
  onGate?: () => void;
  /** Publish ephemeral typing presence (authenticated composers only). */
  onTypingChange?: (typing: boolean) => void;
}

export function Composer({
  replyToHandle,
  onCancelReply,
  onSubmit,
  gated,
  onGate,
  onTypingChange,
}: ComposerProps) {
  const { user } = useAuth();
  const { t } = useLocale();
  const [body, setBody] = useState('');
  const [gifUrl, setGifUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showGiphy, setShowGiphy] = useState(false);
  const [giphyQ, setGiphyQ] = useState('');
  const [gifs, setGifs] = useState<
    { id: string; url: string; preview: string; title: string }[]
  >([]);
  const [searching, setSearching] = useState(false);
  const [giphyError, setGiphyError] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLDivElement>(null);
  const typingActiveRef = useRef(false);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onTypingChangeRef = useRef(onTypingChange);
  onTypingChangeRef.current = onTypingChange;

  const stopTyping = () => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
    if (typingActiveRef.current) {
      typingActiveRef.current = false;
      onTypingChangeRef.current?.(false);
    }
  };

  const bumpTyping = () => {
    if (!onTypingChangeRef.current) return;
    if (!typingActiveRef.current) {
      typingActiveRef.current = true;
      onTypingChangeRef.current(true);
    }
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(stopTyping, TYPING_IDLE_MS);
  };

  useEffect(() => () => stopTyping(), []);

  useEffect(() => {
    if (gated || !onTypingChange) stopTyping();
  }, [gated, onTypingChange]);

  useEffect(() => {
    if (replyToHandle) {
      taRef.current?.focus();
    }
  }, [replyToHandle]);

  useEffect(() => {
    if (!showEmoji && !showGiphy) return;

    const closePickers = () => {
      setShowEmoji(false);
      setShowGiphy(false);
    };

    const onPointerDown = (e: PointerEvent) => {
      const target = e.target;
      if (!(target instanceof Node)) return;
      if (pickerRef.current?.contains(target)) return;
      if (toggleRef.current?.contains(target)) return;
      closePickers();
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closePickers();
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [showEmoji, showGiphy]);

  useEffect(() => {
    if (!showGiphy) {
      setGifs([]);
      setSearching(false);
      setGiphyError(false);
      return;
    }

    let cancelled = false;
    const run = async () => {
      setSearching(true);
      setGiphyError(false);
      try {
        const results = await searchGiphy(giphyQ.trim(), user?.token);
        if (!cancelled) {
          setGifs(results);
          setGiphyError(false);
        }
      } catch {
        if (!cancelled) {
          setGifs([]);
          setGiphyError(true);
        }
      } finally {
        if (!cancelled) setSearching(false);
      }
    };

    // Trending (empty query) on open; debounce only while typing a search.
    if (!giphyQ.trim()) {
      void run();
      return () => {
        cancelled = true;
      };
    }

    const timer = setTimeout(() => {
      void run();
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [giphyQ, showGiphy, user?.token]);

  if (gated) {
    return (
      <div className="border-t border-[var(--color-border)] bg-[var(--color-card)] p-3">
        <Button className="w-full" onClick={onGate}>
          {t('composer.signInAnonymously')}
        </Button>
      </div>
    );
  }

  const remaining = MAX_BODY_LENGTH - body.length;
  const showCounter = remaining < BODY_WARN_REMAINING;

  const submit = async () => {
    if (!body.trim() && !gifUrl) return;
    if (body.length > MAX_BODY_LENGTH) return;
    stopTyping();
    setBusy(true);
    try {
      await onSubmit(body.trim(), gifUrl);
      setBody('');
      setGifUrl(null);
      setShowGiphy(false);
      setShowEmoji(false);
      onCancelReply?.();
    } finally {
      setBusy(false);
    }
  };

  const onEmoji = (emoji: string) => {
    setBody((b) => {
      const next = (b + emoji).slice(0, MAX_BODY_LENGTH);
      if (next.trim()) bumpTyping();
      else stopTyping();
      return next;
    });
    setShowEmoji(false);
    taRef.current?.focus();
  };

  return (
    <div className="relative border-t border-[var(--color-border)] bg-[var(--color-card)] p-3">
      {replyToHandle && (
        <div className="mb-3 flex items-center justify-between text-xs text-[var(--color-muted-foreground)]">
          <span>
            {t('composer.replyingTo', { username: replyToHandle })}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            aria-label={t('common.cancel')}
            onClick={onCancelReply}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
      <Textarea
        ref={taRef}
        value={body}
        maxLength={MAX_BODY_LENGTH}
        placeholder={t('composer.placeholder')}
        className="resize-none"
        onChange={(e) => {
          const next = e.target.value.slice(0, MAX_BODY_LENGTH);
          setBody(next);
          if (next.trim()) bumpTyping();
          else stopTyping();
        }}
        onBlur={stopTyping}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            submit();
          }
        }}
      />
      {gifUrl && (
        <div className="relative mt-2 inline-block overflow-hidden rounded">
          <img
            src={gifUrl}
            alt={t('composer.selectedGifAlt')}
            className="max-h-24"
          />
          <button
            type="button"
            className="absolute end-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-zinc-900 text-white"
            onClick={() => setGifUrl(null)}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      <TooltipProvider delayDuration={200}>
        <div className="mt-3 flex items-center gap-1">
          <div ref={toggleRef} className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  aria-label={t('composer.emoji')}
                  onClick={() => {
                    setShowEmoji((v) => !v);
                    setShowGiphy(false);
                  }}
                >
                  <Smile className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('composer.emoji')}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  aria-label={t('composer.gif')}
                  onClick={() => {
                    setShowGiphy((v) => !v);
                    setShowEmoji(false);
                  }}
                >
                  <ImagePlay className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('composer.gif')}</TooltipContent>
            </Tooltip>
          </div>
          {showCounter && (
            <span
              className="ms-auto me-2 tabular-nums text-[11px] font-medium text-red-600"
              aria-live="polite"
            >
              {remaining}
            </span>
          )}
          <Button
            className={cn('text-xs', !showCounter && 'ms-auto')}
            size="sm"
            disabled={busy || (!body.trim() && !gifUrl) || body.length > MAX_BODY_LENGTH}
            onClick={submit}
          >
            {busy ? t('composer.sending') : t('composer.post')}
          </Button>
        </div>
      </TooltipProvider>

      <div ref={pickerRef}>
        {showEmoji && <EmojiPicker onSelect={onEmoji} />}

        {showGiphy && (
          <div className="absolute start-0 end-0 bottom-full z-30 mx-2 mb-3 rounded-md border border-[var(--color-border)] bg-[var(--color-card)] px-1 py-2 shadow-lg">
            <Input
              placeholder={t('composer.searchGiphy')}
              value={giphyQ}
              onChange={(e) => setGiphyQ(e.target.value)}
              autoFocus
            />
            <div className="mt-2 grid max-h-72 min-h-32 grid-cols-3 gap-1 overflow-y-auto">
              {searching && (
                <p
                  role="status"
                  className="col-span-3 flex min-h-32 items-center justify-center px-2 text-center text-sm text-[var(--color-muted-foreground)]"
                >
                  {t('composer.searching')}
                </p>
              )}
              {!searching && gifs.length === 0 && (
                <p
                  role="status"
                  className="col-span-3 flex min-h-32 items-center justify-center px-2 text-center text-sm text-[var(--color-muted-foreground)]"
                >
                  {giphyError
                    ? t('composer.giphyError')
                    : giphyQ.trim()
                      ? t('composer.giphyNoResults')
                      : t('composer.giphyEmpty')}
                </p>
              )}
              {!searching &&
                gifs.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    className={cn(
                      'overflow-hidden rounded',
                      gifUrl === g.url && 'ring-2 ring-[var(--color-primary)]',
                    )}
                    onClick={() => {
                      setGifUrl(g.url);
                      setShowGiphy(false);
                    }}
                  >
                    <img
                      src={g.preview || g.url}
                      alt={g.title}
                      className="h-16 w-full object-cover"
                    />
                  </button>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
