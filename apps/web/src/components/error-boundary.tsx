'use client';

import React from 'react';
import { Button } from '@/components/ui/button';

/**
 * React error boundary.
 * Per spec (03_IMPLEMENTATION_PLAN.md Section 15):
 * - Never expose raw stack traces to users
 * - User-facing errors should include a retry or next action
 */

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error (correlation ID would be attached in production monitoring)
    console.error('[ErrorBoundary]', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '48px 24px',
          textAlign: 'center',
          gap: '16px',
        }}>
          <h2 style={{
            font: 'var(--text-section-title)',
            color: 'var(--color-text-primary)',
          }}>
            Something went wrong
          </h2>
          <p style={{
            font: 'var(--text-body)',
            color: 'var(--color-text-secondary)',
            maxWidth: '400px',
          }}>
            An unexpected error occurred. Please try refreshing the page.
          </p>
          <Button variant="secondary" onClick={this.handleReset}>
            Try again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
