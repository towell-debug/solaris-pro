"use strict";

/* ============================================================
   SOLARIS PRO — CONFIGURATION SUPABASE
============================================================ */

const HYQD_SUPABASE_CONFIG = Object.freeze({
    URL: "https://ffffusbzfrnxkbtliops.supabase.co",
    PUBLISHABLE_KEY: "sb_publishable_U13C8KNa578dhpmqwc4NDg_FJh6rZBU",
    APP_NAME: "Solaris Pro",
    HOME_PAGE: "index.html",
    LOGIN_PAGE: "login.html",
    REGISTER_PAGE: "register.html",
    DASHBOARD_PAGE: "dashboard.html",
    ADMIN_PAGE: "admin.html"
});

const HYQD_TURNSTILE_SITE_KEY = "";
let HYQD_CAPTCHA_TOKEN = "";
let HYQD_CAPTCHA_WIDGET_ID = null;

function hyqdGetCaptchaToken() {
    const token = String(HYQD_CAPTCHA_TOKEN || "").trim();
    return token || undefined;
}

function hyqdResetCaptcha() {
    HYQD_CAPTCHA_TOKEN = "";
    if (window.turnstile && HYQD_CAPTCHA_WIDGET_ID !== null) {
        try {
            window.turnstile.reset(HYQD_CAPTCHA_WIDGET_ID);
        } catch (error) {
            console.warn("Réinitialisation Turnstile impossible.", error);
        }
    }
}

function hyqdRenderTurnstile() {
    const container = document.getElementById("hyqd-turnstile");
    if (!container || !window.turnstile || HYQD_CAPTCHA_WIDGET_ID !== null) {
        return;
    }
    HYQD_CAPTCHA_WIDGET_ID = window.turnstile.render(container, {
        sitekey: HYQD_TURNSTILE_SITE_KEY,
        theme: "light",
        size: "flexible",
        language: "fr",
        callback(token) {
            HYQD_CAPTCHA_TOKEN = token;
        },
        "expired-callback"() {
            HYQD_CAPTCHA_TOKEN = "";
        },
        "error-callback"() {
            HYQD_CAPTCHA_TOKEN = "";
        }
    });
}

function hyqdInitializeTurnstile() {
    if (!HYQD_TURNSTILE_SITE_KEY) return;
    const page = window.location.pathname.split("/").pop().toLowerCase();
    if (!["register.html", "login.html", "forgot-password.html"].includes(page)) {
        return;
    }
    const form =
        document.getElementById("registerForm") ||
        document.getElementById("loginForm") ||
        document.getElementById("requestForm");
    if (!form) {
        return;
    }
    const firstSubmit = form.querySelector('[type="submit"]');
    if (!firstSubmit) {
        return;
    }
    const container = document.createElement("div");
    container.id = "hyqd-turnstile";
    container.style.cssText = "width:100%;min-height:70px;margin:14px 0;display:flex;align-items:center;justify-content:center;overflow:hidden";
    firstSubmit.parentNode.insertBefore(container, firstSubmit);
    if (window.turnstile) {
        hyqdRenderTurnstile();
        return;
    }
    window.hyqdTurnstileLoaded = hyqdRenderTurnstile;
    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?onload=hyqdTurnstileLoaded&render=explicit";
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", hyqdInitializeTurnstile, { once: true });
} else {
    hyqdInitializeTurnstile();
}


/* ============================================================
   INITIALISATION
============================================================ */

function initializeHousingSupabase() {

    if (!window.supabase) {
        throw new Error(
            "La bibliothèque Supabase n'est pas chargée."
        );
    }

    const key = String(
        HYQD_SUPABASE_CONFIG.PUBLISHABLE_KEY || ""
    );

    if (
        key.includes("service_role") ||
        key.startsWith("sb_secret_")
    ) {
        throw new Error(
            "Une clé secrète Supabase ne doit jamais être utilisée dans le navigateur."
        );
    }

    return window.supabase.createClient(
        HYQD_SUPABASE_CONFIG.URL,
        HYQD_SUPABASE_CONFIG.PUBLISHABLE_KEY,
        {
            auth: {
                persistSession: true,
                autoRefreshToken: true,
                detectSessionInUrl: true
            }
        }
    );
}


const HYQD_SUPABASE_CLIENT =
    initializeHousingSupabase();

window.HYQD_SUPABASE_CLIENT =
    HYQD_SUPABASE_CLIENT;

window.hyqdSupabase =
    HYQD_SUPABASE_CLIENT;

window.housingSupabase =
    HYQD_SUPABASE_CLIENT;


function getHousingSupabaseClient() {
    return HYQD_SUPABASE_CLIENT;
}


/* ============================================================
   OUTILS
============================================================ */

function hyqdCleanText(value) {
    return String(value ?? "").trim();
}


function hyqdNormalizeEmail(value) {
    return hyqdCleanText(value).toLowerCase();
}


function hyqdNormalizePhone(value) {

    let phone =
        hyqdCleanText(value)
            .replace(/[\s().-]+/g, "");

    if (!phone) {
        return "";
    }

    // Côte d’Ivoire (+225), Burkina Faso (+226) et Mali (+223).
    if (/^\+(225|226|223)\d+$/.test(phone)) {
        return phone;
    }

    if (/^00(225|226|223)\d+$/.test(phone)) {
        return "+" + phone.substring(2);
    }

    if (/^(225|226|223)\d+$/.test(phone)) {
        return "+" + phone;
    }

    // Compatibilité avec les anciens champs locaux ivoiriens.
    phone = phone.replace(/^0+/, "");

    return "+225" + phone;
}


