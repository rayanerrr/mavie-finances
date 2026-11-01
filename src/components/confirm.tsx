"use client";

import { createContext, use, useCallback, useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Confirmation intégrée à l'app (remplace window.confirm) : accessible au clavier,
 * Échap pour annuler, focus sur l'action sûre. Fournisseur composable
 * (composition-patterns « state-lift-state ») : const confirm = useConfirm();
 * if (!(await confirm({ ... }))) return;
 */

type Request = {
  title: string;
  detail?: string;
  confirmLabel?: string;
  tone?: "danger" | "neutral";
};

type Pending = Request & { resolve: (ok: boolean) => void };

const ConfirmContext = createContext<((request: Request) => Promise<boolean>) | null>(null);

export function useConfirm() {
  const confirm = use(ConfirmContext);
  if (!confirm) throw new Error("useConfirm doit être utilisé dans <ConfirmProvider>.");
  return confirm;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const cancelButton = useRef<HTMLButtonElement>(null);

  const confirm = useCallback(
    (request: Request) => new Promise<boolean>((resolve) => setPending({ ...request, resolve })),
    [],
  );

  const close = useCallback(
    (ok: boolean) => {
      pending?.resolve(ok);
      setPending(null);
    },
    [pending],
  );

  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (pending && !el.open) {
      const previous = document.activeElement as HTMLElement | null;
      el.showModal();
      cancelButton.current?.focus();
      return () => previous?.focus();
    }
    if (!pending && el.open) el.close();
  }, [pending]);

  return (
    <ConfirmContext value={confirm}>
      {children}
      <dialog
        ref={dialog}
        className="confirm-dialog"
        aria-labelledby="confirm-title"
        aria-describedby={pending?.detail ? "confirm-detail" : undefined}
        onCancel={(event) => {
          event.preventDefault();
          close(false);
        }}
      >
        {pending && (
          <>
            <h2 id="confirm-title">{pending.title}</h2>
            {pending.detail && <p id="confirm-detail">{pending.detail}</p>}
            <div className="confirm-actions">
              <button ref={cancelButton} type="button" className="confirm-cancel" onClick={() => close(false)}>
                Annuler
              </button>
              <button
                type="button"
                className={`confirm-ok ${pending.tone === "neutral" ? "" : "danger"}`}
                onClick={() => close(true)}
              >
                {pending.confirmLabel ?? "Confirmer"}
              </button>
            </div>
          </>
        )}
      </dialog>
    </ConfirmContext>
  );
}
