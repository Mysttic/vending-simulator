# Vending Machine Controller (Backend)

The backend serves as the brain of the Vending Machine. It manages the internal state (inventory, credit, transactions) and handles communication with external Warehouse Management Systems (WMS).

## 🏗 Architecture

*   **Runtime:** Node.js
*   **Framework:** Express
*   **State:** In-Memory (Persistent per session). Inventory resets on server restart unless modified in `config/default-inventory.js`.
*   **Event System:** Internal `EventBus` triggers Webhook calls asynchronously.

## 🛠 Configuration Schema

The machine physical layout is defined in `server/config/machine-layout.json`.

### Schema Reference

| Field | Type | Description |
| :--- | :--- | :--- |
| `rows` | Array | List of shelf rows (top to bottom). |
| `rows[].id` | String | Row identifier (e.g., "1"). |
| `rows[].height` | String | Shelf height: `"tall"` (Bottles) or `"standard"` (Cans/Snacks). |
| `rows[].slots` | Array | List of product slots in this row. |
| `slots[].id` | String | Unique Slot ID keyed on keypad (e.g., "11"). |
| `slots[].name` | String | Product name displayed. |
| `slots[].price` | Number | Cost per unit. |
| `slots[].color` | Hex | Product packaging color (e.g., `#ef4444`). |
| `slots[].capacity` | Number | Max physical capacity. |
| `slots[].initial_count` | Number | Starting stock. |

### Example
```json
{
  "rows": [
    {
      "id": "1",
      "height": "tall", 
      "slots": [
        { 
          "id": "11", 
          "name": "Cola", 
          "price": 2.50, 
          "color": "#ff0000",
          "capacity": 10
        }
      ]
    }
  ]
}
```

## ⚙️ Theory of Operation (Logic)

### 1. Escrow Credit System
The backend implements a secure "Escrow" model for payments.
*   **Transaction Start:** When a purchase begins, the price is **immediately deducted** from the user's `balance`.
*   **Dispense Phase:** The machine attempts to physically move the product (simulated delay).
*   **Verification:**
    *   **Success**: The transaction is committed, and inventory count is reduced.
    *   **Failure (Jam)**: If the dispense fails (see Jam Simulation), the funds are **refunded** (added back) to the balance.

### 2. Jam Simulation
To test WMS error handling, the backend includes a configurable failure generator.
*   **Configuration**: `fail_rate` (0.0 - 1.0).
*   **Mechanism**: Before finalizing a dispense, the system rolls a probability check.
*   **Outcome**: If a Jam occurs:
    1.  The `simulateDispenseProcess` promise rejects.
    2.  An internal `DISPENSE_FAILURE` event is emitted.
    3.  The Escrowed funds are returned to the user.

### 3. State Machine
The controller enforces a strict state lifecycle to prevent race conditions (e.g., double vending).

`IDLE` -> `VENDING` -> `PROCESSING` -> (`IDLE` or `ERROR`)

---

## 🚀 Getting Started

### Prerequisites
*   Node.js (v18+)

### Running the Server
```bash
npm install
npm start
```
By default, the server runs on `http://localhost:3000`.

## 🔌 API Reference

### Base URL
`http://localhost:3000/api/v1`

### 1. External Integration (WMS)

#### Get Inventory
Returns the full status of all slots in the machine.
*   **Endpoint:** `GET /inventory`
*   **Response:**
    ```json
    {
      "data": [
        {
          "id": "11",
          "name": "Cola Classic",
          "price": 2.5,
          "count": 10
        }
      ]
    }
    ```

#### Check Machine Status
Health check and configuration status.
*   **Endpoint:** `GET /status`
*   **Response:**
    ```json
    {
      "machine_id": "VM-SIM-001",
      "status": "IDLE",
      "balance": 0,
      "webhook_configured": true
    }
    ```

#### Remote Restock (PATCH)
Simulates a technician or robotic arm refilling a specific slot.
*   **Endpoint:** `PATCH /inventory/:slotId`
*   **Body:** `{ "count": 15 }`
*   **Response:** `{ "success": true, "slot": { ... } }`

---

### 2. Machine Operations (Frontend Simulation)
These endpoints are used by the React Frontend to simulate physical interactions.

*   `POST /machine/pay`: `{ "amount": 0.25 }` (Adds credit)
*   `POST /machine/buy`: `{ "slotId": "11" }` (Purchases item)
*   `POST /machine/refund`: (Returns current balance)

---

### 3. Webhooks (Outbound Events)

The machine pushes real-time JSON events to the configured `Webhook URL`.

#### Event: `SALE`
Triggered when a user successfully buys a product.
```json
{
  "event": "SALE",
  "timestamp": "2026-01-25T18:00:00.000Z",
  "machine_id": "VM-SIM-001",
  "data": {
    "slotId": "11",
    "productId": "Cola Classic",
    "remaining_stock": 9
  }
}
```

#### Event: `LOW_STOCK`
Triggered when an item count drops to **2 or less** after a sale.
```json
{
  "event": "LOW_STOCK",
  "data": {
    "slotId": "11",
    "count": 2
  }
}
```