function hyqdNormalizeSupportedPhone(value) {

    let phone =
        hyqdCleanText(value)
            .replace(/[\s().-]+/g, "");

    if (/^00(225|226|223)\d+$/.test(phone)) {
        phone = "+" + phone.substring(2);
    } else if (/^(225|226|223)\d+$/.test(phone)) {
        phone = "+" + phone;
    }

    const valid =
        /^\+225\d{10}$/.test(phone) ||
        /^\+226\d{8}$/.test(phone) ||
        /^\+223\d{8}$/.test(phone);

    if (!valid) {
        throw new Error(
            "Numéro invalide. Utilisez un numéro Côte d’Ivoire (+225, 10 chiffres), Burkina Faso (+226, 8 chiffres) ou Mali (+223, 8 chiffres)."
        );
    }

    return phone;
}

function hyqdSafeMessage(
    error,
    fallback = "Une erreur est survenue."
) {

    if (!error) {
        return fallback;
    }

    if (typeof error === "string") {
        return error;
    }

    return error.message || fallback;
}


function hyqdRpcResult(
    data,
    fallbackMessage
) {

    if (
        data &&
        typeof data === "object" &&
        data.success === false
    ) {
        return data;
    }

    return {
        success: true,
        ...(data && typeof data === "object"
            ? data
            : { data }),
        message:
            data?.message ||
            fallbackMessage
    };
}


/* ============================================================
   SESSION ET AUTHENTIFICATION
============================================================ */

async function getSupabaseSession() {

    try {

        const { data, error } =
            await HYQD_SUPABASE_CLIENT
                .auth
                .getSession();

        if (error) {
            throw error;
        }

        return {
            success: true,
            session: data?.session || null
        };

    } catch (error) {

        return {
            success: false,
            session: null,
            message: hyqdSafeMessage(error)
        };
    }
}


async function getSupabaseUser() {

    try {

        const { data, error } =
            await HYQD_SUPABASE_CLIENT
                .auth
                .getUser();

        if (error) {
            throw error;
        }

        return {
            success: true,
            user: data?.user || null
        };

    } catch (error) {

        return {
            success: false,
            user: null,
            message: hyqdSafeMessage(error)
        };
    }
}


async function registerSupabaseUser({
    fullName,
    email,
    phone,
    password,
    referralCode
}) {

    try {

        const captchaToken =
            hyqdGetCaptchaToken();

        const cleanName =
            hyqdCleanText(fullName);

        const cleanEmail =
            hyqdNormalizeEmail(email);

        const cleanPhone =
            hyqdNormalizeSupportedPhone(phone);

        const cleanReferral =
            hyqdCleanText(referralCode)
                .toUpperCase();

        if (!cleanName) {
            throw new Error(
                "Entrez votre nom complet."
            );
        }

        if (!cleanEmail) {
            throw new Error(
                "Entrez une adresse e-mail."
            );
        }

        if (
            !password ||
            password.length < 8
        ) {
            throw new Error(
                "Le mot de passe doit contenir au moins 8 caractères."
            );
        }

        const { data, error } =
            await HYQD_SUPABASE_CLIENT
                .auth
                .signUp({
                    email: cleanEmail,
                    password,
                    options: {
                        captchaToken,
                        data: {
                            full_name:
                                cleanName,
                            phone:
                                cleanPhone,
                            referral_code_entered:
                                cleanReferral || null
                        }
                    }
                });

        if (error) {
            throw error;
        }

        hyqdResetCaptcha();

        return {
            success: true,
            user: data?.user || null,
            session: data?.session || null,
            requiresEmailConfirmation: false,
            message:
                "Inscription réussie. Votre compte est actif."
        };

    } catch (error) {

        hyqdResetCaptcha();

        return {
            success: false,
            message: hyqdSafeMessage(
                error,
                "Inscription impossible."
            )
        };
    }
}


async function loginSupabaseUser(
    email,
    password
) {

    try {

        const captchaToken =
            hyqdGetCaptchaToken();

        const { data, error } =
            await HYQD_SUPABASE_CLIENT
                .auth
                .signInWithPassword({
                    email:
                        hyqdNormalizeEmail(email),
                    password,
                    options: {
                        captchaToken
                    }
                });

        if (error) {
            throw error;
        }

        hyqdResetCaptcha();

        return {
            success: true,
            user: data?.user || null,
            session: data?.session || null,
            message:
                "Connexion réussie."
        };

    } catch (error) {

        hyqdResetCaptcha();

        return {
            success: false,
            message: hyqdSafeMessage(
                error,
                "Connexion impossible."
            )
        };
    }
}


async function logoutSupabaseUser() {

    try {

        const { error } =
            await HYQD_SUPABASE_CLIENT
                .auth
                .signOut();

        if (error) {
            throw error;
        }

        return {
            success: true
        };

    } catch (error) {

        return {
            success: false,
            message: hyqdSafeMessage(error)
        };
    }
}


async function requireSupabaseAuth(
    options = {}
) {

    const redirect =
        Boolean(options?.redirect);

    const result =
        await getSupabaseUser();

    if (
        !result.success ||
        !result.user
    ) {

        if (
            redirect &&
            typeof window !== "undefined"
        ) {

            const currentPage =
                window.location.pathname
                    .split("/")
                    .pop()
                    .toLowerCase();
                       if (
                currentPage !==
                HYQD_SUPABASE_CONFIG.LOGIN_PAGE
            ) {
                window.location.replace(
                    HYQD_SUPABASE_CONFIG.LOGIN_PAGE +
                    "?auth=required"
                );
            }

            return null;
        }

        return {
            success: false,
            authorized: false,
            reason: "not_authenticated",
            user: null
        };
    }

    return Object.assign(
        {},
        result.user,
        {
            success: true,
            authorized: true,
            reason: null,
            user: result.user
        }
    );
}


/* ============================================================
   RÔLES ET ACCÈS ADMINISTRATEUR
============================================================ */

