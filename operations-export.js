"use strict";

// Toutes les cellules sont citées ; neutralisation des formules provenant du texte utilisateur.
function hyqdCsvText(value) {
    let text = String(value ?? "");
    if (/^[\s\u0000-\u001f]*[=+@-]/.test(text) || /^[\t\r\n]/.test(text) || /^\d+$/.test(text)) text = "'" + text;
    return '"' + text.replace(/"/g, '""') + '"';
}

function hyqdCsvAmount(value) {
    if (value === null || value === undefined || value === "") return '""';
    const amount = Number(value);
    if (!Number.isFinite(amount)) throw new Error("Une opération contient un montant invalide. Export interrompu.");
    return '"' + String(amount).replace(".", ",") + '"';
}

function hyqdBuildOperationsCsv(operations, admin) {
    const headers = ["Identifiant opération", "Type", "Date (UTC)"];
    if (admin) headers.push("Identifiant utilisateur");
    headers.push("Montant brut (FCFA)", "Frais (FCFA)", "Montant net (FCFA)", "Statut", "Moyen de paiement", "Référence de transaction", "Numéro de destination");
    const statuses = { pending: "En attente", approved: "Validé", rejected: "Refusé", cancelled: "Annulé" };
    const lines = [headers.map(hyqdCsvText).join(";")];
    for (const item of operations) {
        const cells = [item.id, item.operation_type, item.created_at].map(hyqdCsvText);
        if (admin) cells.push(hyqdCsvText(item.user_id));
        cells.push(...[item.gross_amount, item.fee_amount, item.net_amount].map(hyqdCsvAmount));
        cells.push(...[statuses[item.status] || item.status, item.payment_method || item.method,
            item.payment_reference, item.destination_phone].map(hyqdCsvText));
        lines.push(cells.join(";"));
    }
    return "\uFEFF" + lines.join("\r\n") + "\r\n";
}

for (const form of document.querySelectorAll("[data-operations-export]")) {
    form.addEventListener("submit", async event => {
        event.preventDefault();
        const button = form.querySelector("button[type=submit]");
        if (button.disabled) return;
        const feedback = form.querySelector("[role=status]");
        const admin = form.dataset.operationsExport === "admin";
        const initial = button.textContent;
        button.disabled = true;
        button.textContent = "Préparation…";
        feedback.textContent = "Chargement des opérations…";
        try {
            const result = await getSupabaseOperationsForExport({ admin,
                type: form.elements.namedItem("operationType").value,
                start: form.elements.namedItem("startDate").value,
                end: form.elements.namedItem("endDate").value });
            if (!result?.success) throw new Error(result?.message || "Export impossible.");
            if (!result.operations.length) {
                feedback.textContent = "Aucune opération pour cette période.";
                return;
            }
            const csv = hyqdBuildOperationsCsv(result.operations, admin);
            const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
            const link = document.createElement("a");
            link.href = url;
            link.download = `Solaris-Pro-${admin ? "administration" : "mes-operations"}-${new Date().toISOString().slice(0, 10)}.csv`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            setTimeout(() => URL.revokeObjectURL(url), 60000);
            feedback.textContent = `${result.operations.length} opération(s) exportée(s). Consultez vos téléchargements.`;
        } catch (error) {
            feedback.textContent = error?.message || "Export impossible. Réessayez.";
        } finally {
            button.disabled = false;
            button.textContent = initial;
        }
    });
}
