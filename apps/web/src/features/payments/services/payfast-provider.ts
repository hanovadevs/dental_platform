import crypto from 'crypto';
import { PAYMENT_CONFIG } from '../config/payment-config';
import {
  PaymentProvider,
  CreateCheckoutInput,
  CheckoutSession,
  VerifyPaymentInput,
  VerifiedPayment,
} from '../domain/types';

/**
 * Official Premier PayFast (Pakistan / APPS) Provider Implementation.
 * Adheres strictly to the official hosted checkout specification:
 * 1. Token generation via GetAccessToken
 * 2. Hosted form payload generation for PostTransaction
 * 3. Cryptographic hash validation on transaction return/callback
 */
export class PayFastProvider implements PaymentProvider {
  private merchantId: string;
  private securedKey: string;
  private merchantName: string;
  private storeId: string;

  constructor() {
    this.merchantId = PAYMENT_CONFIG.payfast.merchantId;
    this.securedKey = PAYMENT_CONFIG.payfast.securedKey;
    this.merchantName = PAYMENT_CONFIG.payfast.merchantName;
    this.storeId = PAYMENT_CONFIG.payfast.storeId;
  }

  /**
   * Generates a hosted checkout session with PayFast.
   * Step 1: Request Access Token from PayFast API
   * Step 2: Build PostTransaction form fields
   */
  async createCheckout(input: CreateCheckoutInput): Promise<CheckoutSession> {
    if (!this.merchantId || !this.securedKey) {
      throw new Error(
        'PayFast production credentials are missing. Please configure PAYFAST_MERCHANT_ID and PAYFAST_SECURED_KEY.',
      );
    }

    const basketId = `pf_${input.intentId.replace(/-/g, '').substring(0, 16)}_${Date.now().toString(36)}`;
    const formattedAmount = Number(input.amount).toFixed(2);
    const currency = input.currency || PAYMENT_CONFIG.currency;

    // Step 1: Request Access Token
    const tokenParams = new URLSearchParams({
      MERCHANT_ID: this.merchantId,
      SECURED_KEY: this.securedKey,
      TXNAMT: formattedAmount,
      BASKET_ID: basketId,
      CURRENCY_CODE: currency,
    });

    const tokenUrl = PAYMENT_CONFIG.payfast.accessTokenEndpoint;

    let accessToken = '';
    try {
      const tokenRes = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8',
          'User-Agent': 'DentalOS-PayFast/1.0',
        },
        body: tokenParams.toString(),
      });

      if (!tokenRes.ok) {
        const errText = await tokenRes.text();
        throw new Error(`PayFast token request failed with HTTP status ${tokenRes.status}: ${errText}`);
      }

      const tokenJson = await tokenRes.json();
      accessToken = tokenJson.ACCESS_TOKEN || tokenJson.token || '';

      if (!accessToken) {
        throw new Error(`PayFast response did not include a valid ACCESS_TOKEN: ${JSON.stringify(tokenJson)}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown gateway communication error';
      throw new Error(`Could not initiate payment session with Premier PayFast: ${msg}`);
    }

    // Step 2: Build Form Payload
    const signature = crypto.createHash('sha256').update(basketId).digest('hex');
    const orderDate = new Date().toISOString().replace('T', ' ').substring(0, 19);

    const formFields: Record<string, string> = {
      MERCHANT_ID: this.merchantId,
      MERCHANT_NAME: this.merchantName,
      TOKEN: accessToken,
      PROCCODE: '00',
      TXNAMT: formattedAmount,
      CUSTOMER_MOBILE_NO: input.customerPhone.replace(/[^0-9+]/g, ''),
      CUSTOMER_EMAIL_ADDRESS: input.customerEmail.trim(),
      SIGNATURE: signature,
      PLUGIN_VERSION: PAYMENT_CONFIG.payfast.pluginVersion,
      TXNDESC: input.description || 'Dental OS Clinic Registration',
      SUCCESS_URL: input.returnUrl,
      FAILURE_URL: input.returnUrl,
      CHECKOUT_URL: input.returnUrl,
      BASKET_ID: basketId,
      ORDER_DATE: orderDate,
      TRAN_TYPE: 'ECOMM_PURCHASE',
      STORE_ID: this.storeId,
      CURRENCY_CODE: currency,
    };

    return {
      provider: 'payfast',
      providerReference: basketId,
      actionUrl: PAYMENT_CONFIG.payfast.postTransactionEndpoint,
      formFields,
    };
  }

  /**
   * Cryptographically verifies payment return or callback notification.
   * Expected hash formula: sha256("${basketId}|${securedKey}|${merchantId}|${errCode}")
   */
  async verifyPayment(input: VerifyPaymentInput): Promise<VerifiedPayment> {
    const raw = input.rawPayload;

    const basketId = String(raw.basket_id || raw.BASKET_ID || '').trim();
    const errCode = String(raw.err_code || raw.ERR_CODE || '').trim();
    const errMsg = String(raw.err_msg || raw.ERR_MSG || 'Transaction processed').trim();
    const transactionId = String(raw.transaction_id || raw.TRANSACTION_ID || '').trim();
    const validationHash = String(raw.validation_hash || raw.VALIDATION_HASH || '').trim().toLowerCase();

    if (!basketId) {
      return {
        isValid: false,
        isPaid: false,
        basketId: '',
        statusCode: errCode || 'MISSING_BASKET_ID',
        statusMessage: 'Missing transaction basket identifier',
        rawPayload: raw,
        errorMessage: 'Invalid payment response payload: missing basket identifier',
      };
    }

    if (!this.securedKey || !this.merchantId) {
      return {
        isValid: false,
        isPaid: false,
        basketId,
        transactionId,
        statusCode: errCode,
        statusMessage: errMsg,
        rawPayload: raw,
        errorMessage: 'Gateway credentials unconfigured on server',
      };
    }

    // Compute expected SHA-256 validation hash
    const hashString = `${basketId}|${this.securedKey}|${this.merchantId}|${errCode}`;
    const expectedHash = crypto.createHash('sha256').update(hashString).digest('hex').toLowerCase();

    // Constant-time comparison to prevent timing attacks
    let hashMatches = false;
    try {
      if (validationHash && expectedHash.length === validationHash.length) {
        hashMatches = crypto.timingSafeEqual(
          Buffer.from(expectedHash, 'utf8'),
          Buffer.from(validationHash, 'utf8'),
        );
      }
    } catch {
      hashMatches = false;
    }

    if (!hashMatches) {
      return {
        isValid: false,
        isPaid: false,
        basketId,
        transactionId,
        statusCode: errCode,
        statusMessage: errMsg,
        rawPayload: raw,
        errorMessage: 'Cryptographic validation hash mismatch. Potential tampering detected.',
      };
    }

    // PayFast code '000' or '00' denotes approved payment
    const isPaid = (errCode === '000' || errCode === '00');

    return {
      isValid: true,
      isPaid,
      basketId,
      transactionId: transactionId || undefined,
      statusCode: errCode,
      statusMessage: errMsg,
      rawPayload: raw,
    };
  }
}
