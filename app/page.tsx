"use client";

import { useState, useEffect } from "react";
import { ref, onValue, set } from "firebase/database";
import { db } from "./firebaseConfig";

interface SystemState {
  esp1_led: number;
  esp2_led: number;
  water_level: number;
  esp1_online: boolean;
  esp2_connected: boolean;
}

export default function Home() {
  const [systemState, setSystemState] = useState<SystemState>({
    esp1_led: 0,
    esp2_led: 0,
    water_level: 0,
    esp1_online: false,
    esp2_connected: false,
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [heartbeat, setHeartbeat] = useState<number>(0);

  // 1. Fetch data from Firebase
  useEffect(() => {
    const systemRef = ref(db, "water_system");
    const unsubscribe = onValue(systemRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setSystemState((prev) => ({
          ...prev,
          esp1_led: data.esp1_led ?? 0,
          esp2_led: data.esp2_led ?? 0,
          water_level: data.water_level ?? 0,
          // We let the Watchdog control esp1_online, but we still read esp2's radio status
          esp2_connected: Boolean(data.esp2_connected),
        }));

        // Save the heartbeat number to trigger the Watchdog
        if (data.esp1_heartbeat) {
          setHeartbeat(data.esp1_heartbeat);
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 2. The Watchdog Timer (Only runs when the heartbeat number changes)
  useEffect(() => {
    // A fresh heartbeat arrived! The gateway is definitely online.
    setSystemState((prev) => ({ ...prev, esp1_online: true }));

    // Start a 12-second countdown. ESP 1 sends a ping every 5 seconds.
    // If it misses two pings (10+ seconds), it's dead.
    const timer = setTimeout(() => {
      setSystemState((prev) => ({
        ...prev,
        esp1_online: false,
        esp2_connected: false, // If the gateway dies, we also lose connection to the sensor
      }));
    }, 12000);

    // If a new heartbeat arrives before 12s, clear the timer and start over
    return () => clearTimeout(timer);
  }, [heartbeat]);

  const toggleESP1 = () => set(ref(db, "water_system/esp1_led"), systemState.esp1_led === 1 ? 0 : 1);
  const toggleESP2 = () => set(ref(db, "water_system/esp2_led"), systemState.esp2_led === 1 ? 0 : 1);

  const resetWiFi = () => {
    if (confirm("Are you sure? ESP 1 will disconnect from the internet and create the 'Gateway_Setup' hotspot again.")) {
      set(ref(db, "water_system/reset_wifi"), true);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 font-sans">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
        <header className="mb-6 text-center border-b border-slate-800 pb-4">
          <h1 className="text-2xl font-bold tracking-tight text-sky-400">System Dashboard</h1>
          <p className="text-xs text-slate-400 mt-1">Dual-ESP Control Interface</p>
        </header>

        {loading ? (
          <div className="py-12 text-center text-slate-400">Connecting to Firebase...</div>
        ) : (
          <>
            {/* Status Indicators */}
            <div className="space-y-3 mb-6 bg-slate-950/50 p-4 rounded-xl border border-slate-800/80">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">ESP 1 (Gateway):</span>
                <span className="flex items-center gap-2 font-medium">
                  <span className={`h-2.5 w-2.5 rounded-full ${systemState.esp1_online ? "bg-emerald-500 shadow-[0_0_8px_#10b981]" : "bg-rose-500"}`} />
                  {systemState.esp1_online ? "Online" : "Offline"}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">ESP 2 (Terrace):</span>
                <span className="flex items-center gap-2 font-medium">
                  <span className={`h-2.5 w-2.5 rounded-full ${systemState.esp1_online && systemState.esp2_connected ? "bg-emerald-500 shadow-[0_0_8px_#10b981]" : "bg-rose-500"}`} />
                  {systemState.esp1_online && systemState.esp2_connected ? "Linked" : "Signal Lost"}
                </span>
              </div>
            </div>

            {/* LED Controls */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              <button
                onClick={toggleESP1}
                disabled={!systemState.esp1_online}
                className={`py-4 rounded-xl font-bold transition-all active:scale-[0.98] ${!systemState.esp1_online ? "bg-slate-800/50 text-slate-600 cursor-not-allowed" :
                    systemState.esp1_led === 1 ? "bg-sky-600 text-white shadow-lg shadow-sky-600/30" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                  }`}
              >
                ESP 1 LED {systemState.esp1_led === 1 ? "ON" : "OFF"}
              </button>
              <button
                onClick={toggleESP2}
                disabled={!systemState.esp1_online || !systemState.esp2_connected}
                className={`py-4 rounded-xl font-bold transition-all active:scale-[0.98] ${(!systemState.esp1_online || !systemState.esp2_connected) ? "bg-slate-800/50 text-slate-600 cursor-not-allowed" :
                    systemState.esp2_led === 1 ? "bg-purple-600 text-white shadow-lg shadow-purple-600/30" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                  }`}
              >
                ESP 2 LED {systemState.esp2_led === 1 ? "ON" : "OFF"}
              </button>
            </div>

            {/* Reset Wi-Fi Button */}
            <button
              onClick={resetWiFi}
              disabled={!systemState.esp1_online}
              className={`w-full py-3 rounded-xl font-semibold text-sm border transition-colors ${!systemState.esp1_online
                  ? "border-slate-800 text-slate-600 cursor-not-allowed"
                  : "border-rose-500/50 text-rose-400 hover:bg-rose-500/10"
                }`}
            >
              Change Gateway Wi-Fi Network
            </button>
          </>
        )}
      </div>
    </main>
  );
}