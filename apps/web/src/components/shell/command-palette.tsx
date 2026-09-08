'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import styles from './command-palette.module.css';

interface CommandItem {
  id: string;
  title: string;
  category: 'Navigation' | 'Actions';
  shortcut?: string;
  perform: () => void;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const commands: CommandItem[] = useMemo(
    () => [
      // Navigation
      {
        id: 'nav-home',
        title: 'Go to Home',
        category: 'Navigation',
        perform: () => router.push('/'),
      },
      {
        id: 'nav-calendar',
        title: 'Go to Calendar',
        category: 'Navigation',
        perform: () => router.push('/calendar'),
      },
      {
        id: 'nav-patients',
        title: 'Go to Patients',
        category: 'Navigation',
        perform: () => router.push('/patients'),
      },
      {
        id: 'nav-treatments',
        title: 'Go to Treatments',
        category: 'Navigation',
        perform: () => router.push('/treatments'),
      },
      {
        id: 'nav-revenue',
        title: 'Go to Revenue Opportunities',
        category: 'Navigation',
        perform: () => router.push('/revenue'),
      },
      {
        id: 'nav-billing',
        title: 'Go to Billing',
        category: 'Navigation',
        perform: () => router.push('/billing'),
      },
      {
        id: 'nav-operations',
        title: 'Go to Operations (Staff & Clinic Workflows)',
        category: 'Navigation',
        perform: () => router.push('/operations'),
      },
      {
        id: 'nav-inventory',
        title: 'Go to Inventory & Supply Tracking',
        category: 'Navigation',
        perform: () => router.push('/operations?tab=inventory'),
      },
      {
        id: 'nav-labs',
        title: 'Go to Dental Lab Cases & Vendors',
        category: 'Navigation',
        perform: () => router.push('/operations?tab=labs'),
      },
      {
        id: 'nav-templates',
        title: 'Go to Clinical Medication & Consent Templates',
        category: 'Navigation',
        perform: () => router.push('/operations?tab=templates'),
      },
      {
        id: 'nav-reports',
        title: 'Go to Executive Reports & Analytics',
        category: 'Navigation',
        perform: () => router.push('/reports'),
      },
      {
        id: 'nav-communications',
        title: 'Go to Communications & Messaging',
        category: 'Navigation',
        perform: () => router.push('/communications'),
      },
      {
        id: 'nav-settings',
        title: 'Go to Settings',
        category: 'Navigation',
        perform: () => router.push('/settings'),
      },
      // Actions
      {
        id: 'act-new-clinic',
        title: 'Create or switch clinic location',
        category: 'Actions',
        perform: () => router.push('/settings'),
      },
      {
        id: 'act-onboarding',
        title: 'Clinic Setup / Onboarding Flow',
        category: 'Actions',
        perform: () => router.push('/onboarding'),
      },
    ],
    [router]
  );

  const filteredCommands = useMemo(() => {
    if (!query.trim()) return commands;
    const q = query.toLowerCase().trim();
    return commands.filter(
      (c) =>
        c.title.toLowerCase().includes(q) || c.category.toLowerCase().includes(q)
    );
  }, [commands, query]);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        setQuery('');
        setSelectedIndex(0);
        inputRef.current?.focus();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [open]);

  // Keyboard navigation within the palette
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < filteredCommands.length - 1 ? prev + 1 : 0
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev > 0 ? prev - 1 : filteredCommands.length - 1
        );
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          filteredCommands[selectedIndex].perform();
          onClose();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    },
    [filteredCommands, selectedIndex, onClose]
  );

  if (!open) return null;

  return (
    <div className={styles.backdrop} onClick={onClose} role="presentation">
      <div
        className={styles.palette}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
      >
        <div className={styles.searchBar}>
          <span className={styles.searchIcon} aria-hidden="true">
            🔍
          </span>
          <input
            ref={inputRef}
            type="text"
            className={styles.input}
            placeholder="Type a command or search..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
          />
          <kbd className={styles.kbd}>ESC</kbd>
        </div>

        <div className={styles.list} role="listbox">
          {filteredCommands.length === 0 ? (
            <div className={styles.empty}>No matching commands found</div>
          ) : (
            filteredCommands.map((command, idx) => (
              <div
                key={command.id}
                className={[
                  styles.item,
                  idx === selectedIndex ? styles.itemActive : '',
                ].join(' ')}
                role="option"
                aria-selected={idx === selectedIndex}
                onClick={() => {
                  command.perform();
                  onClose();
                }}
                onMouseEnter={() => setSelectedIndex(idx)}
              >
                <div className={styles.itemContent}>
                  <span className={styles.itemTitle}>{command.title}</span>
                  <span className={styles.itemCategory}>
                    {command.category}
                  </span>
                </div>
                {idx === selectedIndex && (
                  <span className={styles.enterBadge}>↵ Jump</span>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
