import { Component, type ErrorInfo, type ReactNode } from 'react';
import { getT } from '@/lib/i18n/runtime';

interface Props {
  children: ReactNode;
  /** Optional label for console / recovery UI. */
  label?: string;
}

interface State {
  error: Error | null;
}

/**
 * Catches render errors so the side panel is not a silent blank frame.
 * Wrap the main pane (below TopNav) so chrome stays usable after a crash.
 */
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(
      `[Everchat${this.props.label ? `:${this.props.label}` : ''}] render error`,
      error,
      info.componentStack,
    );
  }

  private retry = () => {
    this.setState({ error: null });
  };

  override render() {
    if (this.state.error) {
      const t = getT();
      return (
        <div className="flex h-full flex-col items-center justify-center gap-3 px-5 py-8 text-center">
          <p className="text-sm font-medium text-[var(--color-foreground)]">
            {t('errors.generic')}
          </p>
          <button
            type="button"
            onClick={this.retry}
            className="rounded-md bg-[var(--color-primary)] px-3 py-1.5 text-sm text-[var(--color-primary-foreground)]"
          >
            {t('chat.retry')}
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
