import { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log unexpected client-side rendering exceptions
    console.error("[Client Error Boundary]", error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            padding: "3rem",
            textAlign: "center",
            maxWidth: "600px",
            margin: "4rem auto",
          }}
        >
          <div className="card">
            <h2 style={{ color: "var(--danger)", marginBottom: "1rem" }}>
              Application Rendering Error
            </h2>
            <p
              style={{ color: "var(--text-secondary)", marginBottom: "1.5rem" }}
            >
              An unexpected client error occurred. The technical error has been
              logged.
            </p>
            <p
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "0.85rem",
                color: "var(--text-muted)",
                marginBottom: "1.5rem",
              }}
            >
              {this.state.error?.message}
            </p>
            <button className="btn btn-primary" onClick={this.handleReload}>
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
