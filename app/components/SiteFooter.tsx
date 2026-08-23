"use client";

import { ArrowUpRight, Globe2, Mail } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const explore = [
  ["About", "/about"],
  ["Activities", "/activities"],
  ["Education", "/education"],
  ["Quran", "/quran"],
] as const;

const community = [
  ["Zakat", "/zakat"],
  ["Donation", "/donation"],
  ["Career", "/career"],
  ["Sign in", "/login"],
] as const;

export default function SiteFooter() {
  const pathname = usePathname();
  if (pathname.startsWith("/admin")) return null;

  return (
    <footer className="site-footer">
      <div className="site-footer__top">
        <div className="site-footer__brand">
          <div className="site-section-label">Sunni Brothers Association</div>
          <h2>Keep learning. Keep serving.</h2>
          <p>A digital home for Quran education, family support, and thoughtful community care.</p>
          <div className="site-footer__social"><a href="mailto:hello@sunnibrothers.com" aria-label="Email Sunni Brothers Association"><Mail size={16} /></a><a href="https://www.sunnibrothers.com" target="_blank" rel="noreferrer" aria-label="Sunni Brothers Association website"><Globe2 size={16} /></a></div>
        </div>
        <div className="site-footer__links"><div><strong>Explore</strong>{explore.map(([label, href]) => <Link key={href} href={href}>{label}</Link>)}</div><div><strong>Community</strong>{community.map(([label, href]) => <Link key={href} href={href}>{label}</Link>)}</div></div>
        <div className="site-footer__cta"><div className="site-section-label">A meaningful next step</div><p>Find a class, open a surah, or support the work.</p><Link href="/education" className="site-btn-primary">Explore education <ArrowUpRight size={16} /></Link></div>
      </div>
      <div className="site-footer__bottom"><span>© {new Date().getFullYear()} Sunni Brothers Association</span><span>Built for faith, knowledge, and community.</span></div>
    </footer>
  );
}
