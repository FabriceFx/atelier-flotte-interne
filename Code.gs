/**
 * @fileoverview Backend complet : SPA, PDF, Notifications et Calendrier.
 * @author Fabrice Faucheux
 */

const ID_FEUILLE_CALCUL = SpreadsheetApp.getActiveSpreadsheet().getId();
const NOM_ONGLET_REPARATIONS = "Reparations";

// LISTE DES ADMINS (GARAGE)
const LISTE_ADMINS = [
  "fabrice.faucheux@gmail.com", // Mettez votre email ici pour tester
  "atelier@entreprise.com"
];


const doGet = () => {
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('Gestion Flotte Auto')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
};

const verifierDroitsUtilisateur = () => {
  const email = Session.getActiveUser().getEmail();
  return { email: email, estAdmin: LISTE_ADMINS.includes(email) };
};

// --- GESTION DES DONNÉES ---

const enregistrerNouvelleDemande = (formulaire) => {
  const classeur = SpreadsheetApp.openById(ID_FEUILLE_CALCUL);
  const feuille = classeur.getSheetByName(NOM_ONGLET_REPARATIONS);
  const idUnique = `REP-${Date.now()}`; // ID unique basé sur le temps
  
  feuille.appendRow([
    idUnique, new Date(), formulaire.nomConducteur, formulaire.emailConducteur,
    formulaire.vehicule, formulaire.garage, formulaire.description, 'EN_ATTENTE', '', '', ''
  ]);

  // Notification de réception au conducteur
  envoyerNotification(
    formulaire.emailConducteur,
    `Confirmation demande : ${formulaire.vehicule}`,
    `Bonjour ${formulaire.nomConducteur},<br>Votre demande pour le véhicule <strong>${formulaire.vehicule}</strong> a bien été reçue par l'atelier.`
  );

  return { succes: true, message: "Demande enregistrée et conducteur notifié." };
};

const recupererListeReparations = () => {
   const classeur = SpreadsheetApp.openById(ID_FEUILLE_CALCUL);
   const feuille = classeur.getSheetByName(NOM_ONGLET_REPARATIONS);
   if (feuille.getLastRow() < 2) return [];
   const valeurs = feuille.getDataRange().getValues();
   valeurs.shift(); // Supprime l'entête
   
   return valeurs.map(ligne => ({
      id: ligne[0],
      date: new Date(ligne[1]).toLocaleDateString("fr-FR"),
      conducteur: ligne[2],
      email: ligne[3], // On récupère l'email pour le PDF
      vehicule: ligne[4],
      garage: ligne[5],
      description: ligne[6], // Nécessaire pour le PDF
      statut: ligne[7],
      dateIntervention: ligne[8] ? new Date(ligne[8]).toLocaleDateString("fr-FR") : '-',
    })).reverse();
};

const mettreAJourIntervention = (id, statut, date) => {
   const classeur = SpreadsheetApp.openById(ID_FEUILLE_CALCUL);
   const feuille = classeur.getSheetByName(NOM_ONGLET_REPARATIONS);
   const donnees = feuille.getDataRange().getValues();
   const index = donnees.findIndex(r => r[0] == id);
   
   if(index > -1) {
     const ligne = index + 1;
     // Mise à jour Sheet
     feuille.getRange(ligne, 8, 1, 2).setValues([[statut, date]]);
     
     // Récupération infos pour notification
     const info = donnees[index]; 
     const conducteurNom = info[2];
     const conducteurEmail = info[3];
     const vehicule = info[4];

     // Notification intelligente
     let message = `Bonjour ${conducteurNom},<br>Le statut de votre demande pour <strong>${vehicule}</strong> a changé.`;
     message += `<br>Nouveau statut : <strong>${statut}</strong>`;
     if (date) message += `<br>Date d'intervention : <strong>${new Date(date).toLocaleDateString("fr-FR")}</strong>`;
     
     envoyerNotification(conducteurEmail, `Mise à jour : ${vehicule}`, message);

     // Gestion Calendrier (Simplifiée pour l'exemple)
     if(statut === 'PLANIFIE' && date) {
        try {
          CalendarApp.getDefaultCalendar().createAllDayEvent(`🔧 ${vehicule} (${conducteurNom})`, new Date(date));
        } catch(e) { console.log("Erreur calendrier " + e); }
     }
   }
   return { succes: true, message: "Mise à jour effectuée et email envoyé." };
};

