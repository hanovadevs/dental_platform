/**
 * Centralized Payment & Gateway Configuration.
 * Premier PayFast (Pakistan) official production configuration.
 */

export const PAYMENT_CONFIG = {
  currency: 'PKR' as const,
  // Centralized registration fee in PKR (configurable for real-payment verification, easy to adjust later)
  registrationFeePkr: process.env.REGISTRATION_FEE_PKR || process.env.NEXT_PUBLIC_REGISTRATION_FEE_PKR || '50.00',

  payfast: {
    mode: (process.env.PAYFAST_MODE || 'production') as 'sandbox' | 'production',
    merchantId: process.env.PAYFAST_MERCHANT_ID || '',
    securedKey: process.env.PAYFAST_SECURED_KEY || '',
    merchantName: process.env.PAYFAST_MERCHANT_NAME || 'Dental OS',
    storeId: process.env.PAYFAST_STORE_ID || '',
    pluginVersion: 'PAYFAST-DENTALOS-1.0',

    baseUrl: {
      sandbox: process.env.PAYFAST_SANDBOX_BASE_URL || 'https://ipguat.apps.net.pk',
      production: process.env.PAYFAST_PRODUCTION_BASE_URL || 'https://ipg1.apps.net.pk',
    },

    get activeBaseUrl(): string {
      return this.mode === 'sandbox' ? this.baseUrl.sandbox : this.baseUrl.production;
    },

    get accessTokenEndpoint(): string {
      return `${this.activeBaseUrl}/Ecommerce/api/Transaction/GetAccessToken`;
    },

    get postTransactionEndpoint(): string {
      return `${this.activeBaseUrl}/Ecommerce/api/Transaction/PostTransaction`;
    },
  },

  getAppUrl(): string {
    const url = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
    return url.replace(/\/$/, '');
  },

  getPayFastCallbackUrl(): string {
    return `${this.getAppUrl()}/api/payments/payfast/callback`;
  },
};
