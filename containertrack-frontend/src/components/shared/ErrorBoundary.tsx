import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";
import { Button } from "../ui/Button";
import i18n from "../../i18n";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error("ErrorBoundary caught:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-ivory p-8 text-center">
          <h1 className="text-xl font-semibold text-dark-brown">{i18n.t("errorBoundary.title")}</h1>
          <pre className="max-w-2xl overflow-auto rounded-md border border-sage bg-white p-4 text-left text-sm text-danger">
            {this.state.error.message}
          </pre>
          <Button onClick={() => this.setState({ error: null })}>{i18n.t("errorBoundary.retry")}</Button>
          <Button variant="ghost" onClick={() => (window.location.href = "/")}>
            {i18n.t("errorBoundary.goHome")}
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
