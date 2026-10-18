"use client";

import { useState, useEffect } from "react";
import { ref, onValue, set } from "firebase/database";
import { db } from "./firebaseConfig";

interface SystemState {
  motor_state: number;
  esp1_led: number;
  esp2_led: number;
  water_level: number;
  esp1_online: boolean;
  esp2_connected: boolean;
}

// Shared glass surface styles
const glass =
  "bg-white/10 backdrop-blur-xl border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.25)]";
const glassInner =
  "bg-white/[0.07] backdrop-blur-md border border-white/15 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]";

export default function Home() {
  const [systemState, setSystemState] = useState<SystemState>({
    motor_state: 0,
    esp1_led: 0,
    esp2_led: 0,
    water_level: 0,
    esp1_online: false,
    esp2_connected: false,
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [heartbeat, setHeartbeat] = useState<number>(0);

  // Fetch Firebase Data
  useEffect(() => {
    const systemRef = ref(db, "water_system");
    const unsubscribe = onValue(systemRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setSystemState((prev) => ({
          ...prev,
          motor_state: data.motor_state ?? 0,
          esp1_led: data.esp1_led ?? 0,
          esp2_led: data.esp2_led ?? 0,
          esp2_connected: Boolean(data.esp2_connected),
        }));
        if (data.esp1_heartbeat) {
          setHeartbeat(data.esp1_heartbeat);
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Gateway Watchdog Timer (12 seconds)
  useEffect(() => {
    setSystemState((prev) => ({ ...prev, esp1_online: true }));
    const timer = setTimeout(() => {
      setSystemState((prev) => ({
        ...prev,
        esp1_online: false,
        esp2_connected: false,
      }));
    }, 12000);
    return () => clearTimeout(timer);
  }, [heartbeat]);

  // Database Toggles
  const toggleMotor = () => set(ref(db, "water_system/motor_state"), systemState.motor_state === 1 ? 0 : 1);
  const toggleESP1 = () => set(ref(db, "water_system/esp1_led"), systemState.esp1_led === 1 ? 0 : 1);
  const toggleESP2 = () => set(ref(db, "water_system/esp2_led"), systemState.esp2_led === 1 ? 0 : 1);

  const sensorLinked = systemState.esp1_online && systemState.esp2_connected;

  return (
    <main className="relative min-h-screen lg:h-screen overflow-x-hidden lg:overflow-hidden bg-gradient-to-br from-[#0b1026] via-[#142a5c] to-[#0e5a7a] text-white flex flex-col p-4 sm:p-6 lg:p-8 font-sans">
      {/* Background glow orbs (give the glass something to blur) */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 -left-24 h-[28rem] w-[28rem] rounded-full bg-cyan-400/40 blur-3xl" />
        <div className="absolute top-1/3 -right-32 h-[32rem] w-[32rem] rounded-full bg-indigo-500/40 blur-3xl" />
        <div className="absolute -bottom-40 left-1/4 h-[30rem] w-[30rem] rounded-full bg-fuchsia-500/25 blur-3xl" />
      </div>

      {/* Page content (no outer card, so the page fits on one screen) */}
      <div className="relative z-10 w-full max-w-md md:max-w-3xl lg:max-w-none mx-auto flex-1 min-h-0 flex flex-col">
        {/* Header */}
        <header className="mb-5 lg:mb-6 text-center lg:text-left">
          <h1 className="text-2xl lg:text-3xl font-black tracking-wide drop-shadow-sm">
            Water Tank Control
          </h1>
          {/* <p className="text-[11px] lg:text-sm text-white/60 mt-1.5 font-semibold tracking-[0.08em]">
            Interactive React liquid dynamic wave animation
          </p> */}
        </header>

        {loading ? (
          <div className="py-24 text-center text-white/60 animate-pulse text-xs font-bold tracking-widest uppercase">
            Connecting to Cloud...
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-5 lg:grid-rows-1 gap-5 lg:gap-6 flex-1 min-h-0">
            {/* LEFT: Tank visualizer */}
            <section
              className={`relative lg:col-span-3 min-h-0 rounded-3xl p-4 flex justify-center items-center ${glass}`}
            >
              <svg viewBox="12 58 215 170" className="w-full max-w-[320px] md:max-w-[400px] h-auto lg:max-w-none lg:absolute lg:inset-5 lg:w-[calc(100%-2.5rem)] lg:h-[calc(100%-2.5rem)] drop-shadow-[0_10px_30px_rgba(56,189,248,0.25)]">
                <defs>
                  <linearGradient id="water-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#38bdf8" />
                    <stop offset="100%" stopColor="#0369a1" />
                  </linearGradient>
                  <linearGradient id="glass-shine" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#ffffff" stopOpacity="0.28" />
                    <stop offset="45%" stopColor="#ffffff" stopOpacity="0.04" />
                    <stop offset="100%" stopColor="#ffffff" stopOpacity="0.12" />
                  </linearGradient>
                  <clipPath id="water-clip">
                    <rect x="82" y="72" width="136" height="146" rx="14" />
                  </clipPath>
                </defs>

                {/* 1. Pump sits at the bottom-left, outside the tank */}
                <rect x="29" y="217" width="32" height="5" rx="2" fill="rgba(255,255,255,0.35)" />
                <circle cx="45" cy="200" r="18" fill="rgba(11,16,38,0.7)" stroke="rgba(255,255,255,0.45)" strokeWidth="3" />

                {/* Animated Spinning Propeller */}
                <g
                  className={systemState.motor_state === 1 ? "animate-[spin_0.4s_linear_infinite] motion-reduce:animate-none" : ""}
                  style={{ transformBox: "fill-box", transformOrigin: "center" }}
                >
                  <line x1="45" y1="186" x2="45" y2="214" stroke="rgba(255,255,255,0.8)" strokeWidth="3" strokeLinecap="round" />
                  <line x1="31" y1="200" x2="59" y2="200" stroke="rgba(255,255,255,0.8)" strokeWidth="3" strokeLinecap="round" />
                </g>

                {/* 2. Pipe: up from the pump, then into the tank's left wall near the top */}
                <path d="M 45 182 L 45 95 L 84 95" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M 45 182 L 45 95 L 84 95" fill="none" stroke="rgba(11,16,38,0.75)" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />

                {/* 3. Tank Body (frosted glass) */}
                <rect x="80" y="70" width="140" height="150" rx="16" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.45)" strokeWidth="3" />

                {/* Measurement Lines (Right side) */}
                <g stroke="rgba(255,255,255,0.4)" strokeWidth="2">
                  <line x1="210" y1="90" x2="215" y2="90" />
                  <line x1="212" y1="110" x2="215" y2="110" />
                  <line x1="210" y1="130" x2="215" y2="130" />
                  <line x1="212" y1="150" x2="215" y2="150" />
                  <line x1="210" y1="170" x2="215" y2="170" />
                  <line x1="212" y1="190" x2="215" y2="190" />
                  <line x1="210" y1="210" x2="215" y2="210" />
                </g>

                {/* Flowing water: along the pipe, then pouring down inside the tank */}
                {systemState.motor_state === 1 && (
                  <path
                    d="M 45 182 L 45 95 L 84 95 Q 98 95 98 112 L 98 205"
                    fill="none"
                    stroke="#7dd3fc"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray="10 10"
                    className="animate-[pipe-flow_0.5s_linear_infinite] motion-reduce:animate-none"
                  />
                )}

                {/* 4. Water: rises/drains smoothly, with two layered waves */}
                <g clipPath="url(#water-clip)">
                  <g
                    style={{ transform: `translateY(${systemState.motor_state === 1 ? 196 : 232}px)` }}
                    className="transition-transform duration-[1800ms] ease-in-out"
                  >
                    {/* Back wave (slower, lighter) */}
                    <g transform="translate(82,0)">
                      <g className="animate-[wave-left_5s_linear_infinite] motion-reduce:animate-none">
                        <path
                          d="M-204,2 C-170,-6 -136,-6 -102,2 C-68,10 -34,10 0,2 C34,-6 68,-6 102,2 C136,10 170,10 204,2 C238,-6 272,-6 306,2 L306,60 L-204,60 Z"
                          fill="#38bdf8" opacity="0.45"
                        />
                      </g>
                    </g>
                    {/* Front wave */}
                    <g transform="translate(82,0)">
                      <g className="animate-[wave-right_3s_linear_infinite] motion-reduce:animate-none">
                        <path
                          d="M-204,0 C-170,-7 -136,-7 -102,0 C-68,7 -34,7 0,0 C34,-7 68,-7 102,0 C136,7 170,7 204,0 C238,-7 272,-7 306,0 L306,60 L-204,60 Z"
                          fill="url(#water-grad)" opacity="0.92"
                        />
                      </g>
                    </g>
                  </g>
                </g>

                {/* 5. Glass shine over the tank */}
                <rect x="82" y="72" width="136" height="146" rx="14" fill="url(#glass-shine)" pointerEvents="none" />

                {/* 6. Tank Text */}
                <text x="150" y="145" textAnchor="middle" fill="#ffffff" fontSize="32" fontWeight="900">0%</text>
                <text x="150" y="165" textAnchor="middle" fill={systemState.motor_state === 1 ? "#7dd3fc" : "rgba(255,255,255,0.6)"} fontSize="9" fontWeight="bold" letterSpacing="1">
                  {systemState.motor_state === 1 ? "PUMPING..." : "WATER LEVEL"}
                </text>
              </svg>
            </section>

            {/* RIGHT: Status + controls */}
            <section className="lg:col-span-2 min-h-0 flex flex-col lg:justify-center gap-5 lg:gap-6">
              {/* Status Pills */}
              <div className="grid grid-cols-2 lg:grid-cols-1 gap-4">
                <div className={`rounded-2xl p-4 lg:p-5 flex flex-col items-center lg:items-start justify-center ${glassInner}`}>
                  <span className="text-[10px] text-white/55 font-bold uppercase tracking-widest mb-2">Gateway (ESP 1)</span>
                  <span className="flex items-center gap-2.5 text-xs lg:text-sm font-bold tracking-wider">
                    <span className={`h-2.5 w-2.5 rounded-full ${systemState.esp1_online ? "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.9)]" : "bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.7)]"}`} />
                    {systemState.esp1_online ? "ONLINE" : "OFFLINE"}
                  </span>
                </div>
                <div className={`rounded-2xl p-4 lg:p-5 flex flex-col items-center lg:items-start justify-center ${glassInner}`}>
                  <span className="text-[10px] text-white/55 font-bold uppercase tracking-widest mb-2">Sensor (ESP 2)</span>
                  <span className="flex items-center gap-2.5 text-xs lg:text-sm font-bold tracking-wider">
                    <span className={`h-2.5 w-2.5 rounded-full ${sensorLinked ? "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.9)]" : "bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.7)]"}`} />
                    {sensorLinked ? "LINKED" : "LOST"}
                  </span>
                </div>
              </div>

              {/* ESP LED Controls */}
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={toggleESP1}
                  disabled={!systemState.esp1_online}
                  className={`py-3.5 rounded-xl font-bold text-[11px] tracking-widest uppercase backdrop-blur-md transition-all duration-200 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white ${!systemState.esp1_online
                    ? "bg-white/5 text-white/30 border border-white/10 cursor-not-allowed"
                    : systemState.esp1_led === 1
                      ? "bg-cyan-400/30 text-white border border-cyan-300/60 shadow-[0_0_20px_rgba(34,211,238,0.35)]"
                      : "bg-white/10 text-white/80 hover:bg-white/20 border border-white/20"
                    }`}
                >
                  ESP1 LED: {systemState.esp1_led === 1 ? "ON" : "OFF"}
                </button>

                <button
                  onClick={toggleESP2}
                  disabled={!systemState.esp1_online || !systemState.esp2_connected}
                  className={`py-3.5 rounded-xl font-bold text-[11px] tracking-widest uppercase backdrop-blur-md transition-all duration-200 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white ${(!systemState.esp1_online || !systemState.esp2_connected)
                    ? "bg-white/5 text-white/30 border border-white/10 cursor-not-allowed"
                    : systemState.esp2_led === 1
                      ? "bg-indigo-400/30 text-white border border-indigo-300/60 shadow-[0_0_20px_rgba(129,140,248,0.4)]"
                      : "bg-white/10 text-white/80 hover:bg-white/20 border border-white/20"
                    }`}
                >
                  ESP2 LED: {systemState.esp2_led === 1 ? "ON" : "OFF"}
                </button>
              </div>

              {/* Main Motor Control */}
              <button
                onClick={toggleMotor}
                disabled={!systemState.esp1_online}
                className={`w-full py-4 lg:py-5 rounded-2xl font-black text-sm lg:text-base tracking-[0.1em] backdrop-blur-md transition-all duration-300 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-white ${!systemState.esp1_online
                  ? "bg-white/5 text-white/30 border border-white/10 cursor-not-allowed"
                  : systemState.motor_state === 1
                    ? "bg-rose-500/40 hover:bg-rose-500/55 text-white border border-rose-300/60 shadow-[0_0_28px_rgba(244,63,94,0.45)]"
                    : "bg-blue-500/40 hover:bg-blue-500/55 text-white border border-blue-300/60 shadow-[0_0_28px_rgba(59,130,246,0.45)]"
                  }`}
              >
                {systemState.motor_state === 1 ? "STOP MOTOR" : "START MOTOR"}
              </button>
            </section>
          </div>
        )}
      </div>

      {/* Global CSS for the custom SVG animations */}
      <style jsx global>{`
        @keyframes pipe-flow {
          from { stroke-dashoffset: 20; }
          to { stroke-dashoffset: 0; }
        }
        @keyframes wave-left {
          from { transform: translateX(0); }
          to { transform: translateX(-204px); }
        }
        @keyframes wave-right {
          from { transform: translateX(0); }
          to { transform: translateX(204px); }
        }
      `}</style>
    </main>
  );
}