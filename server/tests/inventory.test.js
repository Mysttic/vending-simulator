/**
 * Inventory and layout endpoint tests.
 *
 * GET /api/v1/inventory — flat inventory array
 * GET /api/v1/layout    — hierarchical layout with live counts
 * PATCH /api/v1/inventory/:slotId — WMS restock endpoint
 */

const { resetAndConfigure, getInventory, restock, request, app } = require('./helpers');

beforeEach(() => resetAndConfigure());

describe('GET /api/v1/inventory', () => {
    test('returns data array with all 9 slots', async () => {
        const res = await getInventory();
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('data');
        expect(Array.isArray(res.body.data)).toBe(true);
        expect(res.body.data).toHaveLength(9);
    });

    test('each slot has required fields', async () => {
        const res = await getInventory();
        res.body.data.forEach(slot => {
            expect(slot).toHaveProperty('id');
            expect(slot).toHaveProperty('name');
            expect(slot).toHaveProperty('price');
            expect(slot).toHaveProperty('count');
            expect(slot).toHaveProperty('max');
        });
    });

    test('slot 11 (Cola Classic) has correct initial values', async () => {
        const res = await getInventory();
        const cola = res.body.data.find(s => s.id === '11');
        expect(cola).toBeDefined();
        expect(cola.name).toBe('Cola Classic');
        expect(cola.price).toBe(2.50);
        expect(cola.count).toBe(10);
        expect(cola.max).toBe(10);
    });

    test('slot 23 (Pretzels) starts with partial stock', async () => {
        const res = await getInventory();
        const pretzels = res.body.data.find(s => s.id === '23');
        expect(pretzels.count).toBe(5);
        expect(pretzels.max).toBe(8);
    });

    test('slot IDs match machine-layout.json (11-13, 21-23, 31-33)', async () => {
        const res = await getInventory();
        const ids = res.body.data.map(s => s.id);
        ['11', '12', '13', '21', '22', '23', '31', '32', '33'].forEach(id => {
            expect(ids).toContain(id);
        });
    });
});

describe('GET /api/v1/layout', () => {
    test('returns hierarchical layout with rows', async () => {
        const res = await request(app).get('/api/v1/layout');
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('rows');
        expect(Array.isArray(res.body.rows)).toBe(true);
        expect(res.body.rows).toHaveLength(3);
    });

    test('row 1 is type "drink" with height "tall"', async () => {
        const res = await request(app).get('/api/v1/layout');
        const row1 = res.body.rows.find(r => r.id === '1');
        expect(row1.type).toBe('drink');
        expect(row1.height).toBe('tall');
    });

    test('each row contains its slots', async () => {
        const res = await request(app).get('/api/v1/layout');
        res.body.rows.forEach(row => {
            expect(Array.isArray(row.slots)).toBe(true);
            expect(row.slots.length).toBeGreaterThan(0);
        });
    });

    test('layout slots include live count from inventory', async () => {
        // Modify inventory then verify layout reflects it
        await restock('11', 3);

        const res = await request(app).get('/api/v1/layout');
        const row1 = res.body.rows.find(r => r.id === '1');
        const cola = row1.slots.find(s => s.id === '11');
        expect(cola.count).toBe(3);
    });

    test('total slot count across all rows is 9', async () => {
        const res = await request(app).get('/api/v1/layout');
        const totalSlots = res.body.rows.reduce((sum, row) => sum + row.slots.length, 0);
        expect(totalSlots).toBe(9);
    });
});

describe('PATCH /api/v1/inventory/:slotId — restock', () => {
    test('sets slot count to specified value', async () => {
        const res = await restock('11', 3);
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.slot.count).toBe(3);
    });

    test('restock without count fills to max capacity', async () => {
        await restock('11', 2); // Deplete first
        const res = await restock('11');
        expect(res.body.slot.count).toBe(res.body.slot.max);
    });

    test('restocked count is reflected in GET /inventory', async () => {
        await restock('21', 1);
        const res = await getInventory();
        const chips = res.body.data.find(s => s.id === '21');
        expect(chips.count).toBe(1);
    });

    test('can set count to 0 (empty slot)', async () => {
        const res = await restock('11', 0);
        expect(res.body.slot.count).toBe(0);
    });

    test('unknown slot ID → 404', async () => {
        const res = await restock('99', 5);
        expect(res.status).toBe(404);
        expect(res.body).toHaveProperty('error');
    });
});
