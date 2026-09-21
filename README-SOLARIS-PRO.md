# Solaris Pro

Version adaptée à partir de Housing's YQD, avec une identité solaire et une base Supabase indépendante.

## Installation

1. Dans le projet Supabase Solaris Pro, ouvrez **SQL Editor**.
2. Exécutez entièrement `SOLARIS-PRO-SUPABASE-COMPLET.sql`.
3. Inscrivez votre compte depuis le site.
4. Attribuez ensuite le rôle administrateur avec la requête placée à la fin du fichier SQL, en remplaçant `VOTRE_EMAIL`.
5. Importez tous les fichiers de ce dossier dans le dépôt GitHub Solaris Pro.

## Paramètres intégrés

- Paiement Wave et QR marchand conservés.
- Dépôt minimum : 500 FCFA.
- Frais de dépôt : 0 %.
- Frais de retrait : 0 %.
- Retrait minimum : 1 000 FCFA.
- Un retrait toutes les 24 heures.
- Huit packs de 100 jours, avec paramètres quotidiens de 15 % à 22 %.
- Base Supabase distincte de Housing's YQD.

## Sécurité

- Ne jamais placer une clé `service_role` ou `sb_secret_...` dans ces fichiers.
- Les validations financières sont réalisées par des fonctions SQL protégées.
- L'accès administrateur dépend du rôle Supabase et de la MFA.
- Un clic sur le lien Wave ne confirme jamais automatiquement un paiement.