// --- MOTEUR PDF & NOTIFICATIONS ---

/**
 * Génère un PDF HTML et l'envoie par email au conducteur et à l'admin connecté.
 */
const genererEtEnvoyerPDF = (idReparation) => {
  try {
    const list = recupererListeReparations(); // On réutilise la fonction de lecture
    const item = list.find(x => x.id === idReparation);
    
    if (!item) throw new Error("Réparation introuvable");

    // Construction du HTML du PDF (Design "Facture")
    const htmlTemplate = `
      <div style="font-family: Arial, sans-serif; color: #333; padding: 20px; border: 2px solid #0056b3;">
        <h1 style="color: #0056b3; border-bottom: 1px solid #ccc; padding-bottom: 10px;">BON D'INTERVENTION</h1>
        <p><strong>Réf :</strong> ${item.id} <br> <strong>Date émission :</strong> ${new Date().toLocaleDateString("fr-FR")}</p>
        
        <table style="width: 100%; margin-top: 20px; border-collapse: collapse;">
          <tr style="background-color: #f2f2f2;">
            <td style="padding: 10px; border: 1px solid #ddd;"><strong>Véhicule</strong></td>
            <td style="padding: 10px; border: 1px solid #ddd;">${item.vehicule}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd;"><strong>Conducteur</strong></td>
            <td style="padding: 10px; border: 1px solid #ddd;">${item.conducteur} (${item.email})</td>
          </tr>
          <tr style="background-color: #f2f2f2;">
            <td style="padding: 10px; border: 1px solid #ddd;"><strong>Atelier</strong></td>
            <td style="padding: 10px; border: 1px solid #ddd;">${item.garage}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd;"><strong>Date Intervention</strong></td>
            <td style="padding: 10px; border: 1px solid #ddd;">${item.dateIntervention}</td>
          </tr>
        </table>

        <div style="margin-top: 20px; padding: 10px; border: 1px solid #ddd; background-color: #fff9db;">
          <strong>Description du problème :</strong><br>
          ${item.description}
        </div>

        <div style="margin-top: 40px; text-align: right;">
          <p>Visa du Responsable Atelier :</p>
          <br><br>
          <p>__________________________</p>
        </div>
      </div>
    `;

    // Conversion en PDF
    const blob = Utilities.newBlob(htmlTemplate, MimeType.HTML).getAs(MimeType.PDF);
    blob.setName(`Bon_Intervention_${item.vehicule}_${item.id}.pdf`);

    // Envoi par email (Au conducteur + Copie à l'admin qui a cliqué)
    const emailAdmin = Session.getActiveUser().getEmail();
    
    GmailApp.sendEmail(item.email, `Bon d'intervention : ${item.vehicule}`, "Veuillez trouver ci-joint le bon d'intervention.", {
      htmlBody: "Bonjour,<br><br>Veuillez trouver ci-joint le <strong>bon d'intervention</strong> récapitulatif.<br><br>Cordialement,<br>L'équipe Atelier.",
      attachments: [blob],
      cc: emailAdmin // L'admin reçoit aussi le PDF
    });

    return { succes: true, message: `PDF généré et envoyé à ${item.email}` };

  } catch (e) {
    console.error(e);
    return { succes: false, message: "Erreur PDF : " + e.message };
  }
};

/**
 * Utilitaire interne d'envoi d'email HTML
 */
const envoyerNotification = (destinataire, sujet, corpsHtml) => {
  try {
    if(destinataire && destinataire.includes("@")) {
      GmailApp.sendEmail(destinataire, sujet, "", { htmlBody: corpsHtml });
    }
  } catch (e) {
    console.warn(`Impossible d'envoyer l'email à ${destinataire}: ${e.message}`);
  }
};
