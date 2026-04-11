/**
 * Status and configuration endpoint tests.
 *
 * GET  /api/v1/status — machine status, balance, config
 * POST /api/v1/config — update fail_rate, webhook, dispense_delay_ms
 */

const { resetAndConfigure, getStatus, pay, refund, request, app } = require('./helpers');

beforeEach(() => resetAndConfigure());

describe('GET /api/v1/status', () => {
    test('returns 200 with expected fields', async () => {
        const res = await getStatus();
        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({
            machine_id: expect.any(String),
            status: expect.any(String),
            balance: expect.any(Number),
            fail_rate: expect.any(Number),
            webhook_configured: expect.any(Boolean)
        });
    });

    test('initial status is IDLE', async () => {
        const res = await getStatus();
        expect(res.body.status).toBe('IDLE');
    });

    test('initial balance is 0', async () => {
        const res = await getStatus();
        expect(res.body.balance).toBe(0);
    });

    test('balance reflects inserted money', async () => {
        await pay(2.50);
        const res = await getStatus();
        expect(res.body.balance).toBe(2.50);
    });

    test('webhook_configured is false when no URL is set', async () => {
        const res = await getStatus();
        expect(res.body.webhook_configured).toBe(false);
    });

    test('machine_id is VM-SIM-001', async () => {
        const res = await getStatus();
        expect(res.body.machine_id).toBe('VM-SIM-001');
    });
});

describe('POST /api/v1/config', () => {
    test('returns success response', async () => {
        const res = await request(app).post('/api/v1/config').send({ fail_rate: 0 });
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
    });

    test('updates fail_rate — reflected in status', async () => {
        await request(app).post('/api/v1/config').send({ fail_rate: 0.42 });
        const res = await getStatus();
        expect(res.body.fail_rate).toBe(0.42);
    });

    test('fail_rate=0 disables random jams', async () => {
        // Already set to 0 by resetAndConfigure — verify it's reflected
        const res = await getStatus();
        expect(res.body.fail_rate).toBe(0);
    });

    test('empty body returns success without error', async () => {
        const res = await request(app).post('/api/v1/config').send({});
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
    });
});

describe('POST /api/v1/machine/reset', () => {
    test('returns success response', async () => {
        const res = await request(app).post('/api/v1/machine/reset');
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
    });

    test('resets balance to 0', async () => {
        await pay(5.00);
        await request(app).post('/api/v1/machine/reset');
        const res = await getStatus();
        expect(res.body.balance).toBe(0);
    });

    test('resets status to IDLE', async () => {
        await request(app).post('/api/v1/machine/reset');
        const res = await getStatus();
        expect(res.body.status).toBe('IDLE');
    });

    test('resets inventory to initial counts', async () => {
        const { getSlot } = require('./helpers');
        await request(app).patch('/api/v1/inventory/11').send({ count: 1 });
        await request(app).post('/api/v1/machine/reset');
        const slot = await getSlot('11');
        expect(slot.count).toBe(10); // initial_count from machine-layout.json
    });
});
