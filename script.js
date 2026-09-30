"use strict";

/* =========================================================
   SOLARIS PRO
   SCRIPT PRINCIPAL

   Fonctionnalités :
   - Inscription / connexion
   - Sessions utilisateur
   - Dépôts
   - Retraits
   - Investissements
   - Simulations quotidiennes pendant 100 jours
   - Parrainage
   - Assistance
   - Notifications
   - Administration
========================================================= */


/* =========================================================
   CONFIGURATION
========================================================= */

const HYQD_CONFIG = {
    APP_NAME: "Solaris Pro",
    ADMIN_CODE: null,
    REFERRAL_RATE: 0.10,
    INVESTMENT_DURATION: 100,
    DAY_MS: 24 * 60 * 60 * 1000
};


/* =========================================================
   CLÉS DE STOCKAGE
========================================================= */

const HYQD_KEYS = {
    USERS: "solaris_users_v1",
    CURRENT_USER: "solaris_current_user_v1",
    ADMIN_SESSION: "solaris_admin_session_v1",
    PASSWORD_RESETS: "solaris_password_resets_v1"
};


/* =========================================================
   GRILLE OFFICIELLE DES 8 PACKS
========================================================= */

const HYQD_INVESTMENT_PACKS = [

    {
        id: "etincelle",
        name: "Étincelle",
        amount: 3000,
        dailyIncome: 450,
        totalIncome: 45000,
        duration: 100
    },

    {
        id: "lumiere",
        name: "Lumière",
        amount: 10000,
        dailyIncome: 1600,
        totalIncome: 160000,
        duration: 100
    },

    {
        id: "horizon",
        name: "Horizon",
        amount: 20000,
        dailyIncome: 3400,
        totalIncome: 340000,
        duration: 100
    },

    {
        id: "rayonnement",
        name: "Rayonnement",
        amount: 45000,
        dailyIncome: 8100,
        totalIncome: 810000,
        duration: 100
    },

    {
        id: "energie",
        name: "Énergie",
        amount: 100000,
        dailyIncome: 19000,
        totalIncome: 1900000,
        duration: 100
    },

    {
        id: "puissance",
        name: "Puissance",
        amount: 200000,
        dailyIncome: 40000,
        totalIncome: 4000000,
        duration: 100
    },

    {
        id: "centrale",
        name: "Centrale",
        amount: 400000,
        dailyIncome: 84000,
        totalIncome: 8400000,
        duration: 100
    },

    {
        id: "souverain",
        name: "Souverain",
        amount: 800000,
        dailyIncome: 176000,
        totalIncome: 17600000,
        duration: 100
    }

];


/* =========================================================
   STOCKAGE
========================================================= */

function hyqdGet(key, fallback = null) {
    try {
        const raw = localStorage.getItem(key);

        if (raw === null) {
            return fallback;
        }

        return JSON.parse(raw);

    } catch (error) {
        console.error("Erreur lecture localStorage :", error);
        return fallback;
    }
}


function hyqdSet(key, value) {
    try {
        localStorage.setItem(
            key,
            JSON.stringify(value)
        );

        return true;

    } catch (error) {
        console.error("Erreur écriture localStorage :", error);
        return false;
    }
}


/* =========================================================
   OUTILS
========================================================= */

function generateId(prefix = "id") {
    return (
        prefix +
        "_" +
        Date.now().toString(36) +
        "_" +
        Math.random().toString(36).slice(2, 10)
    );
}


function generateCode() {
    const letters =
        Math.random()
            .toString(36)
            .slice(2, 6)
            .toUpperCase();

    const numbers =
        Math.floor(
            1000 +
            Math.random() * 9000
        );

    return "SPR" + letters + numbers;
}


function normalizePhone(phone) {

    let value =
        String(phone || "")
            .trim()
            .replace(/\s+/g, "")
            .replace(/[^\d+]/g, "");

    if (value.startsWith("+225")) {
        value = value.substring(4);
    }

    if (value.startsWith("00225")) {
        value = value.substring(5);
    }

    return value.replace(/\D/g, "");
}


function formatFCFA(amount) {

    return (
        new Intl.NumberFormat("fr-FR")
            .format(Number(amount || 0)) +
        " FCFA"
    );
}


function escapeHtml(value) {

    const div =
        document.createElement("div");

    div.textContent =
        String(value ?? "");

    return div.innerHTML;
}


function safeNumber(value) {

    const number =
        Number(value);

    return Number.isFinite(number)
        ? number
        : 0;
}


function cloneData(value) {

    return JSON.parse(
        JSON.stringify(value)
    );
}


/* =========================================================
   PACKS
========================================================= */

function getPackById(packId) {

    return HYQD_INVESTMENT_PACKS.find(
        pack =>
            pack.id === packId
    ) || null;
}


function getPackByAmount(amount) {

    return HYQD_INVESTMENT_PACKS.find(
        pack =>
            Number(pack.amount) ===
            Number(amount)
    ) || null;
}


