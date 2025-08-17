import React from 'react';
import toast from 'react-hot-toast';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // Log to console and show a toast so devs/users see the issue
    // eslint-disable-next-line no-console
    console.error('Uncaught error in component tree:', error, info);
    try {
      toast.error('An unexpected error occurred. Check console for details.');
    } catch (e) {
      // ignore toast failures
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 24, textAlign: 'center' }}>
          <h2>Something went wrong.</h2>
          <p>We're sorry — the page encountered an error. You can try reloading the page.</p>
          <div style={{ marginTop: 12 }}>
            <button onClick={() => window.location.reload()} style={{ padding: '8px 12px' }}>
              Reload
            </button>
          </div>
          {this.state.error && (
            <details style={{ marginTop: 12, textAlign: 'left', display: 'inline-block', maxWidth: '80%' }}>
              <summary>Show error details</summary>
              <pre style={{ whiteSpace: 'pre-wrap', marginTop: 8 }}>{String(this.state.error)}</pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;


