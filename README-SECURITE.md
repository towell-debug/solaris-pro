# Solaris Pro — compléments créés

Fichiers ajoutés :
- `contact.html` : page de contact/assistance publique sans inventer de coordonnées.
- `404.html` : page d'erreur compatible avec GitHub Pages.

## Important avant mise en production

Le code actuel stocke les comptes, mots de passe, soldes, transactions et sessions dans le navigateur (`localStorage`/`sessionStorage`). Cela convient uniquement à une maquette locale, pas à une plateforme financière réelle.

Le code administrateur est également présent côté navigateur, donc un visiteur techniquement compétent peut le retrouver.

La prochaine refonte doit déplacer au minimum :
- authentification et mots de passe ;
- rôles et autorisations administrateur ;
- soldes ;
- dépôts/retraits ;
- investissements et gains ;
- parrainage ;
- tickets et notifications ;

vers un backend sécurisé (par exemple Supabase avec RLS et fonctions serveur).

La récupération du mot de passe actuelle n'est pas une vraie réinitialisation sécurisée : il ne faut pas ajouter une page permettant de changer le mot de passe uniquement à partir du numéro de téléphone sans vérification.