function getCanonicalPack(pack) {

    if (!pack) {
        return null;
    }

    if (typeof pack === "string") {
        return getPackById(pack);
    }

    if (pack.id) {

        const byId =
            getPackById(pack.id);

        if (byId) {
            return byId;
        }
    }

    if (pack.amount) {
        return getPackByAmount(pack.amount);
    }

    return null;
}


/* =========================================================
   UTILISATEURS
========================================================= */

function getUsersRaw() {

    const users =
        hyqdGet(
            HYQD_KEYS.USERS,
            []
        );

    return Array.isArray(users)
        ? users
        : [];
}


function saveUsers(users) {

    return hyqdSet(
        HYQD_KEYS.USERS,
        users
    );
}


function findUserById(userId) {

    return getUsersRaw().find(
        user =>
            user.id === userId
    ) || null;
}


function findUserByPhone(phone) {

    const normalized =
        normalizePhone(phone);

    return getUsersRaw().find(
        user =>
            normalizePhone(user.phone) ===
            normalized
    ) || null;
}


function findUserByReferralCode(code) {

    const referral =
        String(code || "")
            .trim()
            .toUpperCase();

    if (!referral) {
        return null;
    }

    return getUsersRaw().find(
        user =>
            String(
                user.referralCode || ""
            ).toUpperCase() === referral
    ) || null;
}


/* =========================================================
   INSCRIPTION
========================================================= */

function registerUser(...args) {

    let data = {};

    if (
        args.length === 1 &&
        typeof args[0] === "object"
    ) {
        data = args[0];

    } else {
        data = {

            fullName:
                args[0] || "",

            phone:
                args[1] || "",

            password:
                args[2] || "",

            confirmPassword:
                args[3] ||
                args[2] ||
                "",

            referralCode:
                args[4] || ""
        };
    }


    const fullName =
        String(
            data.fullName ||
            data.name ||
            ""
        ).trim();


    const phone =
        normalizePhone(
            data.phone
        );


    const password =
        String(
            data.password || ""
        );


    const confirmPassword =
        String(
            data.confirmPassword ??
            password
        );


    const referralCode =
        String(
            data.referralCode || ""
        ).trim();


    if (
        fullName.length < 3 ||
        fullName
            .split(/\s+/)
            .filter(Boolean)
            .length < 2
    ) {

        return {
            success: false,
            message:
                "Veuillez renseigner votre nom complet."
        };
    }


    if (phone.length < 8) {

        return {
            success: false,
            message:
                "Veuillez renseigner un numéro de téléphone valide."
        };
    }


    if (password.length < 6) {

        return {
            success: false,
            message:
                "Le mot de passe doit contenir au moins 6 caractères."
        };
    }


    if (
        password !==
        confirmPassword
    ) {

        return {
            success: false,
            message:
                "Les mots de passe ne correspondent pas."
        };
    }


    const users =
        getUsersRaw();


    const existing =
        users.find(
            user =>
                normalizePhone(
                    user.phone
                ) === phone
        );


    if (existing) {

        return {
            success: false,
            message:
                "Un compte existe déjà avec ce numéro."
        };
    }


    let sponsor = null;


    if (referralCode) {

        sponsor =
            users.find(
                user =>
                    String(
                        user.referralCode || ""
                    ).toUpperCase() ===
                    referralCode.toUpperCase()
            );


        if (!sponsor) {

            return {
                success: false,
                message:
                    "Le code de parrainage est invalide."
            };
        }
    }


    let personalReferralCode =
        generateCode();


    while (
        users.some(
            user =>
                user.referralCode ===
                personalReferralCode
        )
    ) {
        personalReferralCode =
            generateCode();
    }


    const user = {

        id:
            generateId("user"),

        fullName,

        name:
            fullName,

        phone,

        password,

        balance:
            0,

        totalDeposited:
            0,

        totalWithdrawn:
            0,

        totalInvested:
            0,

        totalInvestmentIncome:
            0,

        totalReferralBonus:
            0,

        referralCode:
            personalReferralCode,

        referredBy:
            sponsor
                ? sponsor.referralCode
                : "",

        sponsorId:
            sponsor
                ? sponsor.id
                : null,

        firstDepositCompleted:
            false,

        transactions:
            [],

        investments:
            [],

        tickets:
            [],

        notifications:
            [],

        status:
            "active",

        createdAt:
            new Date().toISOString()

    };


    users.unshift(user);

    saveUsers(users);


    hyqdSet(
        HYQD_KEYS.CURRENT_USER,
        user.id
    );


    return {
        success: true,
        message:
            "Inscription réussie.",
        user:
            cloneData(user)
    };
}


/* =========================================================
   CONNEXION
========================================================= */

function loginUser(phone, password) {

    const normalized =
        normalizePhone(phone);


    const users =
        getUsersRaw();


    const user =
        users.find(
            item =>
                normalizePhone(
                    item.phone
                ) === normalized
        );


    if (!user) {

        return {
            success: false,
            message:
                "Compte introuvable."
        };
    }


    if (
        String(user.password) !==
        String(password)
    ) {

        return {
            success: false,
            message:
                "Mot de passe incorrect."
        };
    }


    if (
        user.status ===
        "blocked"
    ) {

        return {
            success: false,
            message:
                "Ce compte est actuellement bloqué."
        };
    }


    hyqdSet(
        HYQD_KEYS.CURRENT_USER,
        user.id
    );


    processInvestmentGainsForUser(
        user.id
    );


    return {
        success: true,
        message:
            "Connexion réussie.",
        user:
            getCurrentUser()
    };
}


