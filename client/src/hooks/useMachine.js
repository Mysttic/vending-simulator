import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { useLogs } from '../contexts/LogContext';

const API_URL = 'http://localhost:3000/api/v1';

export const useMachine = () => {
    const [layout, setLayout] = useState(null);
    const [status, setStatus] = useState(null);
    const [balance, setBalance] = useState(0);
    const [message, setMessage] = useState("Welcome");
    const [loading, setLoading] = useState(false);
    const [dispensedItem, setDispensedItem] = useState(null);

    const { addLog } = useLogs();

    // Track previous state to detect changes
    const lastStatusRef = useRef(null);
    const lastInventoryRef = useRef({});
    // Track pending purchase to know what we are waiting for
    const pendingSlotIdRef = useRef(null);

    // Fetch Layout Once on Start (or reload)
    useEffect(() => {
        const fetchLayout = async () => {
            try {
                const res = await axios.get(`${API_URL}/layout`);
                setLayout(res.data);

                // Init inventory ref
                res.data.rows.forEach(r => {
                    r.slots.forEach(s => {
                        lastInventoryRef.current[s.id] = s.count;
                    });
                });

                addLog('API_RES', 'Layout Loaded');
            } catch (err) {
                addLog('ERROR', 'Failed to load layout');
            }
        };
        fetchLayout();
    }, [addLog]);

    // Polling State
    const refreshState = useCallback(async () => {
        try {
            const [layoutRes, statusRes] = await Promise.all([
                axios.get(`${API_URL}/layout`),
                axios.get(`${API_URL}/status`)
            ]);

            const newLayout = layoutRes.data;
            const newStatus = statusRes.data;
            const machineStatus = newStatus.status;

            setLayout(newLayout);
            setStatus(newStatus);
            if (newStatus.balance !== undefined) setBalance(newStatus.balance);

            // 1. Detect Status Changes
            if (lastStatusRef.current !== machineStatus) {
                addLog('EVENT', `Machine State: ${machineStatus}`);

                // 2. Logic when finishing VENDING -> IDLE
                if (lastStatusRef.current === 'VENDING' && machineStatus === 'IDLE') {
                    setLoading(false);

                    // Check if inventory dropped for the pending slot
                    const targetId = pendingSlotIdRef.current;
                    if (targetId) {
                        // Find new count
                        let newCount = 0;
                        let oldCount = lastInventoryRef.current[targetId];

                        // Locate in new layout
                        newLayout.rows.forEach(r => {
                            const s = r.slots.find(x => x.id === targetId);
                            if (s) newCount = s.count;
                        });

                        addLog('INFO', `Verifying Dispense: Slot ${targetId} (Qty: ${oldCount} -> ${newCount})`);

                        if (newCount < oldCount) {
                            // SUCCESS: Item dropped
                            addLog('EVENT', 'Dispense Successful');

                            // Find item metadata for visual
                            let itemMeta = null;
                            newLayout.rows.forEach(r => {
                                const found = r.slots.find(s => s.id === targetId);
                                if (found) itemMeta = found;
                            });

                            if (itemMeta) {
                                setDispensedItem({ ...itemMeta, timestamp: Date.now() });
                                addLog('EVENT', `Visual: Item ${itemMeta.name} dropped`);
                                addLog('EVENT', 'Machine Blocked until Pickup');
                            }
                            // Reset message
                            setMessage(newStatus.balance > 0 ? `Credit: $${newStatus.balance.toFixed(2)}` : "Welcome");

                        } else {
                            // FAILURE: Count didn't drop (JAM)
                            addLog('ERROR', 'Dispense Check Failed: Inventory unchanged');
                            addLog('ERROR', 'STATUS: JAMMED');
                            addLog('EVENT', 'Refund Initiated (Escrow returned)');

                            setMessage("Error: Jammed");
                            // We probably got a refund in the backend, balance update handles it
                            setTimeout(() => setMessage(newStatus.balance > 0 ? `Credit: $${newStatus.balance.toFixed(2)}` : "Welcome"), 3000);
                        }

                        pendingSlotIdRef.current = null;
                    }
                }

                lastStatusRef.current = machineStatus;
            }

            // Update inventory ref for next diff
            if (newLayout) {
                newLayout.rows.forEach(r => {
                    r.slots.forEach(s => {
                        lastInventoryRef.current[s.id] = s.count;
                    });
                });
            }

            // 3. Ongoing Loading State Logic (if missed transition or just polling)
            if (machineStatus === 'VENDING' && !loading) {
                setMessage("Dispensing...");
                setLoading(true);
            }
            // Safe guard if we are loading but backend is IDLE and we missed the exact frame transition? 
            // The logic above handles the transition edge.
            // But if we reload page while vending?
            // For now, relies on the edge.

        } catch (err) {
            // console.error(err);
        }
    }, [loading, addLog]);

    useEffect(() => {
        refreshState();
        const interval = setInterval(refreshState, 1000);
        return () => clearInterval(interval);
    }, [refreshState]);

    const insertMoney = async (amount) => {
        try {
            addLog('USER', `Inserted $${amount}`);
            addLog('API_REQ', `POST /pay { amount: ${amount} }`);
            const res = await axios.post(`${API_URL}/machine/pay`, { amount });
            addLog('API_RES', `Balance updated: ${res.data.balance}`);
            setBalance(res.data.balance);
            setMessage(`Credit: $${res.data.balance.toFixed(2)}`);
        } catch (err) {
            addLog('ERROR', 'Payment failed');
            setMessage("Error");
        }
    };

    const selectItem = async (slotId) => {
        if (dispensedItem) {
            setMessage("Remove Item First!");
            addLog('USER', `Blocked purchase attempt on ${slotId} (Item in Box)`);
            setTimeout(() => setMessage("Welcome"), 2000);
            return;
        }

        try {
            setLoading(true);
            setMessage("Processing...");
            addLog('USER', `Selected Slot ${slotId}`);
            pendingSlotIdRef.current = slotId; // Mark what we are waiting for

            addLog('API_REQ', `POST /buy { slotId: ${slotId} }`);
            const res = await axios.post(`${API_URL}/machine/buy`, { slotId });
            addLog('API_RES', `Purchase Accepted: ${res.data.status}`);

            // REMOVED: Optimistic setTimeout from here. 
            // Now handled in refreshState by inventory diff.

        } catch (err) {
            setLoading(false);
            pendingSlotIdRef.current = null;
            addLog('ERROR', `Purchase Failed: ${err.response?.data?.error || err.message}`);
            if (err.response) {
                setMessage(err.response.data.error === "Insufficient funds"
                    ? "Insert Mor Money"
                    : err.response.data.error);
            } else {
                setMessage("System Error");
            }
            setTimeout(() => setMessage(newStatus.balance > 0 ? `Credit: $${newStatus.balance.toFixed(2)}` : "Welcome"), 3000);
        }
    };

    const clearDispensedItem = () => {
        addLog('USER', `Collected Item: ${dispensedItem?.name}`);
        setDispensedItem(null);
    };

    const returnChange = async () => {
        try {
            addLog('USER', 'Requested Refund');
            addLog('API_REQ', 'POST /refund');
            await axios.post(`${API_URL}/machine/refund`);
            addLog('API_RES', 'Refund processed');
            setBalance(0);
            setMessage("Change Returned");
            setTimeout(() => setMessage("Welcome"), 3000);
        } catch (err) {
            console.error(err);
        }
    };

    const updateConfig = async (url, apiKey, failRate) => {
        try {
            addLog('API_REQ', 'Updating Config...');
            await axios.post(`${API_URL}/config`, {
                webhook_url: url,
                api_key: apiKey,
                fail_rate: failRate
            });
            addLog('API_RES', 'Config Saved');
            refreshState();
            return true;
        } catch (err) {
            addLog('ERROR', 'Config Update Failed');
            return false;
        }
    };

    return {
        layout,
        status,
        balance,
        message,
        loading,
        dispensedItem,
        clearDispensedItem,
        insertMoney,
        selectItem,
        returnChange,
        updateConfig
    };
};
