# Vending Machine Simulator (Frontend)

The frontend provides an interactive, visual simulation of the vending machine hardware. It mimics a physical glass-front machine with a keypad, coin slots, and a digital display.

## 🚀 Getting Started

### Prerequisites
*   Node.js (v18+)

### Running the Simulator
```bash
npm install
npm run dev
```
The application will launch on `http://localhost:5173`.

## 📸 Interface Documentation

### 1. Main Interface
The user interface mimics a physical machine.
- **Top:** "SNACK TRON" Branding.
- **Center:** Glass window showing products with real-time stock levels. Empty slots are visually dimmed.
- **Right:** Control Panel (LCD Display, Coin Slots, Keypad).

![Main Interface](images/main_interface.png)

### 2. Making a Purchase
The simulation flow supports a realistic vending cycle:
1.  **Insert Credit:** Click the `$0.25`, `$1.00`, or `$5.00` buttons.
2.  **Select Product:** Use the keypad to type the Slot ID (e.g., `11`, `23`).
3.  **Vending:** The machine processes the order, deduces stock, and returns a success message.

![Vending Process](images/vending_status.png)

### 3. WMS Configuration Panel
Access the hidden settings menu by clicking the **Gear Icon** in the bottom-right corner.
Use this panel to "hot-swap" the integration endpoint without restarting the server.
- **Webhook URL:** The destination for event notifications (e.g., [webhook.site](https://webhook.site)).
- **API Key:** Optional security header included in outgoing requests.

![Settings Panel](images/settings_panel.png)

## 🛠 Technology Stack
*   **React 19**: Interactive UI library.
*   **Vite**: Fast build tool and dev server.
*   **TailwindCSS v4**: Styling engine.
*   **Axios**: For API communication with the backend.
