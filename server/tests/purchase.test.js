/**
 * Purchase endpoint tests.
 *
 * POST /api/v1/machine/buy — initiate item purchase (async dispense)
 *
 * Key design: the endpoint responds immediately with { status: "PROCESSING" }
 * and completes the dispense asynchronously. Tests that need post-dispense
 * state (inventory count, balance) use buyAndSettle() which waits for async
 * completion. dispense_delay_ms is set to 50ms by resetAndConfigure().
 */

const {
    resetAndConfigure, pay, buy, buyAndSettle,
    refund, restock, getInventory, getStatus, getSlot,
    delay, DISPENSE_SETTLE_MS, request, app
} = require('./helpers');

beforeEach(() => resetAndConfigure());

describe('POST /api/v1/machine/buy — immediate response', () => {
    test('responds immediately with PROCESSING status', async () => {
        await pay(5.00);
        const res = await buy('11');
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.status).toBe('PROCESSING');
        expect(res.body.message).toBeDefined();

        await delay(DISPENSE_SETTLE_MS);
    });

    test('machine enters VENDING state during dispense', async () => {
        await request(app).post('/api/v1/config').send({ dispense_delay_ms: 300 });
        await pay(5.00);

        // Use .end() so supertest sends the request immediately without blocking
        const buyPromise = new Promise((resolve, reject) => {
            request(app)
                .post('/api/v1/machine/buy')
                .send({ slotId: '11' })
                .end((err, res) => { if (err) reject(err); else resolve(res); });
        });

        await delay(50); // wait for the Express handler to reach the async dispense

        const statusRes = await getStatus();
        expect(statusRes.body.status).toBe('VENDING');

        await buyPromise;
        await delay(350); // wait for dispense to finish
    });

    test('machine returns to IDLE after dispense completes', async () => {
        await pay(5.00);
        await buyAndSettle('11');

        const res = await getStatus();
        expect(res.body.status).toBe('IDLE');
    });
});

describe('POST /api/v1/machine/buy — validation errors', () => {
    test('unknown slot → 404', async () => {
        await pay(10.00);
        const res = await buy('99');
        expect(res.status).toBe(404);
        expect(res.body).toHaveProperty('error');
    });

    test('out of stock → 400', async () => {
        await restock('11', 0);
        await pay(10.00);
        const res = await buy('11');
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/stock/i);
    });

    test('insufficient funds → 402 with price info', async () => {
        await pay(0.50); // Cola costs $2.50
        const res = await buy('11');
        expect(res.status).toBe(402);
        expect(res.body).toMatchObject({
            error: expect.stringMatching(/fund/i),
            required: 2.50,
            current: 0.50
        });
    });

    test('insufficient funds does not change balance', async () => {
        await pay(1.00);
        await buy('11'); // $2.50 required
        const res = await getStatus();
        expect(res.body.balance).toBe(1.00);
    });

    test('machine busy → 503 (concurrent requests)', async () => {
        await pay(10.00);

        // Both requests fire simultaneously; one locks the machine, other sees VENDING
        const [res1, res2] = await Promise.all([
            buy('11'),
            buy('12')
        ]);

        const processing = [res1, res2].find(r => r.status === 200 && r.body.status === 'PROCESSING');
        const busy = [res1, res2].find(r => r.status === 503);

        expect(processing).toBeDefined();
        expect(busy).toBeDefined();

        await delay(DISPENSE_SETTLE_MS);
    });
});

describe('POST /api/v1/machine/buy — successful dispense effects', () => {
    test('inventory decrements by 1 after successful purchase', async () => {
        const before = await getSlot('11'); // initial count = 10
        await pay(5.00);
        await buyAndSettle('11');
        const after = await getSlot('11');
        expect(after.count).toBe(before.count - 1);
    });

    test('balance is reduced by item price after purchase', async () => {
        await pay(5.00);
        await buyAndSettle('11'); // Cola $2.50
        const res = await getStatus();
        expect(res.body.balance).toBe(2.50); // 5.00 - 2.50 = 2.50
    });

    test('exact amount purchase leaves balance at 0', async () => {
        await pay(2.50);
        await buyAndSettle('11');
        const res = await getStatus();
        expect(res.body.balance).toBe(0);
    });

    test('can purchase multiple items sequentially', async () => {
        await pay(10.00);
        await buyAndSettle('11'); // Cola $2.50
        await buyAndSettle('12'); // Sprite $2.50
        const res = await getStatus();
        expect(res.body.balance).toBe(5.00); // 10 - 2.50 - 2.50 = 5.00

        const cola = await getSlot('11');
        const sprite = await getSlot('12');
        expect(cola.count).toBe(9);
        expect(sprite.count).toBe(7);
    });
});

describe('POST /api/v1/machine/buy — failure simulation (jam)', () => {
    test('with failRate=1, dispense fails and balance is refunded', async () => {
        await request(app).post('/api/v1/config').send({ fail_rate: 1, dispense_delay_ms: 50 });
        await pay(5.00);
        await buyAndSettle('11');

        const res = await getStatus();
        expect(res.body.balance).toBe(5.00); // full refund
    });

    test('with failRate=1, inventory is NOT decremented on jam', async () => {
        await request(app).post('/api/v1/config').send({ fail_rate: 1, dispense_delay_ms: 50 });
        const before = await getSlot('11');
        await pay(5.00);
        await buyAndSettle('11');
        const after = await getSlot('11');
        expect(after.count).toBe(before.count);
    });

    test('machine returns to IDLE after jam', async () => {
        await request(app).post('/api/v1/config').send({ fail_rate: 1, dispense_delay_ms: 50 });
        await pay(5.00);
        await buyAndSettle('11');
        const res = await getStatus();
        expect(res.body.status).toBe('IDLE');
    });
});

describe('POST /api/v1/machine/buy — low stock trigger', () => {
    test('inventory reaches exactly 2 when expected', async () => {
        await restock('11', 3); // set to 3 so one purchase brings it to 2
        await pay(10.00);
        await buyAndSettle('11');
        const slot = await getSlot('11');
        expect(slot.count).toBe(2);
    });

    test('out-of-stock slot can be restocked and purchased again', async () => {
        await restock('11', 1);
        await pay(10.00);
        await buyAndSettle('11'); // empties slot

        // Restock and buy again
        await restock('11', 5);
        const res = await buy('11');
        expect(res.body.status).toBe('PROCESSING');

        await delay(DISPENSE_SETTLE_MS);
        const slot = await getSlot('11');
        expect(slot.count).toBe(4);
    });
});