function logoutUser() {

    localStorage.removeItem(
        HYQD_KEYS.CURRENT_USER
    );

    return true;
}


/* =========================================================
   SESSION UTILISATEUR
========================================================= */

function getCurrentUserId() {

    return hyqdGet(
        HYQD_KEYS.CURRENT_USER,
        null
    );
}


function getCurrentUser() {

    const userId =
        getCurrentUserId();


    if (!userId) {
        return null;
    }


    processInvestmentGainsForUser(
        userId
    );


    const users =
        getUsersRaw();


    const user =
        users.find(
            item =>
                item.id === userId
        );


    return user
        ? cloneData(user)
        : null;
}


function requireAuth() {

    const user =
        getCurrentUser();


    if (!user) {

        if (
            typeof window !==
            "undefined"
        ) {

            window.location.replace(
                "login.html"
            );
        }

        return null;
    }


    return user;
}


/* =========================================================
   GAINS QUOTIDIENS
========================================================= */

function processInvestmentGainsForUser(userId) {

    if (!userId) {
        return;
    }


    const users =
        getUsersRaw();


    const userIndex =
        users.findIndex(
            user =>
                user.id === userId
        );


    if (userIndex < 0) {
        return;
    }


    const user =
        users[userIndex];


    if (
        !Array.isArray(
            user.investments
        ) ||
        !user.investments.length
    ) {
        return;
    }


    if (
        !Array.isArray(
            user.transactions
        )
    ) {
        user.transactions = [];
    }


    if (
        !Array.isArray(
            user.notifications
        )
    ) {
        user.notifications = [];
    }


    let changed = false;

    const now =
        Date.now();


    user.investments.forEach(
        investment => {


            if (!investment) {
                return;
            }


            const canonicalPack =
                getPackById(
                    investment.packId
                ) ||
                getPackByAmount(
                    investment.amount
                );


            if (!canonicalPack) {
                return;
            }


            if (
                !investment.dailyIncome
            ) {

                investment.dailyIncome =
                    canonicalPack.dailyIncome;

                changed = true;
            }


            if (
                !investment.totalIncome
            ) {

                investment.totalIncome =
                    canonicalPack.totalIncome;

                changed = true;
            }


            if (
                !investment.duration
            ) {

                investment.duration =
                    canonicalPack.duration;

                changed = true;
            }


            if (
                typeof investment.creditedDays !==
                "number"
            ) {

                investment.creditedDays =
                    0;

                changed = true;
            }


            if (
                typeof investment.totalIncomeCredited !==
                "number"
            ) {

                investment.totalIncomeCredited =
                    investment.creditedDays *
                    Number(
                        investment.dailyIncome ||
                        0
                    );

                changed = true;
            }


            if (
                investment.status ===
                "completed"
            ) {
                return;
            }


            if (
                investment.status &&
                investment.status !==
                "active"
            ) {
                return;
            }


            const start =
                new Date(
                    investment.startDate ||
                    investment.createdAt
                ).getTime();


            if (
                !Number.isFinite(start)
            ) {
                return;
            }


            const duration =
                Number(
                    investment.duration ||
                    canonicalPack.duration ||
                    HYQD_CONFIG
                        .INVESTMENT_DURATION
                );


            const dailyIncome =
                Number(
                    investment.dailyIncome ||
                    canonicalPack.dailyIncome ||
                    0
                );


            if (
                dailyIncome <= 0 ||
                duration <= 0
            ) {
                return;
            }


            const elapsedFullDays =
                Math.floor(
                    Math.max(
                        0,
                        now - start
                    ) /
                    HYQD_CONFIG.DAY_MS
                );


            const payableDays =
                Math.min(
                    duration,
                    elapsedFullDays
                );


            const creditedDays =
                Math.max(
                    0,
                    Number(
                        investment.creditedDays ||
                        0
                    )
                );


            const dueDays =
                payableDays -
                creditedDays;


            if (dueDays <= 0) {

                if (
                    creditedDays >= duration &&
                    investment.status !==
                    "completed"
                ) {

                    investment.status =
                        "completed";

                    investment.completedAt =
                        investment.completedAt ||
                        new Date(
                            start +
                            duration *
                            HYQD_CONFIG.DAY_MS
                        ).toISOString();

                    changed = true;
                }

                return;
            }


            for (
                let day =
                    creditedDays + 1;

                day <= payableDays;

                day++
            ) {

                const payoutDate =
                    new Date(
                        start +
                        day *
                        HYQD_CONFIG.DAY_MS
                    ).toISOString();


                user.balance =
                    safeNumber(
                        user.balance
                    ) +
                    dailyIncome;


                user.totalInvestmentIncome =
                    safeNumber(
                        user.totalInvestmentIncome
                    ) +
                    dailyIncome;


                investment.totalIncomeCredited =
                    safeNumber(
                        investment.totalIncomeCredited
                    ) +
                    dailyIncome;


                investment.creditedDays =
                    day;


                investment.lastPayoutAt =
                    payoutDate;


                user.transactions.unshift({

                    id:
                        generateId("gain"),

                    type:
                        "daily_gain",

                    amount:
                        dailyIncome,

                    status:
                        "approved",

                    investmentId:
                        investment.id,

                    packId:
                        investment.packId,

                    packName:
                        investment.packName,

                    payoutDay:
                        day,

                    description:
                        "Gain journalier - jour " +
                        day +
                        "/" +
                        duration,

                    createdAt:
                        payoutDate,

                    processedAt:
                        payoutDate

                });


                user.notifications.unshift({

                    id:
                        generateId(
                            "notification"
                        ),

                    type:
                        "daily_gain",

                    title:
                        "Gain journalier crédité",

                    message:
                        formatFCFA(
                            dailyIncome
                        ) +
                        " ont été ajoutés à votre solde pour le pack " +
                        (
                            investment.packName ||
                            canonicalPack.name
                        ) +
                        ".",

                    read:
                        false,

                    createdAt:
                        payoutDate

                });

            }


            if (
                investment.creditedDays >=
                duration
            ) {

                investment.status =
                    "completed";


                investment.completedAt =
                    new Date(
                        start +
                        duration *
                        HYQD_CONFIG.DAY_MS
                    ).toISOString();

            }


            changed = true;

        }
    );


    if (changed) {

        users[userIndex] =
            user;

        saveUsers(users);
    }
}


