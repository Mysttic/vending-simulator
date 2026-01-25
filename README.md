# Vending Machine Simulator Project

A comprehensive IoT simulation project designed for testing integrations with Warehouse Management Systems (WMS). The system consists of two independently deployable components: a Machine Controller (Backend) and a Physical Simulator (Frontend).

## 📂 Project Structure

*   [**server/**](./server/README.md): **Machine Controller API**.
    *   REST API for external integration (Inventory, Remote Commands).
    *   Webhook Event Emitter (Sale, Low Stock).
    *   Node.js + Express.
*   [**client/**](./client/README.md): **Visual Simulator**.
    *   Interactive hardware simulation (Glass front, Keypad, Coin mechanism).
    *   Admin configuration panel.
    *   React + TailwindCSS.

## 🚀 Quick Start

To run the full simulator, you need to start both services.

1.  **Start the Backend** (Port 3000)
    ```bash
    cd server
    npm install
    npm start
    ```

2.  **Start the Frontend** (Port 5173)
    ```bash
    cd client
    npm install
    npm run dev
    ```

## 🔗 Integration Guide

This simulator is designed to act as an edge device. It exposes an API for your WMS to poll data and pushes events when specific actions occur.

For detailed API specifications, see the [Backend Documentation](./server/README.md).
For user interface guides, see the [Frontend Documentation](./client/README.md).
