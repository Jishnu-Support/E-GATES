import React, { Component } from 'react';
import { HiExclamationTriangle, HiArrowPath, HiHome } from 'react-icons/hi2';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, isChunkError: false };
  }

  static getDerivedStateFromError(error) {
    const errMsg = (error?.message || '') + ' ' + (error?.name || '');
    const isChunk =
      /loading chunk|dynamically imported module|failed to fetch|importing a module script/i.test(errMsg);
    return { hasError: true, error, isChunkError: isChunk };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught error:', error, errorInfo);

    const errMsg = (error?.message || '') + ' ' + (error?.name || '');
    const isChunk =
      /loading chunk|dynamically imported module|failed to fetch|importing a module script/i.test(errMsg);

    // Auto-reload once on new build chunk shifts to keep experience seamless
    if (isChunk) {
      const lastReload = window.sessionStorage.getItem('eb_chunk_auto_reload');
      const now = Date.now();
      if (!lastReload || now - parseInt(lastReload, 10) > 8000) {
        window.sessionStorage.setItem('eb_chunk_auto_reload', now.toString());
        window.sessionStorage.removeItem('lazy_chunk_retry_refreshed');
        window.location.reload();
      }
    }
  }

  handleReload = () => {
    try {
      window.sessionStorage.removeItem('lazy_chunk_retry_refreshed');
      window.sessionStorage.removeItem('eb_chunk_auto_reload');
    } catch (e) {
      // Ignore sessionStorage errors
    }
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  handleGoHome = () => {
    try {
      window.sessionStorage.removeItem('lazy_chunk_retry_refreshed');
      window.sessionStorage.removeItem('eb_chunk_auto_reload');
    } catch (e) {}
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      const isChunk = this.state.isChunkError;

      return (
        <div className="min-h-[400px] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800/60 rounded-3xl p-6 sm:p-8 text-center shadow-2xl space-y-4">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center text-3xl shadow-sm">
              <HiExclamationTriangle className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-lg font-black text-gray-900 dark:text-white tracking-tight">
                {isChunk ? 'New Update Ready' : 'Page Temporarily Interrupted'}
              </h3>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">
                {isChunk
                  ? 'A fresh update was published to the portal. Click reload to load the latest version.'
                  : (this.state.error?.message || 'A temporary display interruption occurred. Refreshing will restore the latest page data.')}
              </p>
            </div>

            {/* Error Message Details (if non-chunk error) */}
            {!isChunk && this.state.error?.message && (
              <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-xl text-left text-[11px] font-mono text-red-700 dark:text-red-300 overflow-x-auto max-h-24">
                {this.state.error.message}
              </div>
            )}

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2.5">
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold transition shadow-md cursor-pointer"
              >
                <HiArrowPath className="w-4 h-4" />
                <span>Reload Page</span>
              </button>
              <button
                type="button"
                onClick={this.handleGoHome}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-200 rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                <HiHome className="w-4 h-4" />
                <span>Dashboard Home</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
