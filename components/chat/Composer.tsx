import { useEffect, useRef, useState } from 'react';
import EmojiPicker, { type EmojiClickData, Theme } from 'emoji-picker-react';
import { Image, Smile, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { BODY_WARN_AT, MAX_BODY_LENGTH } from '@/lib/constants';
import { searchGiphy } from '@/lib/profile';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

interface ComposerProps {
  replyToHandle?: string | null;
  onCancelReply?: () => void;
  onSubmit: (body: string, gifUrl?: string | null) => Promise<void>;
  gated?: boolean;
  onGate?: () => void;
}

export function Composer({
  replyToHandle,
  onCancelReply,
  onSubmit,
  gated,
  onGate,
}: ComposerProps) {
  const { user } = useAuth();
  const [body, setBody] = useState(
    replyToHandle ? `@${replyToHandle} ` : '',
  );
  const [gifUrl, setGifUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showGiphy, setShowGiphy] = useState(false);
  const [giphyQ, setGiphyQ] = useState('');
  const [gifs, setGifs] = useState<
    { id: string; url: string; preview: string; title: string }[]
  >([]);
  const [searching, setSearching] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (replyToHandle) {
      setBody((prev) => {
        if (prev.startsWith(`@${replyToHandle}`)) return prev;
        return `@${replyToHandle} `;
      });
      taRef.current?.focus();
    }
  }, [replyToHandle]);

  useEffect(() => {
    if (!showGiphy || !giphyQ.trim()) {
      setGifs([]);
      return;
    }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await searchGiphy(giphyQ, user?.token);
        setGifs(results);
      } catch {
        setGifs([]);
      } finally {
        setSearching(false);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [giphyQ, showGiphy, user?.token]);

  if (gated) {
    return (
      <div className="border-t border-[var(--color-border)] bg-[var(--color-card)] p-3">
        <Button className="w-full" onClick={onGate}>
          Sign in anonymously to join
        </Button>
      </div>
    );
  }

  const remaining = MAX_BODY_LENGTH - body.length;
  const overWarn = body.length >= BODY_WARN_AT;

  const submit = async () => {
    if (!body.trim() && !gifUrl) return;
    if (body.length > MAX_BODY_LENGTH) return;
    setBusy(true);
    try {
      await onSubmit(body.trim(), gifUrl);
      setBody(replyToHandle ? `@${replyToHandle} ` : '');
      setGifUrl(null);
      setShowGiphy(false);
      setShowEmoji(false);
      onCancelReply?.();
    } finally {
      setBusy(false);
    }
  };

  const onEmoji = (emoji: EmojiClickData) => {
    setBody((b) => (b + emoji.emoji).slice(0, MAX_BODY_LENGTH));
    setShowEmoji(false);
    taRef.current?.focus();
  };

  return (
    <div className="relative border-t border-[var(--color-border)] bg-[var(--color-card)] p-3">
      {replyToHandle && (
        <div className="mb-2 flex items-center justify-between text-xs text-[var(--color-muted-foreground)]">
          <span>
            Replying to <span className="font-medium">@{replyToHandle}</span>
          </span>
          <button type="button" onClick={onCancelReply} className="hover:underline">
            Cancel
          </button>
        </div>
      )}
      <Textarea
        ref={taRef}
        value={body}
        maxLength={MAX_BODY_LENGTH}
        placeholder="Leave a comment…"
        onChange={(e) => setBody(e.target.value.slice(0, MAX_BODY_LENGTH))}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            submit();
          }
        }}
      />
      {gifUrl && (
        <div className="relative mt-2 inline-block">
          <img src={gifUrl} alt="Selected GIF" className="max-h-24 rounded" />
          <button
            type="button"
            className="absolute -right-2 -top-2 rounded-full bg-black/70 p-0.5 text-white"
            onClick={() => setGifUrl(null)}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
      <div className="mt-2 flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => {
            setShowEmoji((v) => !v);
            setShowGiphy(false);
          }}
        >
          <Smile className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => {
            setShowGiphy((v) => !v);
            setShowEmoji(false);
          }}
        >
          <Image className="h-4 w-4" />
        </Button>
        <span
          className={cn(
            'ml-auto tabular-nums text-[11px]',
            overWarn
              ? 'font-medium text-red-600'
              : 'text-[var(--color-muted-foreground)]',
          )}
          aria-live="polite"
        >
          {remaining}
        </span>
        <Button
          size="sm"
          disabled={busy || (!body.trim() && !gifUrl) || body.length > MAX_BODY_LENGTH}
          onClick={submit}
        >
          {busy ? 'Sending…' : 'Post'}
        </Button>
      </div>

      {showEmoji && (
        <div className="absolute bottom-full left-2 z-30 mb-1">
          <EmojiPicker
            theme={Theme.LIGHT}
            onEmojiClick={onEmoji}
            width={280}
            height={360}
          />
        </div>
      )}

      {showGiphy && (
        <div className="absolute bottom-full left-0 right-0 z-30 mx-2 mb-1 rounded-md border border-[var(--color-border)] bg-[var(--color-card)] p-2 shadow-lg">
          <Input
            placeholder="Search Giphy…"
            value={giphyQ}
            onChange={(e) => setGiphyQ(e.target.value)}
            autoFocus
          />
          <div className="mt-2 grid max-h-40 grid-cols-3 gap-1 overflow-y-auto">
            {searching && (
              <p className="col-span-3 text-xs text-[var(--color-muted-foreground)]">
                Searching…
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
                  <img src={g.preview || g.url} alt={g.title} className="h-16 w-full object-cover" />
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
