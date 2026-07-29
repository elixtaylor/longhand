import { Component, cloneElement, isValidElement, type ReactNode } from 'react';

interface State {
  failed: boolean;
  recoveryKey: number;
  showRecoveryNotice: boolean;
}

/** Recover malformed links or saved drafts without replacing the workspace. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = {
    failed: false,
    recoveryKey: 0,
    showRecoveryNotice: false,
  };
  private recoveryNoticeTimer: ReturnType<typeof window.setTimeout> | null =
    null;

  static getDerivedStateFromError(): Partial<State> {
    return { failed: true };
  }

  componentDidCatch(): void {
    // Clear only transient problem state. Preferences and recent history are
    // useful and should survive a malformed shared link or draft.
    try {
      localStorage.removeItem('longhand.draft');
    } catch {
      /* storage unavailable — the fresh workspace still has an empty input */
    }
    try {
      const pathname = window.location.pathname.replace(
        /\/(?:graphing|calculators|settings)\/?$/,
        '/',
      );
      window.history.replaceState(null, '', pathname);
    } catch {
      /* history unavailable — the fresh workspace can still render locally */
    }

    if (this.recoveryNoticeTimer !== null) {
      window.clearTimeout(this.recoveryNoticeTimer);
    }
    this.setState((state) => ({
      failed: false,
      recoveryKey: state.recoveryKey + 1,
      showRecoveryNotice: true,
    }));
    this.recoveryNoticeTimer = window.setTimeout(() => {
      this.setState({ showRecoveryNotice: false });
      this.recoveryNoticeTimer = null;
    }, 25_000);
  }

  componentWillUnmount(): void {
    if (this.recoveryNoticeTimer !== null) {
      window.clearTimeout(this.recoveryNoticeTimer);
    }
  }

  render() {
    if (!this.state.failed) {
      const children =
        this.state.recoveryKey > 0 && isValidElement(this.props.children)
          ? cloneElement(this.props.children, { key: this.state.recoveryKey })
          : this.props.children;
      return (
        <>
          {children}
          {this.state.showRecoveryNotice && (
            <div className="error-toast" role="status" aria-live="polite">
              An error occurred.
            </div>
          )}
        </>
      );
    }

    // A second failure is unexpected, but keep the recovery surface small and
    // actionable rather than restoring the old full-page error treatment.
    return (
      <div className="error-recovery-fallback" role="alert">
        <div className="error-toast">An error occurred.</div>
      </div>
    );
  }
}
