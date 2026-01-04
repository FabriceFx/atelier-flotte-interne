# 🚗 Gestion de flotte automobile (GAS)

Une Single Page Application interne pour gérer les demandes de réparation et le planning de l'atelier mécanique de l'entreprise.

## 📋 Fonctionnalités

* **Portail Conducteur :** Formulaire de déclaration de panne/entretien (auto-complétion des infos utilisateur).
* **Portail Atelier (Admin) :** Tableau de bord de gestion des demandes (sécurisé par liste blanche).
* **Planification :** Synchronisation automatique avec Google Calendar lors de la validation.
* **Notifications :** Alertes email HTML automatiques pour le conducteur (Confirmation, Planification, Fin).
* **Documents :** Génération et envoi automatique de Bons d'Intervention au format PDF.

## 🛠 Stack technique

* **Backend :** Google Apps Script (Moteur V8).
* **Frontend :** HTML5, Bootstrap 5 (CDN), JavaScript (ES6+).
* **Base de données :** Google Sheets.
* **Services Google utilisés :**
    * `SpreadsheetApp` (Stockage données)
    * `GmailApp` (Envoi emails)
    * `DriveApp` (Stockage PDF)
    * `CalendarApp` (Planning)

## 🚀 Installation

1.  Créer un nouveau Google Sheet.
2.  Ouvrir l'éditeur de script (`Extensions > Apps Script`).
3.  Copier le contenu de `Code.gs` et `appsscript.json` (Manifest).
4.  Créer un fichier HTML `Index.html` et y coller le code frontend.
5.  Exécuter la fonction `initialiserStructure()` pour préparer le Sheet.
6.  Déployer en tant qu'Application Web.

## ⚠️ Configuration requise

* Modifier la constante `LISTE_ADMINS` dans `Code.gs` pour définir les gestionnaires.
* Activer les scopes OAuth via le fichier `appsscript.json`.
