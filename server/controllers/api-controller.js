const layoutConfig = require('../config/machine-layout.json');
const defaultInventory = require('../config/default-inventory');

// ... (existing imports)

const getLayout = (req, res) => {
    // Merge static layout with dynamic inventory counts
    const dynamicLayout = {
        ...layoutConfig,
        rows: layoutConfig.rows.map(row => ({
            ...row,
            slots: row.slots.map(slot => {
                const liveItem = inventory.find(i => i.id === slot.id);
                return {
                    ...slot,
                    // Use live count if available, otherwise fallback (should match)
                    count: liveItem ? liveItem.count : 0
                };
            })
        }))
    };
    res.json(dynamicLayout);
};
const eventBus = require('../services/event-bus');
const webhookClient = require('../services/webhook-client');

// In-memory state
let inventory = JSON.parse(JSON.stringify(defaultInventory));
let balance = 0.00;
let machineStatus = "IDLE"; // IDLE, VENDING, ERROR
let failRate = 0.05; // 5% jam chance

// Initialize Webhook Client listeners
// Updated events
eventBus.on('DISPENSE_SUCCESS', (data) => webhookClient.sendEvent('DISPENSE_SUCCESS', data));
eventBus.on('DISPENSE_FAILURE', (data) => webhookClient.sendEvent('DISPENSE_FAILURE', data));
eventBus.on('LOW_STOCK', (data) => webhookClient.sendEvent('LOW_STOCK', data));

const getInventory = (req, res) => {
    res.json({ data: inventory });
};

const getStatus = (req, res) => {
    res.json({
        machine_id: "VM-SIM-001",
        status: machineStatus,
        balance: balance,
        fail_rate: failRate,
        webhook_configured: !!webhookClient.config.url
    });
};

const updateConfiguration = (req, res) => {
    const { webhook_url, api_key, fail_rate } = req.body;

    if (webhook_url) webhookClient.updateConfig(webhook_url, api_key);
    if (fail_rate !== undefined) failRate = parseFloat(fail_rate);

    res.json({ success: true, message: "Configuration updated" });
};

const insertMoney = (req, res) => {
    const { amount } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ error: "Invalid amount" });

    balance += parseFloat(amount);
    // Fix js float issues
    balance = parseFloat(balance.toFixed(2));

    res.json({ success: true, balance });
};

const simulateDispenseProcess = (slot, transactionId) => {
    return new Promise((resolve) => {
        // Simulate motor mechanics delay (3-5s)
        const delay = 3000 + Math.random() * 2000;

        setTimeout(() => {
            // Check for simulated failure
            const isJam = Math.random() < failRate;

            if (isJam) {
                resolve({ success: false, reason: "JAMMED" });
            } else {
                resolve({ success: true });
            }
        }, delay);
    });
};

const purchaseItem = async (req, res) => {
    const { slotId } = req.body;

    if (machineStatus !== 'IDLE') {
        return res.status(503).json({ error: "Machine is busy", status: machineStatus });
    }

    const slotIndex = inventory.findIndex(s => s.id === slotId);
    if (slotIndex === -1) return res.status(404).json({ error: "Slot not found" });

    const slot = inventory[slotIndex];
    if (slot.count <= 0) return res.status(400).json({ error: "Out of stock" });
    if (balance < slot.price) return res.status(402).json({ error: "Insufficient funds", required: slot.price, current: balance });

    // Start Transaction
    machineStatus = "VENDING";

    // Deduct Balance Immediately (Escrow)
    balance -= slot.price;
    balance = parseFloat(balance.toFixed(2));

    // Respond immediately saying we started
    res.json({
        success: true,
        status: "PROCESSING",
        message: "Dispensing...",
        estimated_time_ms: 4000
    });

    // Async Logic
    try {
        const result = await simulateDispenseProcess(slot);

        if (result.success) {
            // Finalize Sale (Stock deduction)
            slot.count--;

            const transaction = {
                id: Date.now().toString(),
                slotId: slot.id,
                productId: slot.name,
                price: slot.price,
                timestamp: new Date().toISOString()
            };

            eventBus.emit('DISPENSE_SUCCESS', { ...transaction, remaining_stock: slot.count });

            if (slot.count <= 2) {
                eventBus.emit('LOW_STOCK', { slotId: slot.id, count: slot.count });
            }
        } else {
            // Handle Failure: REFUND ESCROW
            balance += slot.price;
            balance = parseFloat(balance.toFixed(2));

            eventBus.emit('DISPENSE_FAILURE', {
                slotId: slot.id,
                productId: slot.name,
                reason: result.reason,
                timestamp: new Date().toISOString()
            });
        }
    } catch (error) {
        console.error("Dispense Error", error);
        // Safety Refund
        balance += slot.price;
        balance = parseFloat(balance.toFixed(2));
    } finally {
        machineStatus = "IDLE";
    }
};

const returnChange = (req, res) => {
    if (machineStatus !== 'IDLE') return res.status(503).json({ error: "Machine busy" });
    const change = balance;
    balance = 0;
    res.json({ success: true, returned: change });
};

const restockSlot = (req, res) => {
    const { slotId } = req.params;
    const { count } = req.body;

    const slot = inventory.find(s => s.id === slotId);
    if (!slot) return res.status(404).json({ error: "Slot not found" });

    slot.count = count !== undefined ? count : slot.max;
    webhookClient.sendEvent('RESTOCK', { slotId: slot.id, count: slot.count });

    res.json({ success: true, slot });
};

module.exports = {
    getLayout,
    getInventory,
    getStatus,
    updateConfiguration,
    insertMoney,
    purchaseItem,
    returnChange,
    restockSlot
};