function processAllInvestmentGains() {

    const users =
        getUsersRaw();


    users.forEach(
        user => {

            processInvestmentGainsForUser(
                user.id
            );

        }
    );
}


/* =========================================================
   INVESTISSEMENT
========================================================= */

function investInPack(packInput) {

    const currentUserId =
        getCurrentUserId();


    if (!currentUserId) {

        return {
            success: false,
            message:
                "Vous devez être connecté."
        };
    }


    const pack =
        getCanonicalPack(
            packInput
        );


    if (!pack) {

        return {
            success: false,
            message:
                "Ce pack d'investissement est invalide."
        };
    }


    const users =
        getUsersRaw();


    const userIndex =
        users.findIndex(
            user =>
                user.id ===
                currentUserId
        );


    if (userIndex < 0) {

        return {
            success: false,
            message:
                "Utilisateur introuvable."
        };
    }


    const user =
        users[userIndex];


    const amount =
        Number(pack.amount);


    if (
        safeNumber(
            user.balance
        ) < amount
    ) {

        return {
            success: false,
            message:
                "Votre solde est insuffisant pour activer ce pack."
        };
    }


    const now =
        new Date();


    const end =
        new Date(
            now.getTime() +
            pack.duration *
            HYQD_CONFIG.DAY_MS
        );


    const investment = {

        id:
            generateId(
                "investment"
            ),

        packId:
            pack.id,

        packName:
            pack.name,

        amount:
            pack.amount,

        dailyIncome:
            pack.dailyIncome,

        totalIncome:
            pack.totalIncome,

        duration:
            pack.duration,

        creditedDays:
            0,

        totalIncomeCredited:
            0,

        lastPayoutAt:
            null,

        status:
            "active",

        startDate:
            now.toISOString(),

        endDate:
            end.toISOString(),

        createdAt:
            now.toISOString(),

        completedAt:
            null

    };


    user.balance =
        safeNumber(
            user.balance
        ) -
        amount;


    user.totalInvested =
        safeNumber(
            user.totalInvested
        ) +
        amount;


    if (
        !Array.isArray(
            user.investments
        )
    ) {
        user.investments = [];
    }


    user.investments.unshift(
        investment
    );


    if (
        !Array.isArray(
            user.transactions
        )
    ) {
        user.transactions = [];
    }


    user.transactions.unshift({

        id:
            generateId(
                "investment_tx"
            ),

        type:
            "investment",

        amount,

        status:
            "approved",

        investmentId:
            investment.id,

        packId:
            pack.id,

        packName:
            pack.name,

        description:
            "Activation du pack " +
            pack.name,

        createdAt:
            now.toISOString(),

        processedAt:
            now.toISOString()

    });


    users[userIndex] =
        user;


    saveUsers(users);


    return {
        success: true,
        message:
            "Investissement activé avec succès.",
        investment:
            cloneData(
                investment
            )
    };
}


/* =========================================================
   DÉPÔTS
========================================================= */

