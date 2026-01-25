const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const apiController = require('./controllers/api-controller');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

// Logging Middleware
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
    next();
});

// API Routes
app.get('/api/v1/inventory', apiController.getInventory);
app.get('/api/v1/status', apiController.getStatus);
app.post('/api/v1/config', apiController.updateConfiguration);

// Machine Operations (Simulation UI)
app.post('/api/v1/machine/pay', apiController.insertMoney);
app.post('/api/v1/machine/buy', apiController.purchaseItem);
app.post('/api/v1/machine/refund', apiController.returnChange);

// WMS Operations
app.patch('/api/v1/inventory/:slotId', apiController.restockSlot);

// Health
app.get('/health', (req, res) => res.send('OK'));

app.listen(PORT, () => {
    console.log(`Vending Machine Core running on http://localhost:${PORT}`);
    console.log(`Ready to integrate with WMS.`);
});
