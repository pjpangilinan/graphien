import React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="retro-border p-5 bg-white dark:bg-gray-800 text-center space-y-3">
          <h2 className="text-lg font-bold">Something went wrong</h2>
          <p className="text-sm text-gray-500">
            {this.state.error?.message || 'An unexpected error occurred.'}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 retro-border bg-gray-800 text-white dark:bg-gray-200 dark:text-gray-900 font-bold hover:bg-gray-700 dark:hover:bg-gray-300 cursor-pointer select-none"
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