function requestDeposit(
    amount,
    method,
    reference
) {

    const userId =
        getCurrentUserId();


    if (!userId) {

        return {
            success: false,
            message:
                "Vous devez être connecté."
        };
    }


    const value =
        Number(amount);


    if (
        !Number.isFinite(value) ||
        value < 500
    ) {

        return {
            success: false,
            message:
                "Le montant minimum de dépôt est de 500 FCFA."
        };
    }


    const paymentMethod =
        String(method || "")
            .trim();


    if (!paymentMethod) {

        return {
            success: false,
            message:
                "Veuillez sélectionner le moyen de paiement."
        };
    }


    const paymentReference =
        String(reference || "")
            .trim();


    if (!paymentReference) {

        return {
            success: false,
            message:
                "Veuillez renseigner la référence de transaction."
        };
    }


    const users =
        getUsersRaw();


    const userIndex =
        users.findIndex(
            user =>
                user.id === userId
        );


    if (userIndex < 0) {

        return {
            success: false,
            message:
                "Utilisateur introuvable."
        };
    }


    const user =
        users[userIndex];


    if (
        !Array.isArray(
            user.transactions
        )
    ) {
        user.transactions = [];
    }


    const transaction = {

        id:
            generateId(
                "deposit"
            ),

        type:
            "deposit",

        amount:
            value,

        method:
            paymentMethod,

        reference:
            paymentReference,

        status:
            "pending",

        createdAt:
            new Date()
                .toISOString(),

        processedAt:
            null

    };


    user.transactions.unshift(
        transaction
    );


    users[userIndex] =
        user;


    saveUsers(users);


    return {
        success: true,
        message:
            "Votre demande de dépôt a été envoyée et attend la validation de l'administration.",
        transaction:
            cloneData(
                transaction
            )
    };
}


function createDepositRequest(
    amount,
    method,
    reference
) {

    return requestDeposit(
        amount,
        method,
        reference
    );
}


/* =========================================================
   RETRAITS
========================================================= */

function requestWithdrawal(
    amount,
    method,
    phone
) {

    const userId =
        getCurrentUserId();


    if (!userId) {

        return {
            success: false,
            message:
                "Vous devez être connecté."
        };
    }


    processInvestmentGainsForUser(
        userId
    );


    const users =
        getUsersRaw();


    const userIndex =
        users.findIndex(
            user =>
                user.id === userId
        );


    if (userIndex < 0) {

        return {
            success: false,
            message:
                "Utilisateur introuvable."
        };
    }


    const user =
        users[userIndex];


    const value =
        Number(amount);


    if (
        !Number.isFinite(value) ||
        value < 1000
    ) {

        return {
            success: false,
            message:
                "Le montant minimum de retrait est de 1 000 FCFA."
        };
    }


    const paymentMethod =
        String(method || "")
            .trim();


    if (!paymentMethod) {

        return {
            success: false,
            message:
                "Veuillez sélectionner le moyen de paiement."
        };
    }


    const receivePhone =
        normalizePhone(phone);


    if (
        receivePhone.length < 8
    ) {

        return {
            success: false,
            message:
                "Veuillez renseigner un numéro de réception valide."
        };
    }


    if (
        !Array.isArray(
            user.transactions
        )
    ) {
        user.transactions = [];
    }


    const pendingWithdrawals =
        user.transactions
            .filter(
                transaction =>
                    transaction.type ===
                        "withdraw" &&
                    transaction.status ===
                        "pending"
            )
            .reduce(
                (total, transaction) =>
                    total +
                    safeNumber(
                        transaction.amount
                    ),
                0
            );


    const availableForWithdrawal =
        safeNumber(
            user.balance
        ) -
        pendingWithdrawals;


    if (
        value >
        availableForWithdrawal
    ) {

        return {
            success: false,
            message:
                "Solde disponible insuffisant en tenant compte de vos retraits déjà en attente."
        };
    }


    const transaction = {

        id:
            generateId(
                "withdraw"
            ),

        type:
            "withdraw",

        amount:
            value,

        method:
            paymentMethod,

        phone:
            receivePhone,

        status:
            "pending",

        createdAt:
            new Date()
                .toISOString(),

        processedAt:
            null

    };


    user.transactions.unshift(
        transaction
    );


    users[userIndex] =
        user;


    saveUsers(users);


    return {
        success: true,
        message:
            "Votre demande de retrait a été envoyée et attend la validation de l'administration.",
        transaction:
            cloneData(
                transaction
            )
    };
}


function createWithdrawRequest(
    amount,
    method,
    phone
) {

    return requestWithdrawal(
        amount,
        method,
        phone
    );
}


/* =========================================================
   ASSISTANCE
========================================================= */

function createTicket(
    subject,
    message
) {

    const userId =
        getCurrentUserId();


    if (!userId) {

        return {
            success: false,
            message:
                "Vous devez être connecté."
        };
    }


    const cleanSubject =
        String(subject || "")
            .trim();


    const cleanMessage =
        String(message || "")
            .trim();


    if (
        cleanSubject.length < 2
    ) {

        return {
            success: false,
            message:
                "Veuillez renseigner le sujet de votre demande."
        };
    }


    if (
        cleanMessage.length < 5
    ) {

        return {
            success: false,
            message:
                "Veuillez détailler votre demande."
        };
    }


    const users =
        getUsersRaw();


    const userIndex =
        users.findIndex(
            user =>
                user.id === userId
        );


    if (userIndex < 0) {

        return {
            success: false,
            message:
                "Utilisateur introuvable."
        };
    }


    const user =
        users[userIndex];


    if (
        !Array.isArray(
            user.tickets
        )
    ) {
        user.tickets = [];
    }


    const ticket = {

        id:
            generateId(
                "ticket"
            ),

        subject:
            cleanSubject,

        message:
            cleanMessage,

        status:
            "open",

        adminReply:
            "",

        createdAt:
            new Date()
                .toISOString(),

        repliedAt:
            null

    };


    user.tickets.unshift(
        ticket
    );


    users[userIndex] =
        user;


    saveUsers(users);


    return {
        success: true,
        message:
            "Votre demande a été envoyée à l'assistance.",
        ticket:
            cloneData(ticket)
    };
}


