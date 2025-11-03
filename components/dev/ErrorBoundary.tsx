import React, { Component, ErrorInfo, ReactNode } from 'react';
import ErrorOverlay from './ErrorOverlay';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

// FIX: Converted ErrorBoundary to a class component. React error boundaries must be class components that define `getDerivedStateFromError` or `componentDidCatch`.
class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // You can also log the error to an error reporting service
    this.setState({ errorInfo });
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    // Only show the overlay in development environment
    const isDevelopment = process.env.NODE_ENV === 'development';

    if (this.state.hasError && isDevelopment) {
      return (
        <>
          {/* Render children behind the overlay so state is not lost on error */}
          <div style={{ display: 'none' }}>{this.props.children}</div>
          <ErrorOverlay error={this.state.error} errorInfo={this.state.errorInfo} />
        </>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
