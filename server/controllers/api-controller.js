const defaultInventory = require('../config/default-inventory');
const eventBus = require('../services/event-bus');
const webhookClient = require('../services/webhook-client');

// In-memory state
let inventory = JSON.parse(JSON.stringify(defaultInventory));
let balance = 0.00;
let machineStatus = "IDLE"; // IDLE, VENDING, ERROR
let transactions = [];

// Initialize Webhook Client listeners
eventBus.on('SALE', (data) => webhookClient.sendEvent('SALE', data));
eventBus.on('LOW_STOCK', (data) => webhookClient.sendEvent('LOW_STOCK', data));
eventBus.on('ERROR', (data) => webhookClient.sendEvent('MACHINE_ERROR', data));

const getInventory = (req, res) => {
    res.json({ data: inventory });
};

const getStatus = (req, res) => {
    res.json({
        machine_id: "VM-SIM-001",
        status: machineStatus,
        balance: balance,
        door_open: false, // Simulating closed door
        webhook_configured: !!webhookClient.config.url
    });
};

const updateConfiguration = (req, res) => {
    const { webhook_url, api_key } = req.body;
    webhookClient.updateConfig(webhook_url, api_key);
    res.json({ success: true, message: "Configuration updated" });
};

const insertMoney = (req, res) => {
    const { amount } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ error: "Invalid amount" });

    balance += parseFloat(amount);
    res.json({ success: true, balance: parseFloat(balance.toFixed(2)) });
};

const purchaseItem = (req, res) => {
    const { slotId } = req.body;
    const slotIndex = inventory.findIndex(s => s.id === slotId);

    if (slotIndex === -1) {
        return res.status(404).json({ error: "Slot not found" });
    }

    const slot = inventory[slotIndex];

    if (slot.count <= 0) {
        return res.status(400).json({ error: "Out of stock" });
    }

    if (balance < slot.price) {
        return res.status(402).json({ error: "Insufficient funds", required: slot.price, current: balance });
    }

    // Execute Sale
    balance -= slot.price;
    balance = parseFloat(balance.toFixed(2));
    slot.count--;

    const transaction = {
        id: Date.now().toString(),
        slotId: slot.id,
        productId: slot.name,
        price: slot.price,
        timestamp: new Date().toISOString()
    };
    transactions.push(transaction);

    // Emit Events
    eventBus.emit('SALE', { ...transaction, remaining_stock: slot.count });

    if (slot.count <= 2) {
        eventBus.emit('LOW_STOCK', { slotId: slot.id, count: slot.count });
    }

    res.json({ success: true, dispensed: slot, change: balance });

    // Reset balance after success (simulating change return or just consumption)
    // Real machines might hold credit, but for sim purposes we can say it returns change immediately or keeps it.
    // Let's keep it for multiple purchases unless user requests change.
};

const returnChange = (req, res) => {
    const change = balance;
    balance = 0;
    res.json({ success: true, returned: change });
};

// Admin / Remote WMS functions
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
    getInventory,
    getStatus,
    updateConfiguration,
    insertMoney,
    purchaseItem,
    returnChange,
    restockSlot
};
