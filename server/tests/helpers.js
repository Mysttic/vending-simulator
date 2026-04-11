/**
 * Test helpers — shared utilities for vending machine integration tests.
 *
 * Machine layout reference (machine-layout.json):
 *   Row 1 — drinks (tall):
 *     slot 11: Cola Classic  $2.50  capacity=10  initial=10
 *     slot 12: Sprite        $2.50  capacity=10  initial=8
 *     slot 13: Water         $1.50  capacity=15  initial=15
 *   Row 2 — snacks (standard):
 *     slot 21: Chips         $1.80  capacity=8   initial=7
 *     slot 22: Nachos        $2.00  capacity=8   initial=8
 *     slot 23: Pretzels      $1.80  capacity=8   initial=5
 *   Row 3 — candy (standard):
 *     slot 31: Chocolate     $2.00  capacity=20  initial=15
 *     slot 32: Gummy Bears   $2.20  capacity=15  initial=12
 *     slot 33: Protein Bar   $3.50  capacity=20  initial=6
 */

const request = require('supertest');
const app = require('../index');

// Time to wait after POST /machine/buy for the async dispense to complete.
// Must be larger than DISPENSE_DELAY_MS used in resetAndConfigure.
const DISPENSE_SETTLE_MS = 200;

/** Reset all machine state and configure for fast, deterministic tests. */
async function resetAndConfigure() {
    await request(app).post('/api/v1/machine/reset');
    await request(app).post('/api/v1/config').send({
        fail_rate: 0,
        dispense_delay_ms: 50
    });
}

/** Pause execution for ms milliseconds. */
function delay(ms) {
    return new Promise(r => setTimeout(r, ms));
}

/** Insert money into the machine. */
function pay(amount) {
    return request(app).post('/api/v1/machine/pay').send({ amount });
}

/** Purchase an item by slot ID. Returns immediately (PROCESSING). */
function buy(slotId) {
    return request(app).post('/api/v1/machine/buy').send({ slotId });
}

/** Purchase and wait for async dispense to complete. */
async function buyAndSettle(slotId) {
    const res = await buy(slotId);
    await delay(DISPENSE_SETTLE_MS);
    return res;
}

/** Return current balance (refund). */
function refund() {
    return request(app).post('/api/v1/machine/refund');
}

/** Restock a slot. Omit count to fill to max capacity. */
function restock(slotId, count) {
    const body = count !== undefined ? { count } : {};
    return request(app).patch(`/api/v1/inventory/${slotId}`).send(body);
}

/** Get the live inventory array. */
function getInventory() {
    return request(app).get('/api/v1/inventory');
}

/** Get the machine status (status, balance, fail_rate). */
function getStatus() {
    return request(app).get('/api/v1/status');
}

/** Get a single slot from live inventory by slot ID. */
async function getSlot(slotId) {
    const res = await getInventory();
    return res.body.data.find(s => s.id === slotId);
}

module.exports = {
    app,
    request,
    DISPENSE_SETTLE_MS,
    resetAndConfigure,
    delay,
    pay,
    buy,
    buyAndSettle,
    refund,
    restock,
    getInventory,
    getStatus,
    getSlot
};