async function getSupabaseCurrentUserRole() {

    try {

        const auth =
            await requireSupabaseAuth();

        if (!auth?.authorized) {
            return {
                success: false,
                role: null,
                message:
                    "Utilisateur non connecté."
            };
        }

        const { data, error } =
            await HYQD_SUPABASE_CLIENT
                .from("user_roles")
                .select("role")
                .eq(
                    "user_id",
                    auth.user.id
                )
                .maybeSingle();

        if (error) {
            throw error;
        }

        const baseRole = String(data?.role || "user");
        if (baseRole === "user") {
            const staff = await HYQD_SUPABASE_CLIENT.from("support_agents")
                .select("enabled").eq("user_id",auth.user.id).maybeSingle();
            if (staff.error && !["42P01","PGRST205"].includes(staff.error.code)) throw staff.error;
            if (staff.data?.enabled) return {success:true,role:"support_agent"};
        }
        return {success:true,role:baseRole};

    } catch (error) {

        return {
            success: false,
            role: null,
            message: hyqdSafeMessage(error)
        };
    }
}


async function requireSupabaseSupportStaff({allowMfaSetup=false} = {}) {
    const auth = await requireSupabaseAuth();
    if (!auth?.authorized) return {authorized:false,reason:"not_authenticated",user:null};
    const roleResult = await getSupabaseCurrentUserRole();
    const role = String(roleResult?.role || "user");
    if (!roleResult?.success || !["admin","super_admin","administrateur","support_agent"].includes(role)) {
        return {authorized:false,reason:"not_staff",user:auth.user,role};
    }
    if (!allowMfaSetup) {
        const assurance = await HYQD_SUPABASE_CLIENT.auth.mfa.getAuthenticatorAssuranceLevel();
        if (assurance.error || assurance.data?.currentLevel !== "aal2") {
            return {authorized:false,reason:"mfa_required",user:auth.user,role};
        }
    }
    return {authorized:true,user:auth.user,role};
}

async function requireSupabaseAdmin({ allowMfaSetup = false } = {}) {

    const auth =
        await requireSupabaseAuth();

    if (!auth?.authorized) {
        return {
            authorized: false,
            reason: "not_authenticated",
            user: null,
            role: null
        };
    }

    const roleResult =
        await getSupabaseCurrentUserRole();

    const role =
        String(
            roleResult?.role || "user"
        ).toLowerCase();

    const authorized =
        role === "admin" ||
        role === "super_admin" ||
        role === "administrateur";

    if (authorized && !allowMfaSetup) {
        const assurance = await HYQD_SUPABASE_CLIENT.auth.mfa.getAuthenticatorAssuranceLevel();
        if (assurance.error || assurance.data?.currentLevel !== "aal2") {
            return { authorized: false, reason: "mfa_required", user: auth.user, role };
        }
    }

    return {
        authorized,
        reason:
            authorized
                ? null
                : "not_admin",
        user: auth.user,
        role
    };
}


/* ============================================================
   MOT DE PASSE
============================================================ */

async function requestSupabasePasswordReset(
    email
) {

    try {

        const captchaToken =
            hyqdGetCaptchaToken();

        const redirectTo =
            new URL(
                "forgot-password.html",
                window.location.href
            ).href;

        const { error } =
            await HYQD_SUPABASE_CLIENT
                .auth
                .resetPasswordForEmail(
                    hyqdNormalizeEmail(email),
                    {
                        redirectTo,
                        captchaToken
                    }
                );

        if (error) {
            throw error;
        }

        hyqdResetCaptcha();

        return {
            success: true,
            message:
                "E-mail de réinitialisation envoyé."
        };

    } catch (error) {

        hyqdResetCaptcha();

        return {
            success: false,
            message: hyqdSafeMessage(error)
        };
    }
}


async function updateSupabasePassword(
    newPassword
) {

    try {

        if (
            !newPassword ||
            newPassword.length < 8
        ) {
            throw new Error(
                "Le nouveau mot de passe doit contenir au moins 8 caractères."
            );
        }

        const { error } =
            await HYQD_SUPABASE_CLIENT
                .auth
                .updateUser({
                    password:
                        newPassword
                });

        if (error) {
            throw error;
        }

        return {
            success: true,
            message:
                "Mot de passe mis à jour."
        };

    } catch (error) {

        return {
            success: false,
            message: hyqdSafeMessage(error)
        };
    }
}


/* ============================================================
   PROFIL
============================================================ */

async function getSupabaseProfile(
    userId = null
) {

    try {

        let targetUserId =
            userId;

        if (!targetUserId) {

            const auth =
                await requireSupabaseAuth();

            if (!auth?.authorized) {
                throw new Error(
                    "Utilisateur non connecté."
                );
            }

            targetUserId =
                auth.user.id;
        }

        const { data, error } =
            await HYQD_SUPABASE_CLIENT
                .from("profiles")
                .select("*")
                .eq(
                    "id",
                    targetUserId
                )
                .maybeSingle();

        if (error) {
            throw error;
        }

        return {
            success: true,
            profile: data || null,
            data: data || null
        };

    } catch (error) {

        return {
            success: false,
            profile: null,
            data: null,
            message: hyqdSafeMessage(error)
        };
    }
}


async function updateSupabaseProfile({
    fullName,
    phone
}) {

    try {

        const { data, error } =
            await HYQD_SUPABASE_CLIENT
                .rpc(
                    "update_my_profile",
                    {
                        p_full_name:
                            hyqdCleanText(fullName),
                        p_phone:
                            hyqdNormalizePhone(phone)
                    }
                );

        if (error) {
            throw error;
        }

        return hyqdRpcResult(
            data,
            "Profil mis à jour."
        );

    } catch (error) {

        return {
            success: false,
            message: hyqdSafeMessage(error)
        };
    }
}


/* ============================================================
   CHANGEMENT SÉCURISÉ DU NUMÉRO DE TÉLÉPHONE
============================================================ */

