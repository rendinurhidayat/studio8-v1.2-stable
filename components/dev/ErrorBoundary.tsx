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

// FIX: The errors reported suggest this component was not being interpreted as a proper React Class Component.
// An Error Boundary must be a class component with `getDerivedStateFromError` or `componentDidCatch`.
// This implementation ensures it extends `React.Component` correctly, giving it access to `this.props`, `this.state`, and lifecycle methods.
class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
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
