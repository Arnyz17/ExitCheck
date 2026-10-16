"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const ToastContext = createContext<(msg: string) => void>(() => {});
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [msg, setMsg] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const say = useCallback((m: string) => {
    setMsg(m);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setMsg(null), 2400);
  }, []);

  return (
    <ToastContext.Provider value={say}>
      {children}
      <div className="fixed inset-x-0 bottom-6 flex justify-center pointer-events-none z-[100] px-4">
        <AnimatePresence>
          {msg && (
            <motion.div
              key={msg}
              role="status"
              initial={{ opacity: 0, y: 24, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 420, damping: 30 }}
              className="px-5 py-3 rounded-full text-[15px] font-medium"
              style={{ background: "var(--text)", color: "var(--bg)", boxShadow: "0 12px 40px rgba(0,0,0,0.25)" }}
            >
              {msg}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
