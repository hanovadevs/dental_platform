import React from 'react';
import Link from 'next/link';
import styles from './policy-layout.module.css';

interface PolicyLayoutProps {
  activePolicy: 'privacy' | 'terms' | 'refund' | 'shipping';
  title: string;
  subtitle: string;
  lastUpdated?: string;
  children: React.ReactNode;
}

const POLICY_LINKS = [
  { key: 'privacy', label: 'Privacy Policy', href: '/privacy' },
  { key: 'terms', label: 'Terms & Conditions', href: '/terms' },
  { key: 'refund', label: 'Return & Refund Policy', href: '/refund-policy' },
  { key: 'shipping', label: 'Service Delivery & Shipping', href: '/shipping-policy' },
] as const;

export function PolicyLayout({
  activePolicy,
  title,
  subtitle,
  lastUpdated = 'September 2026',
  children,
}: PolicyLayoutProps) {
  return (
    <div className={styles.pageWrapper}>
      {/* Top Header */}
      <header className={styles.header}>
        <div className={styles.headerContainer}>
          <Link href="/" className={styles.brandLink}>
            <img
              src="/logo.png"
              alt="Dental OS Logo"
              className={styles.logoImg}
            />
            <span className={styles.brandName}>Dental OS</span>
            <span className={styles.brandBadge}>Clinical Platform</span>
          </Link>

          <div className={styles.headerActions}>
            <Link href="/" className={styles.navLinkHome}>
              Overview
            </Link>
            <Link href="/login" className={styles.loginBtn}>
              Clinic Login
            </Link>
            <Link href="/register" className={styles.registerBtn}>
              Register Practice
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Banner */}
      <section className={styles.heroBanner}>
        <div className={styles.heroContainer}>
          <div className={styles.badgeRow}>
            <span className={styles.policyBadge}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              Legal & Compliance
            </span>
            <span className={styles.revisionDate}>Last Revised: {lastUpdated}</span>
          </div>
          <h1 className={styles.heroTitle}>{title}</h1>
          <p className={styles.heroSubtitle}>{subtitle}</p>
        </div>
      </section>

      {/* Main 2-Column Content Area */}
      <main className={styles.mainContainer}>
        {/* Sticky Sidebar Navigation */}
        <aside className={styles.sidebar}>
          <div className={styles.sidebarCard}>
            <h3 className={styles.sidebarTitle}>Compliance Documents</h3>
            <ul className={styles.policyNavList}>
              {POLICY_LINKS.map((link) => {
                const isActive = link.key === activePolicy;
                return (
                  <li key={link.key}>
                    <Link
                      href={link.href}
                      className={`${styles.policyNavLink} ${isActive ? styles.policyNavLinkActive : ''}`}
                    >
                      <span>{link.label}</span>
                      {isActive && (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <polyline points="9 18 15 12 9 6" />
                        </svg>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className={styles.helpCard}>
            <h4 className={styles.helpTitle}>Questions or Inquiries?</h4>
            <p className={styles.helpText}>
              Our compliance and legal desk is available to assist clinics with data protection, gateway receipts, or merchant verification inquiries.
            </p>
            <a href="mailto:support@dentalos.com" className={styles.contactEmail}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
              support@dentalos.com
            </a>
          </div>
        </aside>

        {/* Article Body */}
        <article className={styles.contentCard}>
          <div className={styles.prose}>
            {children}
          </div>
        </article>
      </main>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerContainer}>
          <div className={styles.footerTopRow}>
            <div className={styles.footerBrand}>
              <img
                src="/logo.png"
                alt="Dental OS Logo"
                style={{ width: '24px', height: '24px', objectFit: 'contain' }}
              />
              <span>Dental OS Platform</span>
            </div>

            <ul className={styles.footerLegalLinks}>
              <li>
                <Link href="/privacy" className={styles.footerLegalLink}>
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className={styles.footerLegalLink}>
                  Terms & Conditions
                </Link>
              </li>
              <li>
                <Link href="/refund-policy" className={styles.footerLegalLink}>
                  Return & Refund Policy
                </Link>
              </li>
              <li>
                <Link href="/shipping-policy" className={styles.footerLegalLink}>
                  Service Delivery Policy
                </Link>
              </li>
              <li>
                <Link href="/#contact" className={styles.footerLegalLink}>
                  Practice Contact Desk
                </Link>
              </li>
            </ul>
          </div>

          <div className={styles.footerBottomRow}>
            <div>
              © {new Date().getFullYear()} Dental OS Platform. Built for modern dental clinics and healthcare practices. All rights reserved.
            </div>

            <div className={styles.trustBadges}>
              <span className={styles.trustBadge}>PCI-DSS Tokenized Checkout</span>
              <span className={styles.trustBadge}>State Bank Regulated PayFast Gateway</span>
              <span className={styles.trustBadge}>TLS 1.3 Encryption</span>
              <span className={styles.trustBadge}>HIPAA / GDPR Ready</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
