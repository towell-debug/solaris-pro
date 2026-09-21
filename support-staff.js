"use strict";

function applyStaffInterface(role) {
    const limited = role === "support_agent";
    document.body.classList.toggle("staff-support-only", limited);
    if (!limited) return;
    document.querySelectorAll("[data-page]").forEach(button => {
        button.hidden = button.dataset.page !== "support";
        button.classList.toggle("active", button.dataset.page === "support");
    });
    document.querySelectorAll(".section").forEach(section => section.classList.toggle("active", section.id === "support"));
    document.getElementById("title").textContent = "Assistance";
    document.querySelector(".hero h2").textContent = "Espace agent d’assistance";
    document.querySelector(".hero p").textContent = "Prenez en charge les demandes, consultez leur historique et répondez aux clients.";
    document.querySelector(".mfa-card h1").textContent = "Protection de l’assistance";
}

function supportEventLabel(type) {
    return {taken:"Prise en charge",replied:"Réponse",closed:"Clôture",snapshot:"Dernière réponse antérieure conservée"}[type] || type;
}

function supportHistoryHtml(events) {
    if (!events.length) return '<p>Aucune intervention enregistrée pour cette demande.</p>';
    return events.map(event => {
        const content = hyqdParseSupportContent(event.message || "");
        return `<article class="support-event"><strong>${esc(supportEventLabel(event.event_type))}</strong>
        <div><small>${esc(event.actor_name || "Assistance")} · ${date(event.created_at)}</small></div>
        ${content.text ? `<p>${esc(content.text)}</p>` : ""}${supportFilesHtml(content.attachments)}</article>`;
    }).join("");
}

let supportConversationVersion = 0;
async function openSupportTicketEditor(ticketId) {
    const ticket = tickets.find(item => String(item.id) === String(ticketId));
    if (!ticket) { toast("Ticket introuvable. Actualisez les demandes."); return; }
    const version = ++supportConversationVersion;
    currentTicket = ticket;
    const content = hyqdParseSupportContent(ticket.message || "");
    $("ticketInfo").innerHTML = `<strong>${esc(ticket.subject)}</strong><p>${esc(ticket.requester_name || name(ticket.user_id))}</p>
    <p style="white-space:pre-wrap">${esc(content.text)}</p>${supportFilesHtml(content.attachments)}`;
    $("ticketReply").value = "";
    $("ticketReplyAttachments").value = "";
    $("ticketReplyAttachmentsPreview").innerHTML = "";
    $("closeTicket").checked = ticket.status === "closed";
    $("supportConversation").textContent = "Chargement de l’historique…";
    $("sendReply").disabled = true;
    openModal("replyModal");
    $("ticketInfo").querySelectorAll("[data-support-path]").forEach(button => { button.onclick=()=>openAdminSupportAttachment(button); });
    try {
        const result = await getSupabaseSupportTicketEvents(ticket.id);
        if (version !== supportConversationVersion) return;
        if (!result?.success) throw new Error(result?.message || "Historique indisponible.");
        $("supportConversation").innerHTML = supportHistoryHtml(result.events);
        $("supportConversation").querySelectorAll("[data-support-path]").forEach(button => { button.onclick=()=>openAdminSupportAttachment(button); });
        $("sendReply").disabled = false;
    } catch (error) {
        if (version === supportConversationVersion) $("supportConversation").textContent = error?.message || "Historique indisponible. Fermez puis rouvrez le ticket pour réessayer.";
    }
}

let supportActivityOffset = 0;
let supportActivityLoading = false;
let supportActivityFilter = null;
async function initializeSupportActivity() {
    if (currentStaffRole === "support_agent") return;
    const {data,error} = await getHousingSupabaseClient().rpc("hyqd_admin_support_agents");
    if (error) { $("supportActivitySummary").textContent = "Le suivi nécessite l’installation du script 01-role-assistance.sql."; return; }
    const select = $("supportActivityAgent");
    select.innerHTML = '<option value="">Tous les intervenants</option>';
    for (const agent of data || []) {
        const option = document.createElement("option");
        option.value = agent.id;
        option.textContent = `${agent.name} — ${agent.email}${agent.enabled ? "" : " (suspendu)"}`;
        select.appendChild(option);
    }
    await loadSupportActivity(true);
}

