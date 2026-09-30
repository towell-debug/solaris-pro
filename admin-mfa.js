"use strict";

async function hyqdEnsureAdminMfa() {
    const client = getHousingSupabaseClient();
    const assurance = await client.auth.mfa.getAuthenticatorAssuranceLevel();
    if (assurance.error) throw assurance.error;
    if (assurance.data?.currentLevel === "aal2" && assurance.data?.nextLevel === "aal2") return;
    const panel = document.getElementById("adminMfaPanel");
    const code = document.getElementById("adminMfaCode");
    const setup = document.getElementById("adminMfaSetup");
    const feedback = document.getElementById("adminMfaMessage");
    const select = document.getElementById("adminMfaFactor");
    const verify = document.getElementById("adminMfaVerify");
    const qr = document.getElementById("adminMfaQr");
    const secret = document.getElementById("adminMfaSecret");
    panel.hidden = false;
    document.getElementById("loading").style.display = "none";
    const factors = await client.auth.mfa.listFactors();
    if (factors.error) throw factors.error;
    const verified = (factors.data?.totp || []).filter(f => f.status === "verified");
    for (const factor of verified) {
        const option = document.createElement("option");
        option.value = factor.id;
        option.textContent = factor.friendly_name || "Application d’authentification";
        select.appendChild(option);
    }
    let factorId = verified[0]?.id || null;
    select.hidden = verified.length < 2;
    select.onchange = () => { factorId = select.value; };
    setup.hidden = verified.length > 0;
    verify.disabled = !factorId;
    feedback.textContent = verified.length
        ? "Saisissez le code de votre application d’authentification."
        : "Associez une application d’authentification pour protéger votre compte administrateur.";
    document.getElementById("adminMfaLogout").onclick = async () => {
        await logoutSupabaseUser();
        window.location.replace("login.html?logout=1");
    };
    return new Promise(resolve => {
        setup.onclick = async () => {
            if (setup.disabled) return;
            setup.disabled = true;
            try {
                // Nettoyer uniquement les inscriptions inachevées créées par cet écran.
                const currentFactors = await client.auth.mfa.listFactors();
                if (currentFactors.error) throw currentFactors.error;
                for (const factor of currentFactors.data?.all || []) {
                    if (factor.factor_type === "totp" && factor.status === "unverified" && factor.friendly_name === "Solaris Pro administration") {
                        const removed = await client.auth.mfa.unenroll({ factorId: factor.id });
                        if (removed.error) throw removed.error;
                    }
                }
                const enrolled = await client.auth.mfa.enroll({ factorType: "totp", friendlyName: "Solaris Pro administration", issuer: "Solaris Pro" });
                if (enrolled.error) throw enrolled.error;
                factorId = enrolled.data.id;
                const svg = enrolled.data.totp.qr_code;
                qr.src = svg.startsWith("data:image/") ? svg : "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
                secret.value = enrolled.data.totp.secret;
                document.getElementById("adminMfaEnrollment").hidden = false;
                setup.hidden = true;
                verify.disabled = false;
                feedback.textContent = "Scannez le QR code ou saisissez la clé dans votre application, puis entrez le code à 6 chiffres. Gardez cette clé confidentielle.";
                code.focus();
            } catch (error) {
                feedback.textContent = error?.message || "Configuration impossible. Réessayez.";
            } finally { setup.disabled = false; }
        };
        document.getElementById("adminMfaForm").onsubmit = async event => {
            event.preventDefault();
            if (verify.disabled || !factorId) return;
            if (!/^\d{6}$/.test(code.value.trim())) {
                feedback.textContent = "Saisissez les 6 chiffres du code.";
                return;
            }
            verify.disabled = true;
            try {
                const result = await client.auth.mfa.challengeAndVerify({ factorId, code: code.value.trim() });
                if (result.error) throw result.error;
                const level = await client.auth.mfa.getAuthenticatorAssuranceLevel();
                if (level.error || level.data?.currentLevel !== "aal2") throw level.error || new Error("Vérification non confirmée. Réessayez.");
                code.value = "";
                secret.value = "";
                qr.removeAttribute("src");
                panel.hidden = true;
                resolve();
            } catch (error) {
                feedback.textContent = error?.message || "Code invalide ou expiré. Réessayez avec le code actuel.";
                code.value = "";
                code.focus();
            } finally { verify.disabled = false; }
        };
    });
}

async function hyqdConfirmAdminServerProtection(role = "admin") {
    const { error } = await getHousingSupabaseClient().rpc(role === "support_agent" ? "hyqd_record_support_access" : "hyqd_record_admin_access");
    const status = document.getElementById("adminSecurityStatus");
    if (error?.code === "PGRST202" && role !== "support_agent") {
        status.textContent = "Code MFA configuré. Installation SQL encore nécessaire pour protéger les accès serveur.";
        return;
    }
    if (error) throw error;
    status.textContent = "Double authentification vérifiée · Protection serveur active";
}
