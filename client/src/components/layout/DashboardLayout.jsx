import React, { useState, Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import Footer from './Footer';
import FloatingSOS from './FloatingSOS';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorBoundary from '../common/ErrorBoundary';
import ScrollingAnnouncement from '../common/ScrollingAnnouncement';
import AdSideView from '../common/AdSideView';
import { useAuth } from '../../hooks/useAuth';

export default function DashboardLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();

  const showAds = user?.role === 'member' || user?.role === 'admin';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col antialiased transition-colors duration-200">
      {/* Sidebar (Desktop fixed left 64, Mobile slide-over) */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content Area (offset by sidebar width on lg screens) */}
      <div className="lg:pl-64 flex flex-col flex-1 min-h-screen">
        {/* Sticky Top Header */}
        <Header
          onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
          associationName={user?.association_name}
        />

        {/* Live Scrolling Announcement Strip (members only) */}
        {user?.role === 'member' && <ScrollingAnnouncement />}

        {/* Page Content + Global Right-Side Ad Rail */}
        <main className="flex-1 w-full max-w-[1600px] mx-auto px-3 py-4 sm:px-5 sm:py-5 lg:px-6 lg:py-6 pb-28 sm:pb-24 lg:pb-10">
          <div className="flex flex-col xl:flex-row gap-5 xl:gap-6 items-start w-full">

            {/* Primary Page Content */}
            <div className="flex-1 min-w-0 w-full">
              <ErrorBoundary>
                <Suspense
                  fallback={
                    <div className="min-h-[40vh] flex items-center justify-center">
                      <LoadingSpinner message="Loading page..." />
                    </div>
                  }
                >
                  {children || <Outlet />}
                </Suspense>
              </ErrorBoundary>
            </div>

            {/* Global Right-Side Sponsored Ads Rail — desktop only (mobile uses floating tab in AdSideView) */}
            {showAds && (
              <AdSideView
                panel={user?.role === 'admin' ? 'admin' : 'member'}
                associationId={user?.association_id}
              />
            )}
          </div>
        </main>

        {/* Floating SOS Trigger Button (members only) */}
        <FloatingSOS />

        {/* Global Footer */}
        <Footer />
      </div>
    </div>
  );
}
