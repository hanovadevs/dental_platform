import { describe, it, expect, vi, beforeEach } from 'vitest';
import crypto from 'crypto';
import { PayFastProvider } from '../services/payfast-provider';
import { PaymentVerificationService } from '../services/payment-verification-service';
import { PAYMENT_CONFIG } from '../config/payment-config';

describe('Premier PayFast Integration', () => {
  const mockMerchantId = '100999';
  const mockSecuredKey = 'mock_secret_key_12345';

  beforeEach(() => {
    PAYMENT_CONFIG.payfast.merchantId = mockMerchantId;
    PAYMENT_CONFIG.payfast.securedKey = mockSecuredKey;
    PAYMENT_CONFIG.payfast.merchantName = 'Dental OS Clinic';
    PAYMENT_CONFIG.payfast.mode = 'sandbox';
  });

  describe('PayFastProvider - verifyPayment', () => {
    it('successfully validates authentic callback with code 000', async () => {
      const provider = new PayFastProvider();
      const basketId = 'pf_intent_abc123_test';
      const errCode = '000';
      const errMsg = 'Transaction Successful';
      const transactionId = 'TXN_998877';

      // Compute expected validation hash: sha256("${basketId}|${securedKey}|${merchantId}|${errCode}")
      const expectedHash = crypto
        .createHash('sha256')
        .update(`${basketId}|${mockSecuredKey}|${mockMerchantId}|${errCode}`)
        .digest('hex');

      const result = await provider.verifyPayment({
        rawPayload: {
          basket_id: basketId,
          err_code: errCode,
          err_msg: errMsg,
          transaction_id: transactionId,
          validation_hash: expectedHash,
        },
      });

      expect(result.isValid).toBe(true);
      expect(result.isPaid).toBe(true);
      expect(result.basketId).toBe(basketId);
      expect(result.transactionId).toBe(transactionId);
      expect(result.statusCode).toBe('000');
    });

    it('rejects tampered or fraudulent callback with invalid validation hash', async () => {
      const provider = new PayFastProvider();
      const basketId = 'pf_intent_abc123_test';
      const errCode = '000';
      const fakeHash = 'fake_tampered_hash_that_does_not_match';

      const result = await provider.verifyPayment({
        rawPayload: {
          basket_id: basketId,
          err_code: errCode,
          validation_hash: fakeHash,
        },
      });

      expect(result.isValid).toBe(false);
      expect(result.isPaid).toBe(false);
      expect(result.errorMessage).toContain('Cryptographic validation hash mismatch');
    });

    it('recognizes failed transaction code even if hash is valid', async () => {
      const provider = new PayFastProvider();
      const basketId = 'pf_intent_failed_999';
      const errCode = '101'; // Declined / Insufficient funds
      const errMsg = 'Insufficient Funds';

      const validHash = crypto
        .createHash('sha256')
        .update(`${basketId}|${mockSecuredKey}|${mockMerchantId}|${errCode}`)
        .digest('hex');

      const result = await provider.verifyPayment({
        rawPayload: {
          basket_id: basketId,
          err_code: errCode,
          err_msg: errMsg,
          validation_hash: validHash,
        },
      });

      expect(result.isValid).toBe(true);
      expect(result.isPaid).toBe(false); // Valid signature, but transaction was not approved
      expect(result.statusCode).toBe('101');
      expect(result.statusMessage).toBe(errMsg);
    });

    it('handles uppercase parameter variants returned by gateway', async () => {
      const provider = new PayFastProvider();
      const basketId = 'pf_intent_upper_test';
      const errCode = '000';

      const validHash = crypto
        .createHash('sha256')
        .update(`${basketId}|${mockSecuredKey}|${mockMerchantId}|${errCode}`)
        .digest('hex');

      const result = await provider.verifyPayment({
        rawPayload: {
          BASKET_ID: basketId,
          ERR_CODE: errCode,
          VALIDATION_HASH: validHash,
          TRANSACTION_ID: 'TXN_UPPER_1',
        },
      });

      expect(result.isValid).toBe(true);
      expect(result.isPaid).toBe(true);
      expect(result.basketId).toBe(basketId);
      expect(result.transactionId).toBe('TXN_UPPER_1');
    });
  });

  describe('PaymentVerificationService', () => {
    it('delegates verification to provider and returns typed result', async () => {
      const verificationService = new PaymentVerificationService();
      const basketId = 'pf_verify_svc_test';
      const errCode = '000';
      const validHash = crypto
        .createHash('sha256')
        .update(`${basketId}|${mockSecuredKey}|${mockMerchantId}|${errCode}`)
        .digest('hex');

      const res = await verificationService.verifyIncomingCallback({
        rawPayload: {
          basket_id: basketId,
          err_code: errCode,
          validation_hash: validHash,
        },
      });

      expect(res.isValid).toBe(true);
      expect(res.isPaid).toBe(true);
    });
  });

  describe('PayFastProvider - createCheckout', () => {
    it('fetches access token and constructs official PostTransaction form payload', async () => {
      const provider = new PayFastProvider();

      // Mock fetch for GetAccessToken
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ ACCESS_TOKEN: 'test_payfast_token_xyz_987' }),
      } as any);

      const session = await provider.createCheckout({
        intentId: 'd0000000-0000-0000-0000-000000000001',
        userId: 'u0000000-0000-0000-0000-000000000001',
        amount: '50.00',
        currency: 'PKR',
        customerName: 'Shifa Dental Care',
        customerEmail: 'doctor@shifadental.com',
        customerPhone: '03001234567',
        description: 'Dental OS Clinic Registration',
        returnUrl: 'http://localhost:3000/api/payments/payfast/callback',
      });

      expect(session.provider).toBe('payfast');
      expect(session.actionUrl).toContain('/Ecommerce/api/Transaction/PostTransaction');
      expect(session.formFields.TOKEN).toBe('test_payfast_token_xyz_987');
      expect(session.formFields.MERCHANT_ID).toBe(mockMerchantId);
      expect(session.formFields.MERCHANT_NAME).toBe('Dental OS Clinic');
      expect(session.formFields.TXNAMT).toBe('50.00');
      expect(session.formFields.CURRENCY_CODE).toBe('PKR');
      expect(session.formFields.PROCCODE).toBe('00');
      expect(session.formFields.CUSTOMER_MOBILE_NO).toBe('03001234567');
      expect(session.formFields.CUSTOMER_EMAIL_ADDRESS).toBe('doctor@shifadental.com');
      expect(session.formFields.SIGNATURE).toBeDefined();
    });
  });
});