function createSupportTicket(
    subject,
    message
) {

    return createTicket(
        subject,
        message
    );
}


/* =========================================================
   MOT DE PASSE OUBLIÉ
========================================================= */

function requestPasswordReset(phone) {

    const normalized =
        normalizePhone(phone);


    if (
        normalized.length < 8
    ) {

        return {
            success: false,
            message:
                "Veuillez renseigner un numéro valide."
        };
    }


    const user =
        findUserByPhone(
            normalized
        );


    if (!user) {

        return {
            success: false,
            message:
                "Aucun compte n'est associé à ce numéro."
        };
    }


    return {
        success: true,
        message:
            "Compte identifié. La réinitialisation sécurisée du mot de passe sera reliée au service d'authentification."
    };
}


/* =========================================================
   ADMIN
========================================================= */

function adminLogin(code) {

    const inputCode =
        String(code || "")
            .trim();


    if (!inputCode) {

        return {
            success: false,
            message:
                "Veuillez saisir le code administrateur."
        };
    }


    if (
        inputCode !==
        HYQD_CONFIG.ADMIN_CODE
    ) {

        return {
            success: false,
            message:
                "Code administrateur incorrect."
        };
    }


    sessionStorage.setItem(
        HYQD_KEYS.ADMIN_SESSION,
        "authenticated"
    );


    processAllInvestmentGains();


    return {
        success: true,
        message:
            "Accès administrateur autorisé."
    };
}


function authenticateAdmin(code) {

    return adminLogin(code);
}


function isAdminAuthenticated() {

    return (
        sessionStorage.getItem(
            HYQD_KEYS.ADMIN_SESSION
        ) === "authenticated"
    );
}


function adminLogout() {

    sessionStorage.removeItem(
        HYQD_KEYS.ADMIN_SESSION
    );

    return true;
}


/* =========================================================
   UTILISATEURS ADMIN
========================================================= */

function getUsers() {

    if (
        isAdminAuthenticated()
    ) {
        processAllInvestmentGains();
    }


    return cloneData(
        getUsersRaw()
    );
}


/* =========================================================
   VALIDATION DÉPÔT / RETRAIT
========================================================= */

