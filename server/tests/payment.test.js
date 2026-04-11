/**
 * Payment cycle tests.
 *
 * POST /api/v1/machine/pay    — insert money (credit)
 * POST /api/v1/machine/refund — return all credit
 */

const { resetAndConfigure, pay, refund, getStatus, buy, delay, DISPENSE_SETTLE_MS } = require('./helpers');

beforeEach(() => resetAndConfigure());

describe('POST /api/v1/machine/pay', () => {
    test('returns success and updated balance', async () => {
        const res = await pay(2.50);
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.balance).toBe(2.50);
    });

    test('accumulates multiple payments', async () => {
        await pay(1.00);
        await pay(1.50);
        const res = await pay(0.50);
        expect(res.body.balance).toBe(3.00);
    });

    test('handles floating point correctly (no precision errors)', async () => {
        await pay(0.10);
        await pay(0.20);
        const res = await getStatus();
        expect(res.body.balance).toBe(0.30); // should be exactly 0.30, not 0.30000000000000004
    });

    test('amount=0 → 400', async () => {
        const res = await pay(0);
        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('error');
    });

    test('negative amount → 400', async () => {
        const res = await pay(-5);
        expect(res.status).toBe(400);
    });

    test('missing amount → 400', async () => {
        const { request, app } = require('./helpers');
        const res = await request(app).post('/api/v1/machine/pay').send({});
        expect(res.status).toBe(400);
    });
});

describe('POST /api/v1/machine/refund', () => {
    test('returns the current balance and resets to 0', async () => {
        await pay(3.00);
        const res = await refund();
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.returned).toBe(3.00);
    });

    test('balance is 0 after refund', async () => {
        await pay(2.50);
        await refund();
        const res = await getStatus();
        expect(res.body.balance).toBe(0);
    });

    test('refunding with no credit returns 0', async () => {
        const res = await refund();
        expect(res.body.returned).toBe(0);
        expect(res.body.success).toBe(true);
    });

    test('refund is not possible while machine is VENDING → 503', async () => {
        // Pay enough and start a purchase (machine enters VENDING state)
        await pay(10);

        const { request, app } = require('./helpers');
        await request(app).post('/api/v1/config').send({ dispense_delay_ms: 300 });

        // Fire buy and refund concurrently so refund sees VENDING
        const [, refundRes] = await Promise.all([
            buy('11'),
            refund()
        ]);

        expect(refundRes.status).toBe(503);

        // Let dispense settle before next test
        await delay(400);
    });
});
