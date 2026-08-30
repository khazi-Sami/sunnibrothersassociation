"use client";

import type { ReactNode } from "react";
import { AlertCircle, Inbox, LoaderCircle, Search } from "lucide-react";

export function SbaPageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: string; actions?: ReactNode }) {
  return <header className="sba-page-header"><div>{eyebrow && <span className="sba-eyebrow">{eyebrow}</span>}<h1>{title}</h1>{description && <p>{description}</p>}</div>{actions && <div className="sba-page-actions">{actions}</div>}</header>;
}

export function SbaStatCard({ label, value, note, tone = "default" }: { label: string; value: ReactNode; note?: string; tone?: "default" | "green" | "gold" }) {
  return <article className={`sba-stat sba-stat--${tone}`}><span>{label}</span><strong>{value}</strong>{note && <small>{note}</small>}</article>;
}

export function SbaStatusBadge({ value }: { value: string }) {
  const normalized = value.toLowerCase().replaceAll("_", "-");
  return <span className={`sba-badge sba-badge--${normalized}`}>{value.replaceAll("_", " ")}</span>;
}

export function SbaSearch({ value, onChange, placeholder = "Search" }: { value: string; onChange: (value: string) => void; placeholder?: string }) {
  return <label className="sba-search"><Search size={17} aria-hidden="true" /><span className="sr-only">{placeholder}</span><input value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} /></label>;
}

export function SbaEmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return <div className="sba-state"><Inbox size={26} aria-hidden="true" /><strong>{title}</strong>{description && <p>{description}</p>}{action}</div>;
}

export function SbaLoadingState({ label = "Loading…" }: { label?: string }) {
  return <div className="sba-state" role="status"><LoaderCircle className="sba-spin" size={24} aria-hidden="true" /><strong>{label}</strong></div>;
}

export function SbaErrorState({ message }: { message: string }) {
  return <div className="sba-state sba-state--error" role="alert"><AlertCircle size={24} aria-hidden="true" /><strong>Something needs attention</strong><p>{message}</p></div>;
}

export function SbaConfirmDialog({ open, title, description, confirmLabel = "Confirm", busy, onCancel, onConfirm }: { open: boolean; title: string; description: string; confirmLabel?: string; busy?: boolean; onCancel: () => void; onConfirm: () => void }) {
  if (!open) return null;
  return <div className="sba-dialog-backdrop" role="presentation" onMouseDown={onCancel}><section className="sba-dialog" role="alertdialog" aria-modal="true" aria-labelledby="sba-confirm-title" onMouseDown={event => event.stopPropagation()}><span className="sba-eyebrow">Please confirm</span><h2 id="sba-confirm-title">{title}</h2><p>{description}</p><div className="sba-dialog-actions"><button type="button" className="site-btn-secondary" onClick={onCancel} disabled={busy}>Cancel</button><button type="button" className="sba-btn-danger" onClick={onConfirm} disabled={busy}>{busy ? "Working…" : confirmLabel}</button></div></section></div>;
}

export function SbaDataTable({ headers, children }: { headers: string[]; children: ReactNode }) {
  return <div className="sba-table-wrap"><table className="sba-table"><thead><tr>{headers.map(header => <th key={header} scope="col">{header}</th>)}</tr></thead><tbody>{children}</tbody></table></div>;
}
