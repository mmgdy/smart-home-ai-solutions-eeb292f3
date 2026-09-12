import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  showDetails: boolean;
  copied: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { 
    hasError: false,
    showDetails: false,
    copied: false
  };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Uncaught error:', error, info);
    this.setState({ error, errorInfo: info });
  }

  handleCopy = () => {
    const text = `Error: ${this.state.error?.message || 'Unknown'}\n\nStack:\n${this.state.error?.stack || ''}\n\nComponent Stack:\n${this.state.errorInfo?.componentStack || ''}`;
    navigator.clipboard.writeText(text);
    this.setState({ copied: true });
    setTimeout(() => this.setState({ copied: false }), 2000);
  };

  render() {
    if (this.state.hasError) {
      const message = this.state.error?.message || 'An unexpected error occurred.';
      return (
        <div className="flex min-h-screen items-center justify-center p-6 bg-background text-foreground">
          <div className="max-w-lg w-full text-center space-y-4 p-6 rounded-2xl border bg-card shadow-lg">
            <div className="w-12 h-12 mx-auto rounded-full bg-destructive/10 text-destructive flex items-center justify-center text-xl font-bold">
              !
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Something went wrong</h1>
            <p className="text-sm text-muted-foreground">
              Please refresh the page or return to the store homepage.
            </p>

            <div className="p-3 bg-muted/60 rounded-lg text-left text-xs font-mono text-destructive break-words">
              {message}
            </div>

            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:opacity-90 transition"
              >
                Refresh
              </button>
              <button
                onClick={() => { window.location.href = '/'; }}
                className="px-4 py-2 border text-foreground text-sm font-medium rounded-lg hover:bg-muted transition"
              >
                Back to Home
              </button>
              <button
                onClick={() => this.setState(prev => ({ showDetails: !prev.showDetails }))}
                className="px-3 py-2 text-xs text-muted-foreground hover:text-foreground transition underline"
              >
                {this.state.showDetails ? 'Hide details' : 'Show details'}
              </button>
            </div>

            {this.state.showDetails && (
              <div className="mt-4 pt-3 border-t text-left space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground">Stack Trace</span>
                  <button
                    onClick={this.handleCopy}
                    className="text-xs px-2 py-1 rounded bg-muted hover:bg-muted/80 text-foreground font-medium"
                  >
                    {this.state.copied ? 'Copied!' : 'Copy error details'}
                  </button>
                </div>
                <pre className="p-3 bg-muted rounded-lg text-[11px] font-mono overflow-auto max-h-48 text-muted-foreground whitespace-pre-wrap">
                  {this.state.error?.stack || 'No stack trace available'}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </div>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

