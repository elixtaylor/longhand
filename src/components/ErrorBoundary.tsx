import { Component, type ReactNode } from 'react';

interface State {
  failed: boolean;
}

/** Keep a malformed link or unexpected renderer failure from blanking the app. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(): void {
    // Deliberately local-only: Longhand does not send student input anywhere.
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main className="worksheet error-state" role="alert">
        <h1>Longhand could not open that problem</h1>
        <p>
          The link or saved browser data may be incomplete. You can safely start
          again.
        </p>
        <button
          type="button"
          className="btn-primary"
          onClick={() => {
            window.location.hash = '';
            window.location.reload();
          }}
        >
          Start a new problem
        </button>
      </main>
    );
  }
}
