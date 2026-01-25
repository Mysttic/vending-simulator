import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API_URL = 'http://localhost:3000/api/v1';

export const useMachine = () => {
    const [inventory, setInventory] = useState([]);
    const [status, setStatus] = useState(null);
    const [balance, setBalance] = useState(0);
    const [message, setMessage] = useState("Welcome");
    const [loading, setLoading] = useState(false);

    // Polling State
    const refreshState = useCallback(async () => {
        try {
            const [invRes, statusRes] = await Promise.all([
                axios.get(`${API_URL}/inventory`),
                axios.get(`${API_URL}/status`)
            ]);
            setInventory(invRes.data.data);
            setStatus(statusRes.data);
            setBalance(statusRes.data.balance);
        } catch (err) {
            console.error("Failed to fetch state", err);
        }
    }, []);

    useEffect(() => {
        refreshState();
        const interval = setInterval(refreshState, 2000); // Poll every 2s
        return () => clearInterval(interval);
    }, [refreshState]);

    const insertMoney = async (amount) => {
        try {
            setLoading(true);
            const res = await axios.post(`${API_URL}/machine/pay`, { amount });
            setBalance(res.data.balance);
            setMessage(`Credit: $${res.data.balance.toFixed(2)}`);
        } catch (err) {
            setMessage("Error accepting coin");
        } finally {
            setLoading(false);
        }
    };

    const selectItem = async (slotId) => {
        try {
            setLoading(true);
            setMessage("Vending...");
            const res = await axios.post(`${API_URL}/machine/buy`, { slotId });
            setMessage("Enjoy!");
            refreshState();
            return res.data;
        } catch (err) {
            if (err.response) {
                setMessage(err.response.data.error === "Insufficient funds"
                    ? "Insert Mor Money"
                    : err.response.data.error);
            } else {
                setMessage("System Error");
            }
            throw err;
        } finally {
            setLoading(false);
            // Reset msg after 3s
            setTimeout(() => setMessage("Welcome"), 3000);
        }
    };

    const returnChange = async () => {
        try {
            await axios.post(`${API_URL}/machine/refund`);
            setBalance(0);
            setMessage("Change Returned");
        } catch (err) {
            console.error(err);
        }
    };

    const updateConfig = async (url, apiKey) => {
        try {
            await axios.post(`${API_URL}/config`, { webhook_url: url, api_key: apiKey });
            refreshState();
            return true;
        } catch (err) {
            return false;
        }
    };

    return {
        inventory,
        status,
        balance,
        message,
        loading,
        insertMoney,
        selectItem,
        returnChange,
        updateConfig
    };
};