async function requestSupabasePhoneChange(
    newPhone
) {

    try {

        const cleanPhone =
            hyqdNormalizeSupportedPhone(newPhone);

        if (!cleanPhone) {
            throw new Error(
                "Entrez un nouveau numéro de téléphone."
            );
        }

        const { data, error } =
            await HYQD_SUPABASE_CLIENT.rpc(
                "request_phone_change",
                {
                    p_new_phone: cleanPhone
                }
            );

        if (error) {
            throw error;
        }

        return hyqdRpcResult(
            data,
            "Demande de changement envoyée à l’administrateur."
        );

    } catch (error) {

        return {
            success: false,
            message: hyqdSafeMessage(
                error,
                "Demande de changement impossible."
            )
        };
    }
}


async function getSupabasePhoneChangeRequests() {

    try {

        const auth =
            await requireSupabaseAuth();

        if (!auth?.authorized) {
            throw new Error(
                "Utilisateur non connecté."
            );
        }

        const { data, error } =
            await HYQD_SUPABASE_CLIENT
                .from("phone_change_requests")
                .select("*")
                .eq("user_id", auth.user.id)
                .order(
                    "created_at",
                    { ascending: false }
                );

        if (error) {
            throw error;
        }

        return {
            success: true,
            requests: data || [],
            data: data || []
        };

    } catch (error) {

        return {
            success: false,
            requests: [],
            data: [],
            message: hyqdSafeMessage(error)
        };
    }
}


async function adminGetSupabasePhoneChangeRequests() {

    const result =
        await hyqdAdminSelect(
            "phone_change_requests"
        );

    return {
        ...result,
        requests: result.data || []
    };
}


async function adminGetSupabaseAuditLogs() {

    try {

        const { data, error } =
            await HYQD_SUPABASE_CLIENT.rpc(
                "admin_get_audit_logs"
            );

        if (error) {
            throw error;
        }

        return {
            success: true,
            logs: data || [],
            data: data || []
        };

    } catch (error) {

        return {
            success: false,
            logs: [],
            data: [],
            message: hyqdSafeMessage(error)
        };
    }
}


async function adminGetSupabaseFraudAlerts() {

    try {

        const { data, error } =
            await HYQD_SUPABASE_CLIENT.rpc(
                "admin_get_fraud_alerts"
            );

        if (error) {
            throw error;
        }

        return {
            success: true,
            alerts: data || [],
            data: data || []
        };

    } catch (error) {

        return {
            success: false,
            alerts: [],
            data: [],
            message: hyqdSafeMessage(error)
        };
    }
}


async function adminResolveSupabaseFraudAlert(
    alertId
) {

    try {

        const { data, error } =
            await HYQD_SUPABASE_CLIENT.rpc(
                "admin_resolve_fraud_alert",
                {
                    p_alert_id: alertId
                                   }
            );

        if (error) {
            throw error;
        }

        return hyqdRpcResult(
            data,
            "Alerte clôturée."
        );

    } catch (error) {

        return {
            success: false,
            message: hyqdSafeMessage(error)
        };
    }
}


async function adminReviewSupabasePhoneChange({
    requestId,
    approve,
    note
}) {

    try {

        const { data, error } =
            await HYQD_SUPABASE_CLIENT.rpc(
                "admin_review_phone_change",
                {
                    p_request_id: requestId,
                    p_approve: Boolean(approve),
                    p_note:
                        hyqdCleanText(note) ||
                        null
                }
            );

        if (error) {
            throw error;
        }

        return hyqdRpcResult(
            data,
            approve
                ? "Changement de numéro validé."
                : "Changement de numéro refusé."
        );

    } catch (error) {

        return {
            success: false,
            message: hyqdSafeMessage(
                error,
                "Traitement du changement impossible."
            )
        };
    }
}


/* ============================================================
   HISTORIQUE DES BONUS DE PARRAINAGE
============================================================ */

async function getSupabaseReferralRewards() {

    try {

        const { data, error } =
            await HYQD_SUPABASE_CLIENT.rpc(
                "get_my_referral_rewards"
            );

        if (error) {
            throw error;
        }

        return {
            success: true,
            rewards: data || [],
            data: data || []
        };

    } catch (error) {

        return {
            success: false,
            rewards: [],
            data: [],
            message: hyqdSafeMessage(error)
        };
    }
}


async function adminGetSupabaseReferralRewards() {

    try {

        const { data, error } =
            await HYQD_SUPABASE_CLIENT.rpc(
                "admin_get_referral_rewards"
            );

        if (error) {
            throw error;
        }

        return {
            success: true,
            rewards: data || [],
            data: data || []
        };

    } catch (error) {

        return {
            success: false,
            rewards: [],
            data: [],
            message: hyqdSafeMessage(error)
        };
    }
}

/* ============================================================
   PACKS D’INVESTISSEMENT
============================================================ */

async function getSupabaseInvestmentPacks() {

    try {

        const { data, error } =
            await HYQD_SUPABASE_CLIENT
                .from("investment_packs")
                .select("*")
                .eq("is_active", true)
                .order(
                    "sort_order",
                    { ascending: true }
                );

        if (error) {
            throw error;
        }

        return {
            success: true,
            packs: data || [],
            data: data || []
        };

    } catch (error) {

        return {
            success: false,
            packs: [],
            data: [],
            message: hyqdSafeMessage(error)
        };
    }
}


/* ============================================================
   DÉPÔTS
============================================================ */