async function loadSupportActivity(reset = false) {
    if (currentStaffRole === "support_agent" || supportActivityLoading) return;
    supportActivityLoading = true;
    const submit = document.querySelector("#supportActivityFilters button[type=submit]");
    submit.disabled = true;
    $("supportActivityMore").disabled = true;
    try {
        if (reset || !supportActivityFilter) {
            supportActivityOffset = 0;
            supportActivityFilter = {p_actor:$("supportActivityAgent").value || null,
                p_from:$("supportActivityFrom").value || null,p_to:$("supportActivityTo").value || null};
            $("supportActivityBody").innerHTML = "";
        }
        if (supportActivityFilter.p_from && supportActivityFilter.p_to && supportActivityFilter.p_from > supportActivityFilter.p_to) throw new Error("La date de début doit précéder la date de fin.");
        const {data,error} = await getHousingSupabaseClient().rpc("hyqd_admin_support_activity",{...supportActivityFilter,p_offset:supportActivityOffset,p_limit:50});
        if (error) throw error;
        if (!data?.success) throw new Error("Suivi indisponible.");
        const totals = data.totals || {};
        $("supportActivitySummary").textContent = `${totals.taken || 0} prises en charge · ${totals.replies || 0} réponses · ${totals.closed || 0} clôtures`;
        const events = data.events || [];
        $("supportActivityBody").insertAdjacentHTML("beforeend",events.map(event => {
            const content=hyqdParseSupportContent(event.message || "");
            return `<tr><td data-label="Date">${date(event.created_at)}</td><td data-label="Intervenant">${esc(event.actor_name)}</td>
            <td data-label="Ticket"><button type="button" class="btn" data-activity-ticket="${esc(event.ticket_id)}">${esc(event.subject)}</button></td>
            <td data-label="Action">${esc(supportEventLabel(event.event_type))}</td><td data-label="Réponse" style="white-space:pre-wrap;overflow-wrap:anywhere">${esc(content.text || "—")}</td></tr>`;
        }).join(""));
        supportActivityOffset += events.length;
        $("supportActivityMore").hidden = supportActivityOffset >= Number(totals.events || 0);
        if (!supportActivityOffset) $("supportActivityBody").innerHTML = '<tr><td colspan="5">Aucune intervention pour cette sélection.</td></tr>';
        $("supportActivityBody").querySelectorAll("[data-activity-ticket]").forEach(button => {button.onclick=()=>openSupportTicketEditor(button.dataset.activityTicket);});
    } catch (error) {
        $("supportActivitySummary").textContent = error?.message || "Suivi indisponible.";
        $("supportActivityMore").hidden = true;
    } finally {
        supportActivityLoading = false;
        submit.disabled = false;
        $("supportActivityMore").disabled = false;
    }
}

document.getElementById("supportActivityFilters").addEventListener("submit",event=>{event.preventDefault();loadSupportActivity(true);});
document.getElementById("supportActivityMore").addEventListener("click",()=>loadSupportActivity(false));

let supportStaffRefreshRunning = false;
setInterval(async () => {
    if (document.hidden || supportStaffRefreshRunning || !currentStaffRole || document.querySelector(".modal.show")) return;
    supportStaffRefreshRunning = true;
    try {
        if (document.getElementById("supportActivity").classList.contains("active") && currentStaffRole !== "support_agent") {
            // Do not apply filters that the owner is still editing.
            const sameFilters = supportActivityFilter && supportActivityFilter.p_actor === ($("supportActivityAgent").value || null)
                && supportActivityFilter.p_from === ($("supportActivityFrom").value || null)
                && supportActivityFilter.p_to === ($("supportActivityTo").value || null);
            if (sameFilters && supportActivityOffset <= 50) await loadSupportActivity(true);
        } else if (currentStaffRole === "support_agent") {
            await loadAdminData();
        }
    } catch (error) {
        // Keep the currently displayed tickets if the connection is temporarily unavailable.
    } finally { supportStaffRefreshRunning = false; }
}, 30000);
