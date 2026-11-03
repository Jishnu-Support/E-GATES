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

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col antialiased transition-colors duration-200">
      {/* Sidebar (Desktop fixed left 64, Mobile slide-over) */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content Area (offset by sidebar width on lg screens) */}
      <div className="lg:pl-64 flex flex-col flex-1 min-h-screen">
        {/* Top Header */}
        <Header
          onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
          associationName={user?.association_name}
        />

        {/* User-Only Live Scrolling Announcement Strip (Visible ONLY to resident members for their layout) */}
        {user?.role === 'member' && <ScrollingAnnouncement />}

        {/* Dynamic Page Content with Global Right-Side View Sponsored Ads Rail on All Pages */}
        <main className="flex-1 p-3 sm:p-5 lg:p-6 xl:p-7 max-w-[1600px] w-full mx-auto pb-28 sm:pb-20">
          <div className="flex flex-col xl:flex-row gap-6 items-start">
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

            {/* Global Right-Side Sponsored Ads Rail (Stacked Vertically on All Pages) */}
            {(user?.role === 'member' || user?.role === 'admin') && (
              <AdSideView
                panel={user?.role === 'admin' ? 'admin' : 'member'}
                associationId={user?.association_id}
              />
            )}
          </div>
        </main>

        {/* Floating SOS Trigger Button (for members) */}
        <FloatingSOS />

        {/* Global Footer */}
        <Footer />
      </div>
    </div>
  );
}
