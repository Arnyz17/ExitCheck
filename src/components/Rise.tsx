"use client";

import { motion } from "framer-motion";

/** Scroll-triggered entrance used across the app: fade + lift with a soft spring. */
export default function Rise({
  children,
  delay = 0,
  className,
  style,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <motion.div
      className={className}
      style={style}
      initial={{ opacity: 0, y: 32, scale: 0.985 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: "0px 0px -8% 0px" }}
      transition={{ type: "spring", stiffness: 110, damping: 20, mass: 0.9, delay }}
    >
      {children}
    </motion.div>
  );
}