async function requestSupabaseDeposit({
    amount,
    method,
    reference
}) {

    try {

        if (!String(reference || "").replace(/\s/g, "")) {
            throw new Error("Saisissez le numéro de transaction du paiement.");
        }
        const numericAmount =
            Number(amount);

        if (
            !Number.isFinite(numericAmount) ||
            numericAmount < 500
        ) {
            throw new Error(
                "Le montant minimum de dépôt est de 500 FCFA."
            );
        }

        const { data, error } =
            await HYQD_SUPABASE_CLIENT.rpc(
                "request_deposit",
                {
                    p_amount: numericAmount,
                    p_method:
                        hyqdCleanText(method),
                    p_reference:
                        hyqdCleanText(reference) ||
                        null
                }
            );

        if (error) {
            if (error.code === "23505") {
                const pending = String(error.message || "").includes("one_pending_per_user");
                throw new Error(pending
                    ? "Vous avez déjà un dépôt en attente. Consultez votre historique avant de recommencer."
                    : "Cette référence de paiement a déjà été enregistrée. Vérifiez votre historique ou contactez l’assistance.");
            }
            throw error;
        }

        return hyqdRpcResult(
            data,
            "Demande de dépôt enregistrée."
        );

    } catch (error) {

        return {
            success: false,
            message: hyqdSafeMessage(
                error,
                "Dépôt impossible."
            )
        };
    }
}


/* ============================================================
   RETRAITS
============================================================ */

async function requestSupabaseWithdrawal({
    amount,
    method,
    destinationPhone
}) {

    try {

        const numericAmount =
            Number(amount);

        if (
            !Number.isFinite(numericAmount) ||
            numericAmount <= 0
        ) {
            throw new Error(
                "Entrez un montant de retrait valide."
            );
        }

        const { data, error } =
            await HYQD_SUPABASE_CLIENT.rpc(
                "request_withdrawal",
                {
                    p_amount: numericAmount,
                    p_method:
                        hyqdCleanText(method),
                    p_destination_phone:
                        hyqdNormalizeSupportedPhone(
                            destinationPhone
                        )
                }
            );

        if (error) {
            throw error;
        }

        return hyqdRpcResult(
            data,
            "Demande de retrait enregistrée."
        );

    } catch (error) {

        return {
            success: false,
            message: hyqdSafeMessage(
                error,
                "Retrait impossible."
            )
        };
    }
}


/* ============================================================
   INVESTISSEMENTS
============================================================ */

async function investSupabasePack(packId) {

    try {

        const cleanPackId =
            hyqdCleanText(packId);

        if (!cleanPackId) {
            throw new Error(
                "Pack non défini."
            );
        }

        const { data, error } =
            await HYQD_SUPABASE_CLIENT.rpc(
                "invest_in_pack",
                {
                    p_pack_id: cleanPackId
                }
            );

        if (error) {
            throw error;
        }

        return hyqdRpcResult(
            data,
            "Investissement activé avec succès."
        );

    } catch (error) {

        return {
            success: false,
            message: hyqdSafeMessage(
                error,
                "Investissement impossible."
            )
        };
    }
}


/* ============================================================
   LECTURE DES DONNÉES UTILISATEUR
============================================================ */

async function hyqdSelectMine(
    table,
    orderColumn = "created_at",
    allPages = false
) {

    try {

        const auth =
            await requireSupabaseAuth();

        if (!auth?.authorized) {
            throw new Error(
                "Utilisateur non connecté."
            );
        }

        const data = [];
        const pageSize = 500;
        let offset = 0;
        while (true) {
            let query = HYQD_SUPABASE_CLIENT
                .from(table)
                .select("*")
                .eq("user_id", auth.user.id)
                .order(orderColumn, { ascending: false });
            if (allPages) {
                query = query.order("id", { ascending: false })
                    .range(offset, offset + pageSize - 1);
            }
            const { data: page, error } = await query;
            if (error) throw error;
            data.push(...(page || []));
            if (!allPages || !page?.length) break;
            offset += page.length;
        }

        return {
            success: true,
            data: data || []
        };

    } catch (error) {

        return {
            success: false,
            data: [],
            message: hyqdSafeMessage(error)
        };
    }
}


async function getSupabaseDeposits() {

    const result =
        await hyqdSelectMine("deposits");

    return {
        ...result,
        deposits: result.data || []
    };
}


async function getSupabaseWithdrawals() {

    const result =
        await hyqdSelectMine("withdrawals", "created_at", true);

    return {
        ...result,
        withdrawals: result.data || []
    };
}


async function getSupabaseInvestments() {

    const result =
        await hyqdSelectMine("investments");

    return {
        ...result,
        investments: result.data || []
    };
}


async function getSupabaseSupportTickets() {

    const result =
        await hyqdSelectMine(
            "support_tickets"
        );

    return {
        ...result,
        tickets: result.data || []
    };
}


async function getSupabaseNotifications() {

    const result =
        await hyqdSelectMine(
            "notifications"
        );

    return {
        ...result,
        notifications: result.data || []
    };
}


/* ============================================================
   PIÈCES JOINTES ASSISTANCE — STOCKAGE PRIVÉ SUPABASE
============================================================ */

const HYQD_SUPPORT_BUCKET = "support-attachments";
const HYQD_SUPPORT_MAX_FILES = 3;
const HYQD_SUPPORT_MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 Mo par fichier
const HYQD_SUPPORT_ATTACHMENT_MARKER = "SOLARIS_ATTACHMENTS_V1";

function hyqdSupportAllowedFile(file) {
    const type = String(file?.type || "").toLowerCase();
    const name = String(file?.name || "").toLowerCase();
    const allowedExtensions = [
        ".jpg", ".jpeg", ".png", ".webp", ".gif", ".heic", ".heif",
        ".mp4", ".webm", ".mov", ".3gp", ".mkv",
        ".pdf", ".txt", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".zip"
    ];

    const typeAllowed =
        type.startsWith("image/") ||
        type.startsWith("video/") ||
        [
            "application/pdf",
            "text/plain",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/vnd.ms-excel",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "application/vnd.ms-powerpoint",
            "application/vnd.openxmlformats-officedocument.presentationml.presentation",
            "application/zip",
            "application/x-zip-compressed",
            "application/octet-stream"
        ].includes(type);

    return typeAllowed || allowedExtensions.some(ext => name.endsWith(ext));
}

