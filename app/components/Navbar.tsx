"use client";

import { ArrowUpRight, Menu, X } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const links = [
  { href: "/about", label: "About" },
  { href: "/activities", label: "Activities" },
  { href: "/education", label: "Education" },
  { href: "/quran", label: "Quran" },
  { href: "/zakat", label: "Zakat" },
  { href: "/career", label: "Career" },
];

function BrandMark() {
  const reduceMotion = useReducedMotion();

  return (
    <motion.span
      className="site-brand__mark"
      whileHover={reduceMotion ? undefined : { scale: 1.06, rotateY: 10, rotateX: -6 }}
      transition={{ type: "spring", stiffness: 260, damping: 18 }}
    >
      <motion.span
        className="site-brand__orbit"
        aria-hidden="true"
        animate={reduceMotion ? undefined : { rotate: 360 }}
        transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
      >
        <i /><i /><i />
      </motion.span>
      <span className="site-brand__logo">
        <Image src="/sba-logo.jpg" alt="" width={52} height={52} priority />
        <motion.span
          className="site-brand__glint"
          aria-hidden="true"
          animate={reduceMotion ? undefined : { x: ["-170%", "210%"] }}
          transition={{ duration: 3.8, repeat: Infinity, repeatDelay: 4.2, ease: "easeInOut" }}
        />
      </span>
      <span className="site-brand__seal" aria-hidden="true">SBA</span>
    </motion.span>
  );
}

export default function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="site-header">
      <nav className="site-nav" aria-label="Main navigation">
        <Link href="/" className="site-brand" aria-label="Sunni Brothers Association home">
          <BrandMark />
          <span className="site-brand__copy">
            <span className="site-brand__eyebrow">Sunni Brothers Association</span>
            <span className="site-brand__name">Community Madrasa</span>
          </span>
        </Link>

        <div className="site-nav__links">
          {links.map((link) => <Link key={link.href} href={link.href} className={pathname === link.href ? "is-active" : ""}>{link.label}</Link>)}
        </div>

        <div className="site-nav__actions">
          <Link href="/login" className="site-nav__login">Sign in</Link>
          <Link href="/donation" className="site-nav__donate">Give with purpose <ArrowUpRight size={15} strokeWidth={2.3} /></Link>
        </div>

        <button className="site-nav__toggle" type="button" aria-label={open ? "Close navigation menu" : "Open navigation menu"} aria-expanded={open} onClick={() => setOpen((value) => !value)}>
          {open ? <X size={21} /> : <Menu size={21} />}
        </button>
      </nav>

      {open ? <div className="site-nav__mobile" aria-label="Mobile navigation">
        {links.map((link) => <Link key={link.href} href={link.href} onClick={() => setOpen(false)} className={pathname === link.href ? "is-active" : ""}>{link.label}</Link>)}
        <Link href="/login" onClick={() => setOpen(false)}>Sign in</Link>
        <Link href="/donation" onClick={() => setOpen(false)} className="site-nav__mobile-donate">Give with purpose <ArrowUpRight size={16} /></Link>
      </div> : null}
    </header>
  );
}
