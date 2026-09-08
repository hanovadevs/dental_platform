'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import styles from './app-shell.module.css';
import { CommandPalette } from './command-palette';

/**
 * Application shell with slim navigation rail.
 * Per spec (06_UI_UX_DESIGN_SYSTEM.md Sections 9-10):
 * - Slim left navigation rail
 * - Main workspace
 * - Top contextual region
 * - Text labels carry most navigation (not icons)
 * - Maximum 8 primary nav items
 * - Three navigation layers: Global, Contextual, Object Context
 * - Global command palette (Cmd+K)
 */

interface NavItem {
  label: string;
  href: string;
  segment: string;
}

const navItems: NavItem[] = [
  { label: 'Home', href: '/', segment: '' },
  { label: 'Calendar', href: '/calendar', segment: 'calendar' },
  { label: 'Patients', href: '/patients', segment: 'patients' },
  { label: 'Treatments', href: '/treatments', segment: 'treatments' },
  { label: 'Revenue', href: '/revenue', segment: 'revenue' },
  { label: 'Billing', href: '/billing', segment: 'billing' },
  { label: 'Operations', href: '/operations', segment: 'operations' },
  { label: 'Reports', href: '/reports', segment: 'reports' },
];

interface AppShellProps {
  children: React.ReactNode;
  userName?: string;
  clinicName?: string;
}

export function AppShell({ children, userName, clinicName }: AppShellProps) {
  const pathname = usePathname();
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setPaletteOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const getActiveSegment = () => {
    const parts = pathname.split('/').filter(Boolean);
    return parts[0] || '';
  };

  const activeSegment = getActiveSegment();

  return (
    <div className={styles.shell}>
      {/* Navigation Rail */}
      <nav className={styles.rail} aria-label="Primary navigation">
        <div className={styles.railTop}>
          <Link href="/" className={styles.logo}>
            {clinicName || 'Dental OS'}
          </Link>
          <button
            type="button"
            className={styles.searchTrigger}
            onClick={() => setPaletteOpen(true)}
            aria-label="Search and commands (Cmd+K)"
          >
            <span>Search</span>
            <kbd className={styles.searchKbd}>⌘K</kbd>
          </button>
        </div>

        <ul className={styles.navList}>
          {navItems.map((item) => (
            <li key={item.segment}>
              <Link
                href={item.href}
                className={[
                  styles.navItem,
                  activeSegment === item.segment ? styles.navItemActive : '',
                ].join(' ')}
                aria-current={activeSegment === item.segment ? 'page' : undefined}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className={styles.railBottom}>
          <Link
            href="/settings"
            className={[
              styles.navItem,
              activeSegment === 'settings' ? styles.navItemActive : '',
            ].join(' ')}
          >
            Settings
          </Link>
          {userName && (
            <div className={styles.userInfo}>
              <span className={styles.userName}>{userName}</span>
            </div>
          )}
        </div>
      </nav>

      {/* Main Workspace */}
      <main className={styles.workspace}>
        {children}
      </main>

      {/* Global Command Palette */}
      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
      />
    </div>
  );
}