function adminProcessTransaction(
    userId,
    transactionId,
    status
) {

    if (
        !isAdminAuthenticated()
    ) {

        return {
            success: false,
            message:
                "Accès administrateur requis."
        };
    }


    if (
        status !== "approved" &&
        status !== "rejected"
    ) {

        return {
            success: false,
            message:
                "Statut de traitement invalide."
        };
    }


    processInvestmentGainsForUser(
        userId
    );


    const users =
        getUsersRaw();


    const userIndex =
        users.findIndex(
            user =>
                user.id === userId
        );


    if (userIndex < 0) {

        return {
            success: false,
            message:
                "Utilisateur introuvable."
        };
    }


    const user =
        users[userIndex];


    const transactionIndex =
        (user.transactions || [])
            .findIndex(
                transaction =>
                    transaction.id ===
                    transactionId
            );


    if (
        transactionIndex < 0
    ) {

        return {
            success: false,
            message:
                "Transaction introuvable."
        };
    }


    const transaction =
        user.transactions[
            transactionIndex
        ];


    if (
        transaction.status !==
        "pending"
    ) {

        return {
            success: false,
            message:
                "Cette transaction a déjà été traitée."
        };
    }


    /* DÉPÔT */

    if (
        transaction.type ===
            "deposit" &&
        status === "approved"
    ) {

        const amount =
            safeNumber(
                transaction.amount
            );


        user.balance =
            safeNumber(
                user.balance
            ) +
            amount;


        user.totalDeposited =
            safeNumber(
                user.totalDeposited
            ) +
            amount;


        if (
            !user.firstDepositCompleted
        ) {

            user.firstDepositCompleted =
                true;


            if (user.sponsorId) {

                const sponsorIndex =
                    users.findIndex(
                        item =>
                            item.id ===
                            user.sponsorId
                    );


                if (
                    sponsorIndex >= 0 &&
                    sponsorIndex !==
                    userIndex
                ) {

                    const sponsor =
                        users[
                            sponsorIndex
                        ];


                    const bonus =
                        Math.floor(
                            amount *
                            HYQD_CONFIG
                                .REFERRAL_RATE
                        );


                    sponsor.balance =
                        safeNumber(
                            sponsor.balance
                        ) +
                        bonus;


                    sponsor.totalReferralBonus =
                        safeNumber(
                            sponsor
                                .totalReferralBonus
                        ) +
                        bonus;


                    if (
                        !Array.isArray(
                            sponsor.transactions
                        )
                    ) {
                        sponsor.transactions =
                            [];
                    }


                    sponsor.transactions.unshift({

                        id:
                            generateId(
                                "referral_bonus"
                            ),

                        type:
                            "referral_bonus",

                        amount:
                            bonus,

                        status:
                            "approved",

                        sourceUserId:
                            user.id,

                        sourceDepositId:
                            transaction.id,

                        description:
                            "Bonus de parrainage",

                        createdAt:
                            new Date()
                                .toISOString(),

                        processedAt:
                            new Date()
                                .toISOString()

                    });


                    if (
                        !Array.isArray(
                            sponsor.notifications
                        )
                    ) {
                        sponsor.notifications =
                            [];
                    }


                    sponsor.notifications.unshift({

                        id:
                            generateId(
                                "notification"
                            ),

                        type:
                            "referral_bonus",

                        title:
                            "Bonus de parrainage",

                        message:
                            "Un bonus de " +
                            formatFCFA(
                                bonus
                            ) +
                            " a été ajouté à votre solde.",

                        read:
                            false,

                        createdAt:
                            new Date()
                                .toISOString()

                    });


                    users[
                        sponsorIndex
                    ] =
                        sponsor;
                }
            }
        }
    }


    /* RETRAIT */

    if (
        transaction.type ===
            "withdraw" &&
        status === "approved"
    ) {

        const amount =
            safeNumber(
                transaction.amount
            );


        if (
            safeNumber(
                user.balance
            ) < amount
        ) {

            return {
                success: false,
                message:
                    "Le solde actuel de l'utilisateur est insuffisant pour valider ce retrait."
            };
        }


        user.balance =
            safeNumber(
                user.balance
            ) -
            amount;


        user.totalWithdrawn =
            safeNumber(
                user.totalWithdrawn
            ) +
            amount;
    }


    transaction.status =
        status;


    transaction.processedAt =
        new Date()
            .toISOString();


    user.transactions[
        transactionIndex
    ] =
        transaction;


    if (
        !Array.isArray(
            user.notifications
        )
    ) {
        user.notifications = [];
    }


    user.notifications.unshift({

        id:
            generateId(
                "notification"
            ),

        type:
            transaction.type,

        title:
            status === "approved"
                ? "Opération validée"
                : "Opération refusée",

        message:
            transaction.type === "deposit"

                ? (
                    status === "approved"

                        ? "Votre dépôt de " +
                          formatFCFA(
                              transaction.amount
                          ) +
                          " a été validé."

                        : "Votre demande de dépôt de " +
                          formatFCFA(
                              transaction.amount
                          ) +
                          " a été refusée."
                )

                : (
                    status === "approved"

                        ? "Votre retrait de " +
                          formatFCFA(
                              transaction.amount
                          ) +
                          " a été validé."

                        : "Votre demande de retrait de " +
                          formatFCFA(
                              transaction.amount
                          ) +
                          " a été refusée."
                ),

        read:
            false,

        createdAt:
            new Date()
                .toISOString()

    });


    users[userIndex] =
        user;


    saveUsers(users);


    return {
        success: true,
        message:
            status === "approved"
                ? "Transaction validée avec succès."
                : "Transaction refusée avec succès."
    };
}


/* =========================================================
   RÉPONSE ADMIN SUPPORT
========================================================= */

function adminReplyToTicket(
    userId,
    ticketId,
    reply
) {

    if (
        !isAdminAuthenticated()
    ) {

        return {
            success: false,
            message:
                "Accès administrateur requis."
        };
    }


    const cleanReply =
        String(reply || "")
            .trim();


    if (
        cleanReply.length < 2
    ) {

        return {
            success: false,
            message:
                "Veuillez saisir une réponse."
        };
    }


    const users =
        getUsersRaw();


    const userIndex =
        users.findIndex(
            user =>
                user.id === userId
        );


    if (
        userIndex < 0
    ) {

        return {
            success: false,
            message:
                "Utilisateur introuvable."
        };
    }


    const user =
        users[userIndex];


    const ticketIndex =
        (user.tickets || [])
            .findIndex(
                ticket =>
                    ticket.id ===
                    ticketId
            );


    if (
        ticketIndex < 0
    ) {

        return {
            success: false,
            message:
                "Ticket introuvable."
        };
    }


    user.tickets[
        ticketIndex
    ].adminReply =
        cleanReply;


    user.tickets[
        ticketIndex
    ].status =
        "answered";


    user.tickets[
        ticketIndex
    ].repliedAt =
        new Date()
            .toISOString();


    if (
        !Array.isArray(
            user.notifications
        )
    ) {
        user.notifications = [];
    }


    user.notifications.unshift({

        id:
            generateId(
                "notification"
            ),

        type:
            "support",

        title:
            "Réponse de l'assistance",

        message:
            "L'administration a répondu à votre demande « " +
            user.tickets[
                ticketIndex
            ].subject +
            " ».",

        read:
            false,

        createdAt:
            new Date()
                .toISOString()

    });


    users[userIndex] =
        user;


    saveUsers(users);


    return {
        success: true,
        message:
            "Réponse envoyée avec succès."
    };
}


