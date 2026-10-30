import { AppShell } from "@/components/AppShell";
import { ReceiptScanCard } from "@/components/ReceiptScanCard";

export default function AjouterPage() {
  return (
    <AppShell title="Ajouter un achat" eyebrow="Photo du reçu · saisie rapide · PDF">
      <div className="narrow">
        <ReceiptScanCard />
      </div>
    </AppShell>
  );
}
