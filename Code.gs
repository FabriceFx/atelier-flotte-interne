/**
 * @author Fabrice Faucheux
 */

const ID_FEUILLE_CALCUL = SpreadsheetApp.getActiveSpreadsheet().getId();
const NOM_ONGLET_REPARATIONS = "Reparations";

const LISTE_ADMINS = [
  "xxx@gmail.com", 
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
  const idUnique = `REP-${Date.now()}`;
  
  // Ordre strict des colonnes : 
  // ID, Date, Nom, Email, Mobile, Marque, Modele, Immat, Garage, Desc, Statut...
  feuille.appendRow([
    idUnique, 
    new Date(), 
    formulaire.nomConducteur, 
    formulaire.emailConducteur,
    formulaire.mobileConducteur, // NOUVEAU
    formulaire.marque,           // NOUVEAU
    formulaire.modele,           // NOUVEAU
    formulaire.vehicule, // Correspond à l'immatriculation
    formulaire.garage, 
    formulaire.description, 
    'EN_ATTENTE', '', '', ''
  ]);

  envoyerNotification(
    formulaire.emailConducteur,
    `Confirmation demande : ${formulaire.marque} ${formulaire.modele}`,
    `Bonjour ${formulaire.nomConducteur},<br>Votre demande pour le véhicule <strong>${formulaire.marque} ${formulaire.modele} (${formulaire.vehicule})</strong> a bien été reçue par l'atelier.`
  );

  return { succes: true, message: "Demande enregistrée et conducteur notifié." };
};

const recupererListeReparations = () => {
   const classeur = SpreadsheetApp.openById(ID_FEUILLE_CALCUL);
   const feuille = classeur.getSheetByName(NOM_ONGLET_REPARATIONS);
   if (feuille.getLastRow() < 2) return [];
   
   const valeurs = feuille.getDataRange().getValues();
   valeurs.shift(); 
   
   // Mapping avec les nouveaux index
   return valeurs.map(ligne => ({
      id: ligne[0],
      date: new Date(ligne[1]).toLocaleDateString("fr-FR"),
      conducteur: ligne[2],
      email: ligne[3],
      mobile: ligne[4],   // NOUVEAU
      marque: ligne[5],   // NOUVEAU
      modele: ligne[6],   // NOUVEAU
      vehicule: ligne[7], // Immat (décalé)
      garage: ligne[8],   // (décalé)
      description: ligne[9], 
      statut: ligne[10],
      dateIntervention: ligne[11] ? new Date(ligne[11]).toLocaleDateString("fr-FR") : '-',
    })).reverse();
};

const mettreAJourIntervention = (id, statut, date) => {
   const classeur = SpreadsheetApp.openById(ID_FEUILLE_CALCUL);
   const feuille = classeur.getSheetByName(NOM_ONGLET_REPARATIONS);
   const donnees = feuille.getDataRange().getValues();
   const index = donnees.findIndex(r => r[0] == id);
   
   if(index > -1) {
     const ligne = index + 1;
     // ATTENTION : Le statut est maintenant en colonne 11 (K) et Date en 12 (L)
     // car nous avons ajouté 3 colonnes avant.
     feuille.getRange(ligne, 11, 1, 2).setValues([[statut, date]]);
     
     const info = donnees[index]; 
     const conducteurEmail = info[3];
     const marqueModele = `${info[5]} ${info[6]}`; // Marque + Modèle

     let message = `Bonjour,<br>Le statut de votre demande pour <strong>${marqueModele}</strong> a changé.`;
     message += `<br>Nouveau statut : <strong>${statut}</strong>`;
     if (date) message += `<br>Date d'intervention : <strong>${new Date(date).toLocaleDateString("fr-FR")}</strong>`;
     
     envoyerNotification(conducteurEmail, `Mise à jour : ${marqueModele}`, message);

     // Calendrier
     if(statut === 'PLANIFIE' && date) {
        try {
          // Création événement : "Marque Modèle - Immat (Conducteur)"
          const titreEvent = `🔧 ${marqueModele} - ${info[7]} (${info[2]})`;
          CalendarApp.getDefaultCalendar().createAllDayEvent(titreEvent, new Date(date));
        } catch(e) { console.log("Erreur calendrier " + e); }
     }
   }
   return { succes: true, message: "Mise à jour effectuée." };
};

// --- PDF & NOTIFICATIONS ---

const genererEtEnvoyerPDF = (idReparation) => {
  try {
    const list = recupererListeReparations();
    const item = list.find(x => x.id === idReparation);
    if (!item) throw new Error("Réparation introuvable");

    const htmlTemplate = `
      <div style="font-family: Arial, sans-serif; color: #333; padding: 20px; border: 2px solid #0056b3;">
        <h1 style="color: #0056b3; border-bottom: 1px solid #ccc; padding-bottom: 10px;">BON D'INTERVENTION</h1>
        <p><strong>Réf :</strong> ${item.id} <br> <strong>Date :</strong> ${new Date().toLocaleDateString("fr-FR")}</p>
        
        <table style="width: 100%; margin-top: 20px; border-collapse: collapse;">
          <tr style="background-color: #f2f2f2;">
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Véhicule</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">
              ${item.marque} ${item.modele}<br>
              <small>Immat: ${item.vehicule}</small>
            </td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Conducteur</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">
              ${item.conducteur}<br>
              ${item.email}<br>
              Tel: ${item.mobile}
            </td>
          </tr>
          <tr style="background-color: #f2f2f2;">
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Atelier</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">${item.garage}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Date Prévue</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">${item.dateIntervention}</td>
          </tr>
        </table>

        <div style="margin-top: 20px; padding: 10px; border: 1px solid #ddd; background-color: #fff9db;">
          <strong>Description du problème :</strong><br>
          ${item.description}
        </div>
      </div>
    `;

    const blob = Utilities.newBlob(htmlTemplate, MimeType.HTML).getAs(MimeType.PDF);
    blob.setName(`Bon_${item.vehicule}_${item.id}.pdf`);

    const emailAdmin = Session.getActiveUser().getEmail();
    GmailApp.sendEmail(item.email, `Bon d'intervention : ${item.marque} ${item.modele}`, "Ci-joint le bon d'intervention.", {
      htmlBody: "Bonjour,<br><br>Veuillez trouver ci-joint le <strong>bon d'intervention</strong>.<br><br>L'équipe Atelier.",
      attachments: [blob],
      cc: emailAdmin
    });

    return { succes: true, message: `PDF envoyé à ${item.email}` };

  } catch (e) {
    console.error(e);
    return { succes: false, message: "Erreur PDF : " + e.message };
  }
};

const envoyerNotification = (destinataire, sujet, corpsHtml) => {
  try {
    if(destinataire && destinataire.includes("@")) {
      GmailApp.sendEmail(destinataire, sujet, "", { htmlBody: corpsHtml });
    }
  } catch (e) { console.warn(e); }
};
