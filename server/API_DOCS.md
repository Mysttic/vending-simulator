# Vending Machine API Documentation

Base URL: `http://localhost:3000/api/v1`

## 📦 WMS Integration Endpoints

### 1. Get Inventory
Retrieves the complete list of products and their current global stock levels.

**Endpoint:** `GET /inventory`

**Response Fields:**
| Field | Type | Description |
| :--- | :--- | :--- |
| `data` | Array | List of inventory items. |
| `data[].id` | String | Unique Slot ID. |
| `data[].name` | String | Product Name. |
| `data[].price` | Number | Unit Price. |
| `data[].count` | Number | Current Quantity. |

**Example Response:**
```json
{
  "data": [
    {
      "id": "11",
      "name": "Cola Classic",
      "price": 2.50,
      "count": 10
    }
  ]
}
```

### 2. Get Layout
Retrieves the physical machine configuration (Rows, Slots, Visuals).

**Endpoint:** `GET /layout`

**Response Fields:**
| Field | Type | Description |
| :--- | :--- | :--- |
| `rows` | Array | List of physical rows. |
| `rows[].height` | String | Shelf height (`tall`/`standard`). |
| `rows[].slots` | Array | Slots in this row. |
| `slots[].color` | Hex | Product branding color. |

**Example Response:**
```json
{
  "rows": [
    {
      "id": "1",
      "height": "tall",
      "slots": [
        { "id": "11", "color": "#ef4444" }
      ]
    }
  ]
}
```

### 3. Machine Status
Checks health, balance, and configuration.

**Endpoint:** `GET /status`

**Response Fields:**
| Field | Type | Description |
| :--- | :--- | :--- |
| `machine_id` | String | Unique Device ID. |
| `status` | String | `IDLE`, `VENDING`, or `ERROR`. |
| `balance` | Number | Current Credit. |
| `webhook_configured`| Boolean | True if WMS link is active. |

**Example Response:**
```json
{
  "machine_id": "VM-SIM-001",
  "status": "IDLE",
  "balance": 1.50,
  "webhook_configured": true
}
```

### 4. Remote Restock
Updates the stock level for a specific slot.

**Endpoint:** `PATCH /inventory/:slotId`

**Request Body:**
| Field | Type | Description |
| :--- | :--- | :--- |
| `count` | Number | New quantity. |

**Example Request:**
```json
{
  "count": 15
}
```

---

## 🎮 Simulation Endpoints (Frontend)

### 1. Insert Money
Simulates coin insertion.

**Endpoint:** `POST /machine/pay`

**Request Body:**
| Field | Type | Description |
| :--- | :--- | :--- |
| `amount` | Number | Value to add (e.g. 0.25). |

**Example Request:**
```json
{
  "amount": 1.00
}
```

### 2. Purchase Item
Initiates the vending process.

**Endpoint:** `POST /machine/buy`

**Request Body:**
| Field | Type | Description |
| :--- | :--- | :--- |
| `slotId` | String | Target Slot ID. |

**Example Request:**
```json
{
  "slotId": "11"
}
```

---

## 📡 Webhook Events
Events pushed to the configured `Webhook URL`.

### 1. SALE
Triggered on successful dispense.
| Field | Type | Description |
| :--- | :--- | :--- |
| `event` | String | Always `SALE`. |
| `data.slotId` | String | Item dispensed. |
| `data.remaining_stock`| Number | Stock after sale. |

**Example:**
```json
{
  "event": "SALE",
  "machine_id": "VM-SIM-001",
  "data": { "slotId": "11", "remaining_stock": 9 }
}
```

### 2. LOW_STOCK
Triggered when inventory <= 2.
| Field | Type | Description |
| :--- | :--- | :--- |
| `event` | String | Always `LOW_STOCK`. |
| `data.count` | Number | Critical stock level. |

**Example:**
```json
{
  "event": "LOW_STOCK",
  "data": { "slotId": "23", "count": 1 }
}
```

### 3. DISPENSE_FAILURE (Jam)
Triggered when motor fails.
| Field | Type | Description |
| :--- | :--- | :--- |
| `event` | String | `DISPENSE_FAILURE`. |
| `data.reason` | String | Failure code (e.g., `JAMMED`). |

**Example:**
```json
{
  "event": "DISPENSE_FAILURE",
  "data": { "reason": "JAMMED", "slotId": "11" }
}
```