function hyqdSupportSafeFileName(name) {
    const clean = String(name || "fichier")
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9._-]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^[-.]+|[-.]+$/g, "")
        .slice(0, 90);
    return clean || "fichier";
}

function hyqdSupportPackContent(message, attachments = []) {
    const text = hyqdCleanText(message);
    const files = Array.isArray(attachments) ? attachments : [];
    if (!files.length) return text;

    const payload = encodeURIComponent(JSON.stringify(files.map(file => ({
        path: String(file.path || ""),
        name: String(file.name || "fichier"),
        type: String(file.type || "application/octet-stream"),
        size: Number(file.size || 0)
    }))));

    const packed = `${text}\n\n[[${HYQD_SUPPORT_ATTACHMENT_MARKER}:${payload}]]`;
    if (packed.length > 5000) {
        throw new Error("Votre message est trop long avec les pièces jointes. Réduisez le texte puis réessayez.");
    }
    return packed;
}

function hyqdParseSupportContent(value) {
    const raw = String(value || "");
    const pattern = new RegExp(`\\n?\\n?\\[\\[${HYQD_SUPPORT_ATTACHMENT_MARKER}:([^\\]]+)\\]\\]\\s*$`);
    const match = raw.match(pattern);
    if (!match) return { text: raw, attachments: [] };

    try {
        const parsed = JSON.parse(decodeURIComponent(match[1]));
        return {
            text: raw.replace(pattern, "").trim(),
            attachments: Array.isArray(parsed)
                ? parsed.filter(item => item && item.path && item.name)
                : []
        };
    } catch (error) {
        console.warn("Lecture des pièces jointes impossible.", error);
        return { text: raw, attachments: [] };
    }
}

