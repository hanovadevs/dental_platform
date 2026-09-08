'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './landing-nav.module.css';

interface LandingNavProps {
  isAuthenticated?: boolean;
}

export function LandingNav({ isAuthenticated }: LandingNavProps) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { label: 'Overview', href: '#overview' },
    { label: 'Modules', href: '#modules' },
    { label: 'Clinical Flow', href: '#charting' },
    { label: 'Live Demo', href: '#showcase' },
    { label: 'FAQ', href: '#faq' },
    { label: 'Contact', href: '#contact' },
  ];

  return (
    <header className={`${styles.header} ${scrolled ? styles.scrolled : ''}`}>
      <div className={styles.container}>
        <Link href="/" className={styles.brand} aria-label="Dental OS Home">
          <img
            src="/logo.png"
            alt="Dental OS Logo"
            className={styles.logoImg}
          />
          <span className={styles.brandTitle}>Dental OS</span>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className={styles.desktopNav} aria-label="Main Navigation">
          <ul className={styles.navLinks}>
            {navLinks.map((link) => (
              <li key={link.href}>
                <a href={link.href} className={styles.navLink}>
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {/* Desktop Action Buttons */}
        <div className={styles.actionGroup}>
          {isAuthenticated ? (
            <Link href="/dashboard" className={styles.primaryBtn}>
              Go to Clinic Dashboard
            </Link>
          ) : (
            <>
              <Link href="/login" className={styles.secondaryLink}>
                Login to Clinic
              </Link>
              <Link href="/register" className={styles.primaryBtn}>
                Register Your Clinic
              </Link>
            </>
          )}

          {/* Mobile Hamburger Button */}
          <button
            type="button"
            className={styles.mobileMenuToggle}
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
          >
            <span className={`${styles.bar} ${mobileMenuOpen ? styles.barOpen1 : ''}`} />
            <span className={`${styles.bar} ${mobileMenuOpen ? styles.barOpen2 : ''}`} />
            <span className={`${styles.bar} ${mobileMenuOpen ? styles.barOpen3 : ''}`} />
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className={styles.mobileMenu}>
          <ul className={styles.mobileNavLinks}>
            {navLinks.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className={styles.mobileNavLink}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
          <div className={styles.mobileActions}>
            {isAuthenticated ? (
              <Link href="/dashboard" className={styles.primaryBtn} onClick={() => setMobileMenuOpen(false)}>
                Go to Clinic Dashboard
              </Link>
            ) : (
              <>
                <Link href="/login" className={styles.secondaryLinkMobile} onClick={() => setMobileMenuOpen(false)}>
                  Login to Clinic
                </Link>
                <Link href="/register" className={styles.primaryBtn} onClick={() => setMobileMenuOpen(false)}>
                  Register Your Clinic
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