/* =========================================================
   NOTIFICATIONS
========================================================= */

function getCurrentUserNotifications() {

    const user =
        getCurrentUser();


    if (!user) {
        return [];
    }


    return Array.isArray(
        user.notifications
    )
        ? cloneData(
            user.notifications
        )
        : [];
}


function markNotificationAsRead(
    notificationId
) {

    const userId =
        getCurrentUserId();


    if (!userId) {
        return false;
    }


    const users =
        getUsersRaw();


    const userIndex =
        users.findIndex(
            user =>
                user.id === userId
        );


    if (
        userIndex < 0
    ) {
        return false;
    }


    const user =
        users[userIndex];


    const notification =
        (user.notifications || [])
            .find(
                item =>
                    item.id ===
                    notificationId
            );


    if (!notification) {
        return false;
    }


    notification.read =
        true;


    users[userIndex] =
        user;


    saveUsers(users);

    return true;
}


function markAllNotificationsAsRead() {

    const userId =
        getCurrentUserId();


    if (!userId) {
        return false;
    }


    const users =
        getUsersRaw();


    const userIndex =
        users.findIndex(
            user =>
                user.id === userId
        );


    if (
        userIndex < 0
    ) {
        return false;
    }


    const user =
        users[userIndex];


    if (
        !Array.isArray(
            user.notifications
        )
    ) {
        user.notifications = [];
    }


    user.notifications.forEach(
        notification => {
            notification.read =
                true;
        }
    );


    users[userIndex] =
        user;


    saveUsers(users);

    return true;
}


/* =========================================================
   DÉPÔTS VALIDÉS
========================================================= */

function getApprovedPublicDeposits() {

    const users =
        getUsersRaw();


    const deposits = [];


    users.forEach(
        user => {

            const transactions =
                Array.isArray(
                    user.transactions
                )
                    ? user.transactions
                    : [];


            transactions
                .filter(
                    transaction =>
                        transaction.type ===
                            "deposit" &&
                        transaction.status ===
                            "approved"
                )
                .forEach(
                    transaction => {

                        deposits.push({

                            id:
                                transaction.id,

                            userId:
                                user.id,

                            phone:
                                user.phone,

                            amount:
                                transaction.amount,

                            method:
                                transaction.method,

                            createdAt:
                                transaction.createdAt,

                            processedAt:
                                transaction.processedAt

                        });

                    }
                );

        }
    );


    deposits.sort(
        (a, b) => {

            const dateA =
                new Date(
                    a.processedAt ||
                    a.createdAt ||
                    0
                ).getTime();


            const dateB =
                new Date(
                    b.processedAt ||
                    b.createdAt ||
                    0
                ).getTime();


            return dateB - dateA;
        }
    );


    return deposits;
}


/* =========================================================
   SYNTHÈSE INVESTISSEMENTS
========================================================= */

function getUserInvestmentSummary(
    userId = null
) {

    const targetUserId =
        userId ||
        getCurrentUserId();


    if (!targetUserId) {
        return null;
    }


    processInvestmentGainsForUser(
        targetUserId
    );


    const user =
        findUserById(
            targetUserId
        );


    if (!user) {
        return null;
    }


    const investments =
        Array.isArray(
            user.investments
        )
            ? user.investments
            : [];


    const active =
        investments.filter(
            investment =>
                investment.status ===
                "active"
        );


    const completed =
        investments.filter(
            investment =>
                investment.status ===
                "completed"
        );


    const activeDailyIncome =
        active.reduce(
            (total, investment) =>
                total +
                safeNumber(
                    investment.dailyIncome
                ),
            0
        );


    const totalExpectedIncome =
        investments.reduce(
            (total, investment) =>
                total +
                safeNumber(
                    investment.totalIncome
                ),
            0
        );


    const totalCreditedIncome =
        investments.reduce(
            (total, investment) =>
                total +
                safeNumber(
                    investment
                        .totalIncomeCredited
                ),
            0
        );


    return {

        investmentCount:
            investments.length,

        activeCount:
            active.length,

        completedCount:
            completed.length,

        activeDailyIncome,

        totalExpectedIncome,

        totalCreditedIncome

    };
}


/* =========================================================
   INITIALISATION
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    function () {

        const page =
            window.location.pathname
                .split("/")
                .pop()
                .toLowerCase();


        if (
            page === "dashboard.html"
        ) {

            const userId =
                getCurrentUserId();


            if (!userId) {

                window.location.replace(
                    "login.html"
                );

                return;
            }


            processInvestmentGainsForUser(
                userId
            );
        }


        if (
            page === "admin.html" &&
            isAdminAuthenticated()
        ) {

            processAllInvestmentGains();
        }

    }
);


/* =========================================================
   FIN
========================================================= */