async function uploadSupabaseSupportAttachments({ files, ownerUserId = null }) {
    const selected = Array.from(files || []);
    if (!selected.length) return { success: true, attachments: [] };

    try {
        if (selected.length > HYQD_SUPPORT_MAX_FILES) {
            throw new Error(`Vous pouvez joindre au maximum ${HYQD_SUPPORT_MAX_FILES} fichiers.`);
        }

        for (const file of selected) {
            if (!hyqdSupportAllowedFile(file)) {
                throw new Error(`Format non autorisé : ${file?.name || "fichier"}.`);
            }
            if (Number(file?.size || 0) > HYQD_SUPPORT_MAX_FILE_SIZE) {
                throw new Error(`${file?.name || "Le fichier"} dépasse 20 Mo.`);
            }
        }

        const auth = await requireSupabaseAuth();
        if (!auth?.authorized || !auth.user?.id) {
            throw new Error("Utilisateur non connecté.");
        }

        const ownerId = String(ownerUserId || auth.user.id);
        let attachmentPrefix = "";
        if (ownerId !== String(auth.user.id)) {
            const admin = await requireSupabaseSupportStaff();
            if (!admin?.authorized) {
                throw new Error("Accès administrateur refusé pour cette pièce jointe.");
            }
            if (admin.role === "support_agent") attachmentPrefix = `agent-${auth.user.id}/`;
        }

        const uploaded = [];
        for (const file of selected) {
            const randomId = (globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`);
            const safeName = hyqdSupportSafeFileName(file.name);
            const path = `${ownerId}/${attachmentPrefix}${Date.now()}-${randomId}-${safeName}`;

            const { error } = await HYQD_SUPABASE_CLIENT
                .storage
                .from(HYQD_SUPPORT_BUCKET)
                .upload(path, file, {
                    cacheControl: "3600",
                    upsert: false,
                    contentType: file.type || undefined
                });

            if (error) {
                if (uploaded.length) {
                    await HYQD_SUPABASE_CLIENT.storage.from(HYQD_SUPPORT_BUCKET).remove(uploaded.map(item => item.path));
                }
                throw error;
            }

            uploaded.push({
                path,
                name: file.name || safeName,
                type: file.type || "application/octet-stream",
                size: Number(file.size || 0)
            });
        }

        return { success: true, attachments: uploaded };
    } catch (error) {
        return {
            success: false,
            attachments: [],
            message: hyqdSafeMessage(error, "Envoi de la pièce jointe impossible.")
        };
    }
}

async function removeSupabaseSupportAttachments(paths = []) {
    try {
        const cleanPaths = Array.from(paths || []).map(String).filter(Boolean);
        if (!cleanPaths.length) return { success: true };
        const { error } = await HYQD_SUPABASE_CLIENT.storage.from(HYQD_SUPPORT_BUCKET).remove(cleanPaths);
        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.warn("Nettoyage des pièces jointes impossible.", error);
        return { success: false, message: hyqdSafeMessage(error) };
    }
}

async function getSupabaseSupportAttachmentUrl(path) {
    try {
        const cleanPath = String(path || "").trim();
        if (!cleanPath) throw new Error("Pièce jointe introuvable.");

        const auth = await requireSupabaseAuth();
        if (!auth?.authorized) throw new Error("Utilisateur non connecté.");

        const { data, error } = await HYQD_SUPABASE_CLIENT
            .storage
            .from(HYQD_SUPPORT_BUCKET)
            .createSignedUrl(cleanPath, 300);

        if (error) throw error;
        if (!data?.signedUrl) throw new Error("Lien sécurisé indisponible.");

        return { success: true, url: data.signedUrl };
    } catch (error) {
        return { success: false, url: null, message: hyqdSafeMessage(error, "Impossible d'ouvrir la pièce jointe.") };
    }
}

/* ============================================================
   ASSISTANCE UTILISATEUR
============================================================ */

async function createSupabaseSupportTicket({
    subject,
    message,
    files = []
}) {

    let uploaded = [];

    try {

        const cleanSubject = hyqdCleanText(subject);
        const cleanMessage = hyqdCleanText(message);

        if (!cleanSubject || !cleanMessage) {
            throw new Error("Renseignez le sujet et le message.");
        }

        const uploadResult = await uploadSupabaseSupportAttachments({ files });
        if (!uploadResult?.success) {
            throw new Error(uploadResult?.message || "Envoi de la pièce jointe impossible.");
        }
        uploaded = uploadResult.attachments || [];

        const packedMessage = hyqdSupportPackContent(cleanMessage, uploaded);

        const { data, error } = await HYQD_SUPABASE_CLIENT.rpc(
            "create_support_ticket",
            {
                p_subject: cleanSubject,
                p_message: packedMessage
            }
        );

        if (error) throw error;

        const result = hyqdRpcResult(data, "Ticket envoyé.");
        if (!result?.success && uploaded.length) {
            await removeSupabaseSupportAttachments(uploaded.map(item => item.path));
            uploaded = [];
        }
        return result;

    } catch (error) {

        if (uploaded.length) {
            await removeSupabaseSupportAttachments(uploaded.map(item => item.path));
        }

        return {
            success: false,
            message: hyqdSafeMessage(error, "Envoi impossible.")
        };
    }
}


/* ============================================================
   NOTIFICATIONS
============================================================ */

async function markSupabaseNotificationRead(
    notificationId
) {

    try {

        const { data, error } =
            await HYQD_SUPABASE_CLIENT.rpc(
                "mark_notification_read",
                {
                    p_notification_id:
                        notificationId
                }
            );

        if (error) {
            throw error;
        }

        return hyqdRpcResult(
            data,
            "Notification lue."
        );

    } catch (error) {

        return {
            success: false,
            message: hyqdSafeMessage(error)
        };
    }
}


async function markAllSupabaseNotificationsRead() {

    try {

        const { data, error } =
            await HYQD_SUPABASE_CLIENT.rpc(
                "mark_all_notifications_read"
            );

        if (error) {
            throw error;
        }

        return hyqdRpcResult(
            data,
            "Notifications lues."
        );

    } catch (error) {

        return {
            success: false,
            message: hyqdSafeMessage(error)
        };
    }
}


async function getApprovedDepositTicker(
    limit = 20
) {

    try {

        const { data, error } =
            await HYQD_SUPABASE_CLIENT.rpc(
                "get_approved_deposit_ticker",
                {
                    p_limit: Number(limit)
                }
            );

        if (error) {
            throw error;
        }

        const ticker =
            Array.isArray(data)
                ? data
                : (
                    data?.ticker ||
                    data?.deposits ||
                    []
                );

        return {
            success: true,
            ticker,
            deposits: ticker
        };

    } catch (error) {

        return {
            success: false,
            ticker: [],
            deposits: [],
            message: hyqdSafeMessage(error)
        };
    }
}


/* ============================================================
   OUTIL DE LECTURE ADMINISTRATEUR
============================================================ */

async function hyqdAdminSelect(table) {

    try {

        const admin =
            await requireSupabaseAdmin();

        if (!admin?.authorized) {
            throw new Error(
                "Accès administrateur refusé."
            );
        }

        const { data, error } =
            await HYQD_SUPABASE_CLIENT
                .from(table)
                .select("*")
                .order(
                    "created_at",
                    { ascending: false }
                );

        if (error) {
            throw error;
        }

        return {
            success: true,
            data: data || []
        };

    } catch (error) {

        return {
            success: false,
            data: [],
            message: hyqdSafeMessage(error)
        };
    }
}


/* ============================================================
   LISTES ADMINISTRATEUR
============================================================ */

async function adminGetSupabaseProfiles() {

    try {

        const admin =
            await requireSupabaseAdmin();

        if (!admin?.authorized) {
            throw new Error(
                "Accès administrateur refusé."
            );
        }

        const { data, error } =
            await HYQD_SUPABASE_CLIENT
                .from("profiles")
                .select("*")
                .order(
                    "created_at",
                    { ascending: false }
                );

        if (error) {
            throw error;
        }

        return {
            success: true,
            profiles: data || []
        };

    } catch (error) {

        return {
            success: false,
            profiles: [],
            message: hyqdSafeMessage(error)
        };
    }
}


async function adminGetSupabaseDeposits() {

    const result =
        await hyqdAdminSelect("deposits");

    return {
        ...result,
        deposits: result.data || []
    };
}


async function adminGetSupabaseWithdrawals() {

    const result =
        await hyqdAdminSelect("withdrawals");

    return {
        ...result,
        withdrawals: result.data || []
    };
}


async function adminGetSupabaseInvestments() {

    const result =
        await hyqdAdminSelect("investments");

    return {
        ...result,
        investments: result.data || []
    };
}


async function adminGetSupabaseSupportTickets() {
    try {
        const tickets=[];
        while(true) {
            const {data,error}=await HYQD_SUPABASE_CLIENT.rpc("hyqd_get_support_tickets",{p_offset:tickets.length,p_limit:200});
            if(error)throw error;
            tickets.push(...(data||[]));
            if(!data?.length || data.length<200)break;
        }
        return {success:true,tickets};
    } catch(error) {return {success:false,tickets:[],message:hyqdSafeMessage(error,"Tickets indisponibles.")};}
}

async function getSupabaseSupportTicketEvents(ticketId) {
    try {
        const events=[];
        while(true) {
            const {data,error}=await HYQD_SUPABASE_CLIENT.from("support_ticket_events").select("*")
                .eq("ticket_id",ticketId).order("created_at",{ascending:true}).order("id",{ascending:true})
                .range(events.length,events.length+199);
            if(error)throw error;
            events.push(...(data||[]));
            if(!data?.length || data.length<200)break;
        }
        return {success:true,events};
    } catch(error) {return {success:false,events:[],message:hyqdSafeMessage(error,"Historique indisponible.")};}
}

/* ============================================================
   VALIDATION DES DÉPÔTS
============================================================ */

async function adminReviewSupabaseDeposit({
    depositId,
    approve,
    note
}) {

    try {

        const { data, error } =
            await HYQD_SUPABASE_CLIENT.rpc(
                "admin_review_deposit",
                {
                    p_deposit_id:
                        depositId,
                    p_approve:
                        Boolean(approve),
                    p_note:
                        hyqdCleanText(note) ||
                        null
                }
            );

        if (error) {
            throw error;
        }

        return hyqdRpcResult(
            data,
            approve
                ? "Dépôt validé."
                : "Dépôt refusé."
        );

    } catch (error) {

        return {
            success: false,
            message: hyqdSafeMessage(error)
        };
    }
}


/* ============================================================
   VALIDATION DES RETRAITS
============================================================ */

async function adminReviewSupabaseWithdrawal({
    withdrawalId,
    approve,
    note
}) {

    try {

        const { data, error } =
            await HYQD_SUPABASE_CLIENT.rpc(
                "admin_review_withdrawal",
                {
                    p_withdrawal_id:
                        withdrawalId,
                    p_approve:
                        Boolean(approve),
                    p_note:
                        hyqdCleanText(note) ||
                        null
                }
            );

        if (error) {
            throw error;
        }

        return hyqdRpcResult(
            data,
            approve
                ? "Retrait validé."
                : "Retrait refusé."
        );

    } catch (error) {

        return {
            success: false,
            message: hyqdSafeMessage(error)
        };
    }
}


/* ============================================================
   RÉPONSE AUX TICKETS
============================================================ */

async function adminReplySupabaseSupportTicket({
    ticketId,
    reply,
    close,
    files = [],
    ownerUserId
}) {

    let uploaded = [];

    try {

        const cleanReply = hyqdCleanText(reply);
        if (!cleanReply) {
            throw new Error("Écrivez une réponse.");
        }
        if (!ownerUserId) {
            throw new Error("Utilisateur du ticket introuvable.");
        }

        const uploadResult = await uploadSupabaseSupportAttachments({
            files,
            ownerUserId
        });
        if (!uploadResult?.success) {
            throw new Error(uploadResult?.message || "Envoi de la pièce jointe impossible.");
        }
        uploaded = uploadResult.attachments || [];

        const packedReply = hyqdSupportPackContent(cleanReply, uploaded);

        const { data, error } = await HYQD_SUPABASE_CLIENT.rpc(
            "admin_reply_support_ticket",
            {
                p_ticket_id: ticketId,
                p_reply: packedReply,
                p_close: Boolean(close)
            }
        );

        if (error) throw error;

        const result = hyqdRpcResult(data, "Réponse envoyée.");
        if (!result?.success && uploaded.length) {
            await removeSupabaseSupportAttachments(uploaded.map(item => item.path));
            uploaded = [];
        }
        return result;

    } catch (error) {

        if (uploaded.length) {
            await removeSupabaseSupportAttachments(uploaded.map(item => item.path));
        }

        return {
            success: false,
            message: hyqdSafeMessage(error, "Réponse impossible.")
        };
    }
}


/* Export complet des opérations : les droits Supabase restent applicables. */
async function getSupabaseOperationsForExport({ admin = false, type = "all", start = "", end = "" } = {}) {
    try {
        if (!["all", "deposits", "withdrawals"].includes(type)) {
            throw new Error("Type d’opération invalide.");
        }
        const access = admin ? await requireSupabaseAdmin() : await requireSupabaseAuth();
        if (!access?.authorized || (!admin && !access.user?.id)) {
            throw new Error("Accès à l’export refusé. Reconnectez-vous.");
        }
        const parseDate = value => {
            if (!value) return null;
            const date = new Date(value + "T00:00:00.000Z");
            if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
                throw new Error("Date invalide.");
            }
            return date;
        };
        const from = parseDate(start);
        const to = parseDate(end);
        if (from && to && from > to) throw new Error("La date de début doit précéder la date de fin.");
        if (to) to.setUTCDate(to.getUTCDate() + 1);
        const cutoff = new Date().toISOString();
        const operations = [];
        for (const table of type === "all" ? ["deposits", "withdrawals"] : [type]) {
            let offset = 0;
            while (true) {
                let query = HYQD_SUPABASE_CLIENT.from(table).select("*")
                    .order("created_at", { ascending: false }).order("id", { ascending: false })
                    .lte("created_at", cutoff).range(offset, offset + 499);
                if (!admin) query = query.eq("user_id", access.user.id);
                if (from) query = query.gte("created_at", from.toISOString());
                if (to) query = query.lt("created_at", to.toISOString());
                const { data, error } = await query;
                if (error) throw error;
                if (!data?.length) break;
                operations.push(...data.map(item => ({ ...item, operation_type: table === "deposits" ? "Dépôt" : "Retrait" })));
                offset += data.length;
            }
        }
        operations.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)) || String(a.id).localeCompare(String(b.id)));
        return { success: true, operations };
    } catch (error) {
        return { success: false, operations: [], message: hyqdSafeMessage(error, "Export impossible.") };
    }
}

async function adminTakeSupabaseSupportTicket(ticketId) {
    try {
        const {data,error} = await HYQD_SUPABASE_CLIENT.rpc("admin_take_support_ticket", {p_ticket_id:ticketId});
        if (error) throw error;
        return hyqdRpcResult(data, "Ticket pris en charge.");
    } catch (error) { return {success:false,message:hyqdSafeMessage(error,"Prise en charge impossible.")}; }
}
