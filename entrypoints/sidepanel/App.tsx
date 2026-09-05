import { useEffect, useState } from 'react';
import { Toaster } from 'sonner';
import { TopNav } from '@/components/TopNav';
import { ChatTab } from '@/components/chat/ChatTab';
import { NotificationsTab } from '@/components/notifications/NotificationsTab';
import { ProfileTab } from '@/components/profile/ProfileTab';
import { ProfileSheet } from '@/components/profile/ProfileSheet';
import { AuthLanding } from '@/components/auth/AuthLanding';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import { useActiveTab } from '@/hooks/useActiveTab';
import { useNotifications } from '@/hooks/useNotifications';
import type { PanelTab } from '@/lib/database.types';

function reportPanelAttention(visible: boolean, tab: PanelTab) {
  void browser.runtime
    .sendMessage({ type: 'PANEL_ATTENTION', visible, tab })
    .catch(() => undefined);
}

function Shell() {
  const [tab, setTab] = useState<PanelTab>('chat');
  const { user, showAuthLanding, setShowAuthLanding, loading } = useAuth();
  const { tab: activeTab, ready, clearFocus } = useActiveTab();
  const { unread } = useNotifications(user?.id);
  const [profileUser, setProfileUser] = useState<string | null>(null);

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
    <div className="flex h-full flex-col bg-[var(--color-background)]">
      <TopNav active={tab} onChange={onNav} unread={unread} />
      <main className="min-h-0 flex-1">
        {loading || !ready ? (
          <div className="flex h-full items-center justify-center text-sm text-[var(--color-muted-foreground)]">
            Loading…
          </div>
        ) : showLanding ? (
          <AuthLanding />
        ) : tab === 'chat' ? (
          <ChatTab
            tab={activeTab}
            clearFocus={clearFocus}
            onOpenProfile={(u) => setProfileUser(u)}
          />
        ) : tab === 'notifications' ? (
          <NotificationsTab />
        ) : (
          <ProfileTab />
        )}
      </main>
      <ProfileSheet
        username={profileUser}
        open={Boolean(profileUser)}
        onOpenChange={(open) => !open && setProfileUser(null)}
      />
      <Toaster position="top-center" richColors closeButton />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Shell />
    </AuthProvider>
  );
}
