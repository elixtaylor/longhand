import { Component, cloneElement, isValidElement, type ReactNode } from 'react';

interface State {
  failed: boolean;
  recoveryAttempted: boolean;
}

/** Recover malformed links or saved drafts without replacing the workspace. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = {
    failed: false,
    recoveryAttempted: false,
  };
  private recoveryKey = 0;

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

    if (this.state.recoveryAttempted) return;
    this.recoveryKey = Date.now();
    this.setState({
      failed: false,
      recoveryAttempted: true,
    });
  }

  render() {
    if (!this.state.failed) {
      const children =
        this.recoveryKey > 0 && isValidElement(this.props.children)
          ? cloneElement(this.props.children, { key: this.recoveryKey })
          : this.props.children;
      return (
        <>
          {children}
          {this.recoveryKey > 0 && (
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
