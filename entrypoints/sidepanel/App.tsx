import { useEffect, useRef, useState } from 'react';
import { Toaster } from 'sonner';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { TopNav } from '@/components/TopNav';
import { ChatTab } from '@/components/chat/ChatTab';
import { NotificationsTab } from '@/components/notifications/NotificationsTab';
import { ProfileTab } from '@/components/profile/ProfileTab';
import { ProfileSheet } from '@/components/profile/ProfileSheet';
import { SettingsTab } from '@/components/settings/SettingsTab';
import { ExploreTab } from '@/components/explore/ExploreTab';
import { LeaderboardTab } from '@/components/leaderboard/LeaderboardTab';
import { AuthLanding } from '@/components/auth/AuthLanding';
import { AddToHomeScreenModal } from '@/components/webapp/AddToHomeScreenModal';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import { LocaleProvider, useLocale } from '@/hooks/useLocale';
import { ThemeProvider, useTheme } from '@/hooks/useTheme';
import { SkinProvider } from '@/hooks/useSkin';
import { useActiveTab } from '@/hooks/useActiveTab';
import {
  NotificationsProvider,
  useNotifications,
} from '@/hooks/useNotifications';
import type { PanelTab } from '@/lib/database.types';
import { isWebApp } from '@/lib/webapp/mode';
import { cn } from '@/lib/utils';

function reportPanelAttention(visible: boolean, tab: PanelTab) {
  try {
    void browser.runtime
      ?.sendMessage({ type: 'PANEL_ATTENTION', visible, tab })
      ?.catch(() => undefined);
  } catch {
    /* runtime unavailable */
  }
}

function Shell() {
  const [tab, setTab] = useState<PanelTab>('chat');
  const { t } = useLocale();
  const { user, showAuthLanding, setShowAuthLanding, loading } = useAuth();
  const { resolved: theme } = useTheme();
  const { tab: activeTab, ready, clearFocus } = useActiveTab();
  const { unread } = useNotifications();
  const [profileUser, setProfileUser] = useState<string | null>(null);
  const wasSignedIn = useRef(Boolean(user));

  // After passkey success, land on Chat so a Profile/Notifications auth gate
  // doesn’t remount a fragile authenticated tree on the wrong tab.
  useEffect(() => {
    if (user && !wasSignedIn.current) {
      setTab('chat');
      setShowAuthLanding(false);
    }
    wasSignedIn.current = Boolean(user);
  }, [user, setShowAuthLanding]);

  // Activity / share / notification deep-links focus a message — show Chat.
  useEffect(() => {
    if (!activeTab.focusMessageId) return;
    setTab('chat');
    setShowAuthLanding(false);
  }, [activeTab.focusMessageId, setShowAuthLanding]);

  // Tell the background SW whether the panel is focused on the inbox so it
  // can skip redundant OS toasts while the user is already reading them.
  useEffect(() => {
    const sync = () => {
      reportPanelAttention(document.visibilityState === 'visible', tab);
    };
    sync();
    document.addEventListener('visibilitychange', sync);
    const heartbeat = window.setInterval(sync, 15_000);
    return () => {
      document.removeEventListener('visibilitychange', sync);
      window.clearInterval(heartbeat);
      reportPanelAttention(false, tab);
    };
  }, [tab]);

  const onNav = (next: PanelTab) => {
    if ((next === 'notifications' || next === 'profile') && !user) {
      setShowAuthLanding(true);
      setTab(next);
      return;
    }
    setShowAuthLanding(false);
    setTab(next);
  };

  const showLanding =
    showAuthLanding ||
    ((tab === 'notifications' || tab === 'profile') && !user);

  return (
    <div
      className={cn(
        'flex min-h-0 flex-col bg-[var(--color-background)]',
        // /app #root is a padded flex column — flex-1 respects safe-area padding.
        // Extension #root is only height:100%, so the shell still needs h-full.
        isWebApp() ? 'flex-1' : 'h-full',
      )}
    >
      <TopNav active={tab} onChange={onNav} unread={unread} />
      <main className="min-h-0 flex-1">
        <ErrorBoundary label="main" key={user?.id ?? 'anon'}>
          {loading || !ready ? (
            <div className="flex h-full items-center justify-center text-sm text-[var(--color-muted-foreground)]">
              {t('common.loading')}
            </div>
          ) : showLanding ? (
            <AuthLanding />
          ) : tab === 'chat' ? (
            <ChatTab
              tab={activeTab}
              clearFocus={clearFocus}
              onOpenProfile={(u) => setProfileUser(u)}
            />
          ) : tab === 'explore' ? (
            <ExploreTab onOpenChat={() => setTab('chat')} />
          ) : tab === 'leaderboard' ? (
            <LeaderboardTab onOpenProfile={(u) => setProfileUser(u)} />
          ) : tab === 'notifications' ? (
            <NotificationsTab onOpenChat={() => setTab('chat')} />
          ) : tab === 'settings' ? (
            <SettingsTab />
          ) : (
            <ProfileTab onOpenChat={() => setTab('chat')} />
          )}
        </ErrorBoundary>
      </main>
      <ProfileSheet
        username={profileUser}
        open={Boolean(profileUser)}
        onOpenChange={(open) => !open && setProfileUser(null)}
      />
      <Toaster
        theme={theme}
        position="top-center"
        offset={
          isWebApp()
            ? 'calc(4.25rem + env(safe-area-inset-top, 0px))'
            : 68
        }
        closeButton
        toastOptions={{
          classNames: {
            toast: 'ec-toast',
            title: 'ec-toast-title',
            description: 'ec-toast-description',
            icon: 'ec-toast-icon',
            closeButton: 'ec-toast-close',
            success: 'ec-toast-success',
            error: 'ec-toast-error',
          },
        }}
      />
      <AddToHomeScreenModal />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <SkinProvider>
        <LocaleProvider>
          <AuthProvider>
            <NotificationsProvider>
              <Shell />
            </NotificationsProvider>
          </AuthProvider>
        </LocaleProvider>
      </SkinProvider>
    </ThemeProvider>
  );
}
