import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { useLogs } from '../contexts/LogContext';

const API_URL = 'http://localhost:3000/api/v1';

export const useMachine = () => {
    const [inventory, setInventory] = useState([]);
    const [status, setStatus] = useState(null);
    const [balance, setBalance] = useState(0);
    const [message, setMessage] = useState("Welcome");
    const [loading, setLoading] = useState(false);
    const [dispensedItem, setDispensedItem] = useState(null);

    const { addLog } = useLogs();
    const lastStatusRef = useRef(null);

    // Polling State
    const refreshState = useCallback(async () => {
        try {
            const [invRes, statusRes] = await Promise.all([
                axios.get(`${API_URL}/inventory`),
                axios.get(`${API_URL}/status`)
            ]);
            setInventory(invRes.data.data);
            setStatus(statusRes.data);

            if (statusRes.data.balance !== undefined) {
                setBalance(statusRes.data.balance);
            }

            const machineStatus = statusRes.data.status;

            // Log Status Changes
            if (lastStatusRef.current !== machineStatus) {
                addLog('EVENT', `Machine State: ${machineStatus}`);
                lastStatusRef.current = machineStatus;
            }

            // Update message based on status if busy
            if (machineStatus === 'VENDING') {
                setMessage("Dispensing...");
                setLoading(true);
            } else if (loading && machineStatus === 'IDLE') {
                // Just finished transition from VENDING -> IDLE
                setLoading(false);
                // Check if we have a successful recent transaction? 
                // For now, simple text, but main loop handles the item visual via local state in purchase
            } else if (loading && machineStatus === 'ERROR') {
                setLoading(false);
                setMessage("Device Error");
                addLog('ERROR', 'Machine reported hardware monitor error');
            }

        } catch (err) {
            // console.error("Failed to fetch state", err);
        }
    }, [loading, addLog]);

    useEffect(() => {
        refreshState();
        const interval = setInterval(refreshState, 1000);
        return () => clearInterval(interval);
    }, [refreshState]);

    const insertMoney = async (amount) => {
        try {
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
        try {
            setLoading(true);
            setMessage("Processing...");
            addLog('USER', `Selected Slot ${slotId}`);
            addLog('API_REQ', `POST /buy { slotId: ${slotId} }`);

            const res = await axios.post(`${API_URL}/machine/buy`, { slotId });
            addLog('API_RES', `Purchase Accepted: ${res.data.status}`);

            // Speculative success for visual if we trust it will work? 
            // No, we wait for poll? 
            // Actually, for the visual "drop", we can set it here if we assume success, 
            // OR we can rely on the fact that if it comes back to IDLE and stock dropped. 
            // Simpler: Set it now as "Pending Drop" or just wait.
            // Let's set it after a timeout matching the estimated time, or just set it on success if we want purely optimistic?
            // Since backend is async, we don't know the result yet.
            // But for better UX, we'll set it when the polling *confirms* the stock drop? 
            // Complex. Let's just set it "Optimistically" after the estimated delay if no error?

            // Better approach: We can query /history? No.
            // Let's just use the fact we asked for it. 
            const item = inventory.find(i => i.id === slotId);

            // We will set a timeout to "show" the item roughly when it should be done (4s)
            setTimeout(() => {
                // Verify we didn't error out? We rely on polling.
                // But let's show the item for visual feedback.
                setDispensedItem({ ...item, timestamp: Date.now() });
                addLog('EVENT', `Visual: Item ${item.name} dropped`);
            }, 3500);

        } catch (err) {
            setLoading(false);
            addLog('ERROR', `Purchase Failed: ${err.response?.data?.error || err.message}`);
            if (err.response) {
                setMessage(err.response.data.error === "Insufficient funds"
                    ? "Insert Mor Money"
                    : err.response.data.error);
            } else {
                setMessage("System Error");
            }
            setTimeout(() => setMessage("Welcome"), 3000);
        }
    };

    const clearDispensedItem = () => setDispensedItem(null);

    const returnChange = async () => {
        try {
            addLog('API_REQ', 'POST /refund');
            await axios.post(`${API_URL}/machine/refund`);
            addLog('API_RES', 'Refund processed');
            setBalance(0);
            setMessage("Change Returned");
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
        inventory,
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
