/**
 * End-to-end flow tests.
 *
 * Tests complete user journeys: pay → buy → verify state,
 * including change handling, restock cycles, and edge cases.
 */

const {
    resetAndConfigure, pay, buy, buyAndSettle, refund,
    restock, getInventory, getStatus, getSlot,
    delay, DISPENSE_SETTLE_MS, request, app
} = require('./helpers');

beforeEach(() => resetAndConfigure());

describe('Standard purchase flow', () => {
    test('pay → buy → verify inventory and balance', async () => {
        // Insert money
        await pay(5.00);

        const statusBefore = await getStatus();
        expect(statusBefore.body.balance).toBe(5.00);

        // Purchase Cola Classic ($2.50)
        const buyRes = await buy('11');
        expect(buyRes.body.status).toBe('PROCESSING');
        await delay(DISPENSE_SETTLE_MS);

        // Verify effects
        const statusAfter = await getStatus();
        expect(statusAfter.body.balance).toBe(2.50);
        expect(statusAfter.body.status).toBe('IDLE');

        const slot = await getSlot('11');
        expect(slot.count).toBe(9); // was 10, now 9
    });

    test('pay → buy → refund change', async () => {
        await pay(5.00);
        await buyAndSettle('12'); // Sprite $2.50

        const refundRes = await refund();
        expect(refundRes.body.returned).toBe(2.50);

        const statusRes = await getStatus();
        expect(statusRes.body.balance).toBe(0);
    });

    test('pay exact amount → buy → balance is 0, no change', async () => {
        await pay(1.80);
        await buyAndSettle('21'); // Chips $1.80

        const statusRes = await getStatus();
        expect(statusRes.body.balance).toBe(0);
    });
});

describe('Multi-purchase session', () => {
    test('buy multiple items, then refund remaining balance', async () => {
        await pay(10.00);

        await buyAndSettle('13'); // Water $1.50
        await buyAndSettle('21'); // Chips $1.80
        await buyAndSettle('31'); // Chocolate $2.00

        // Spent: 1.50 + 1.80 + 2.00 = 5.30
        // Remaining: 10.00 - 5.30 = 4.70
        const statusRes = await getStatus();
        expect(statusRes.body.balance).toBe(4.70);

        const refundRes = await refund();
        expect(refundRes.body.returned).toBe(4.70);
    });

    test('buy all stock from a slot then get out-of-stock error', async () => {
        await restock('11', 2); // only 2 left
        await pay(10.00);

        await buyAndSettle('11'); // count → 1
        await buyAndSettle('11'); // count → 0

        const res = await buy('11');
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/stock/i);
    });
});

describe('WMS restock workflow', () => {
    test('restock an empty slot then sell from it', async () => {
        await restock('11', 0); // empty slot
        await pay(5.00);

        const emptyBuy = await buy('11');
        expect(emptyBuy.status).toBe(400);

        // WMS restocks
        await restock('11', 10);

        // Now purchase works
        const buyRes = await buy('11');
        expect(buyRes.body.status).toBe('PROCESSING');

        await delay(DISPENSE_SETTLE_MS);
        const slot = await getSlot('11');
        expect(slot.count).toBe(9);
    });

    test('partial restock (below max) is reflected correctly', async () => {
        await restock('33', 3); // Protein Bar, max=20
        const res = await getInventory();
        const proteinBar = res.body.data.find(s => s.id === '33');
        expect(proteinBar.count).toBe(3);
        expect(proteinBar.max).toBe(20);
    });
});

describe('Failure recovery flow', () => {
    test('after jam: balance refunded, machine back to IDLE, can buy again', async () => {
        await request(app).post('/api/v1/config').send({ fail_rate: 1, dispense_delay_ms: 50 });
        await pay(5.00);

        // First attempt jams
        await buyAndSettle('11');

        // Balance should be refunded
        let statusRes = await getStatus();
        expect(statusRes.body.balance).toBe(5.00);
        expect(statusRes.body.status).toBe('IDLE');

        // Restore normal fail rate and buy successfully
        await request(app).post('/api/v1/config').send({ fail_rate: 0 });
        await buyAndSettle('11');

        statusRes = await getStatus();
        expect(statusRes.body.balance).toBe(2.50); // 5.00 - 2.50
        const slot = await getSlot('11');
        expect(slot.count).toBe(9);
    });
});

describe('Health check', () => {
    test('GET /health returns 200 OK', async () => {
        const res = await request(app).get('/health');
        expect(res.status).toBe(200);
        expect(res.text).toBe('OK');
    });
});
