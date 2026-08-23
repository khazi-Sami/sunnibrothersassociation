"use client";

import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";
import Image from "next/image";
import type { ReactNode } from "react";

export function Reveal({ children, delay = 0, className = "" }: { children: ReactNode; delay?: number; className?: string }) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={reduceMotion ? false : { opacity: 0, y: 22 }}
      whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.18 }}
      transition={{ duration: 0.65, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

export function IslamicPattern({ className = "", tone = "gold" }: { className?: string; tone?: "gold" | "green" | "light" }) {
  return <span aria-hidden="true" className={`islamic-pattern islamic-pattern--${tone} ${className}`} />;
}

export function MadinahScene() {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className="madinah-scene"
      aria-hidden="true"
      animate={reduceMotion ? undefined : { y: [0, -8, 0], rotate: [0, 0.35, 0] }}
      transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
    >
      <div className="madinah-scene__halo" />
      <div className="madinah-scene__moon" />
      <div className="madinah-scene__minaret madinah-scene__minaret--one"><i /></div>
      <div className="madinah-scene__minaret madinah-scene__minaret--two"><i /></div>
      <div className="madinah-scene__dome"><span /></div>
      <div className="madinah-scene__base" />
      <div className="madinah-scene__arch madinah-scene__arch--one" />
      <div className="madinah-scene__arch madinah-scene__arch--two" />
      <div className="madinah-scene__glow" />
    </motion.div>
  );
}

export function MadinahPhoto() {
  const reduceMotion = useReducedMotion();
  const tiltX = useMotionValue(0);
  const tiltY = useMotionValue(0);
  const rotateX = useSpring(tiltX, { stiffness: 150, damping: 20, mass: 0.7 });
  const rotateY = useSpring(tiltY, { stiffness: 150, damping: 20, mass: 0.7 });
  const sheenX = useTransform(tiltY, [-8, 8], ["20%", "80%"]);

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (reduceMotion) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    tiltY.set(x * 12);
    tiltX.set(y * -10);
  }

  function resetTilt() {
    tiltX.set(0);
    tiltY.set(0);
  }

  return (
    <motion.div
      className="madinah-photo"
      initial={reduceMotion ? false : { opacity: 0, scale: 0.9, y: 34 }}
      animate={reduceMotion ? undefined : { opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
      onPointerMove={handlePointerMove}
      onPointerLeave={resetTilt}
      style={reduceMotion ? undefined : { rotateX, rotateY, transformPerspective: 1200 }}
    >
      <motion.span className="madinah-photo__orbit" aria-hidden="true" animate={reduceMotion ? undefined : { rotateZ: 360 }} transition={{ duration: 24, repeat: Infinity, ease: "linear" }}>
        <i /><i /><i />
      </motion.span>
      <span className="madinah-photo__backplate" aria-hidden="true" />
      <span className="madinah-photo__frame">
        <Image src="/madinah-hero.jpg" alt="A sunlit mosque in Madinah" fill priority sizes="(max-width: 520px) 88vw, (max-width: 800px) 82vw, 47vw" />
        <span className="madinah-photo__veil" />
        <motion.span className="madinah-photo__sheen" aria-hidden="true" style={reduceMotion ? undefined : { left: sheenX }} />
        <motion.span className="madinah-photo__badge madinah-photo__badge--one" animate={reduceMotion ? undefined : { y: [0, -7, 0] }} transition={{ duration: 5.4, repeat: Infinity, ease: "easeInOut" }}><b>Quran</b><small>Learning with adab</small></motion.span>
        <motion.span className="madinah-photo__badge madinah-photo__badge--two" animate={reduceMotion ? undefined : { y: [0, 6, 0] }} transition={{ duration: 6.2, repeat: Infinity, ease: "easeInOut" }}><b>Community</b><small>Faith in action</small></motion.span>
        <span className="madinah-photo__caption"><strong>Al-Madinah Al-Munawwarah</strong>A city of remembrance, love, and peace.</span>
      </span>
    </motion.div>
  );
}
