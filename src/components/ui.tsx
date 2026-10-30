"use client";

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";

export async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, headers: { ...(init?.body instanceof FormData ? {} : { "Content-Type": "application/json" }), ...init?.headers } });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || (response.status === 404 ? "Ce service n’est pas encore disponible. Réessaie un peu plus tard." : "Impossible de charger ou d’enregistrer ces données. Réessaie."));
  return payload as T;
}

export function useResource<T>(url: string, interval = 0) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const reload = useCallback(() => setRevision(n => n + 1), []);
  useEffect(() => {
    let live = true;
    const controller = new AbortController();
    async function read() {
      try {
        const value = await api<T>(url, { signal: controller.signal });
        if (live) { setData(value); setError(""); }
      } catch (e) {
        if (live) setError(e instanceof Error ? e.message : "Connexion interrompue. Réessaie.");
      } finally { if (live) setLoading(false); }
    }
    void read();
    const timer = interval ? setInterval(() => void read(), interval) : undefined;
    return () => { live = false; controller.abort(); clearInterval(timer); };
  }, [url, revision, interval]);
  return { data, error, loading, reload };
}

export function Notice({ error, children, retry }: { error?: string; children?: ReactNode; retry?: () => void }) {
  if (!error && !children) return null;
  return <div className="notice" role={error ? "alert" : "status"}><span>{error ? "⚠ " : ""}{error || children}</span>{retry && <button className="btn" onClick={retry}>Réessayer</button>}</div>;
}

export function Dialog({ title, children, onClose, drawer = false }: { title: string; children: ReactNode; onClose: () => void; drawer?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => {
    const el = ref.current;
    const previous = document.activeElement as HTMLElement | null;
    el?.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { el?.close(); document.body.style.overflow = overflow; previous?.focus(); };
  }, []);
  return <dialog ref={ref} className={drawer ? "dialog drawer" : "dialog"} aria-labelledby={id} onCancel={onClose}>
    <header className="panel-head"><h2 id={id}>{title}</h2><button className="btn" onClick={onClose} aria-label="Fermer le panneau">Fermer</button></header>{children}
  </dialog>;
}

export function ConfirmDelete({ title, detail, onClose, onConfirm }: { title: string; detail: string; onClose: () => void; onConfirm: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return <Dialog title={title} onClose={onClose}><p>{detail}</p><Notice error={error}/><div className="actions"><button className="btn" onClick={onClose}>Annuler</button><button className="btn primary" disabled={busy} onClick={async () => { setBusy(true); try { await onConfirm(); onClose(); } catch(e) { setError(e instanceof Error ? e.message : "Suppression impossible."); } finally { setBusy(false); } }}>{busy ? "Suppression…" : "Supprimer"}</button></div></Dialog>;
}

export type Category = { id: number; name: string; color: string; kind: string; subcategories: { id: number; name: string }[] };
export type Account = { id: number; name: string };
export function peopleFrom(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === "string");
  if (typeof value === "string") { try { return peopleFrom(JSON.parse(value)); } catch { return []; } }
  return [];
}
export function useChoices() {
  const categories = useResource<{ categories: Category[] }>("/api/categories");
  const accounts = useResource<{ accounts: Account[] }>("/api/accounts");
  const settings = useResource<{ settings?: Record<string, unknown>; people?: unknown }>("/api/settings");
  return { categories: categories.data?.categories ?? [], accounts: accounts.data?.accounts ?? [], people: peopleFrom(settings.data?.settings?.people ?? settings.data?.people), error: categories.error || accounts.error || settings.error };
}
export function StateBar({ value, max, goal = false }: { value: number; max: number; goal?: boolean }) {
  const pct = max > 0 ? value / max * 100 : 0;
  const state = goal ? (pct >= 100 ? "ok" : "neutral") : pct > 100 ? "over" : pct >= 80 ? "warn" : "ok";
  const label = goal ? (pct >= 100 ? "✓ Objectif atteint" : "Épargne en cours") : state === "over" ? "! Dépassé" : state === "warn" ? "! Attention" : "✓ Bien";
  return <div><div className="progress" role="meter" aria-label={label} aria-valuenow={value} aria-valuemin={0} aria-valuemax={Math.max(max, value)}><span className={state} style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}/></div><p className={`small state-${state}`}>{label} — {pct.toFixed(0)} %</p></div>;
}
