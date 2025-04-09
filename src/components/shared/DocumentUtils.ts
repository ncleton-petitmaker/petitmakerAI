import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import html2pdf from 'html2pdf.js';
import { DocumentType } from '../../types/SignatureTypes';
import { getSignaturePositions, applySignaturePositions, SignaturePosition } from '../../utils/SignatureUtils';

/**
 * Utilitaires partagés pour les documents
 * 
 * IMPORTANT: Ce module centralise toutes les fonctions communes utilisées dans les templates de documents
 * pour garantir une cohérence parfaite entre les documents vus dans le CRM et l'interface apprenant.
 * 
 * Ne jamais dupliquer ces fonctions dans d'autres composants pour éviter les divergences.
 */

export interface Training {
  id: string;
  title: string;
  duration: string;
  trainer_name: string;
  trainer_details?: string;
  location: string | { name: string; city?: string };
  start_date: string | null;
  end_date: string | null;
  objectives?: string[];
  price?: number;
  evaluation_methods?: {
    profile_evaluation?: boolean;
    skills_evaluation?: boolean;
    knowledge_evaluation?: boolean;
    satisfaction_survey?: boolean;
  };
  tracking_methods?: {
    attendance_sheet?: boolean;
    completion_certificate?: boolean;
  };
  pedagogical_methods?: {
    needs_evaluation?: boolean;
    theoretical_content?: boolean;
    practical_exercises?: boolean;
    case_studies?: boolean;
    experience_sharing?: boolean;
    digital_support?: boolean;
  };
  material_elements?: {
    computer?: boolean;
    projector?: boolean;
    whiteboard?: boolean;
    documentation?: boolean;
    computer_provided?: boolean;
    pedagogical_material?: boolean;
    digital_support_provided?: boolean;
  };
}

export interface Participant {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  status?: string;
  job_position?: string;
  company?: string;
}

export interface OrganizationSettings {
  organization_name: string;
  address?: string;
  postal_code?: string;
  city?: string;
  country?: string;
  siret?: string;
  activity_declaration_number?: string;
  representative_name?: string;
  representative_title?: string;
  organization_seal_url?: string;
}

export const formatDate = (dateString: string | null | Date): string => {
  if (!dateString) return '';
  try {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return format(date, 'dd/MM/yyyy', { locale: fr });
  } catch (e) {
    console.error('Erreur de formatage de date:', e);
    return typeof dateString === 'string' ? dateString : '';
  }
};

export const getCurrentDate = (): string => {
  return format(new Date(), 'dd/MM/yyyy', { locale: fr });
};

export const getTrainingDates = (startDate: string | null, endDate: string | null): string[] => {
  if (!startDate || !endDate) return [];

  try {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const dates: string[] = [];

    for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
      dates.push(formatDate(date));
    }

    return dates;
  } catch (e) {
    console.error('Erreur lors du calcul des dates de formation:', e);
    return [];
  }
};

export const formatLocation = (location: string | { name: string; city?: string }): string => {
  if (typeof location === 'string') return location;
  return location.city ? `${location.name}, ${location.city}` : location.name;
};

// Extraire le prénom du formateur
export const getTrainerFirstName = (trainerName: string) => {
  if (!trainerName) return '';
  const nameParts = trainerName.split(' ');
  return nameParts[0] || '';
};

// Traiter et obtenir les objectifs de formation
export const getObjectives = (objectives: string[] | string | null | undefined) => {
  // Si objectives est undefined ou null
  if (!objectives) {
    return ['Objectifs à définir'];
  }
  
  // Si objectives est déjà un tableau
  if (Array.isArray(objectives)) {
    return objectives.length > 0 ? objectives : ['Objectifs à définir'];
  }
  
  // Si objectives est une chaîne de caractères
  if (typeof objectives === 'string') {
    // Essayer de parser comme JSON
    try {
      const parsed = JSON.parse(objectives);
      
      // Si c'est un tableau
      if (Array.isArray(parsed)) {
        return parsed.length > 0 ? parsed : ['Objectifs à définir'];
      }
      
      // Si c'est un objet
      if (typeof parsed === 'object' && parsed !== null) {
        const values = Object.values(parsed);
        if (values.length > 0) {
          return values;
        }
      }
    } catch (e) {
      // Si ce n'est pas du JSON valide
    }
    
    // Vérifier si la chaîne contient des sauts de ligne ou des puces
    if (objectives.includes('\n') || objectives.includes('•')) {
      // Diviser par sauts de ligne et nettoyer les puces
      const lines = objectives
        .split('\n')
        .map((line: string) => line.trim().replace(/^•\s*/, ''))
        .filter((line: string) => line.length > 0);
      
      return lines.length > 0 ? lines : ['Objectifs à définir'];
    }
    
    // Sinon, utiliser comme un seul objectif
    return [objectives];
  }
  
  // Pour tout autre type
  return ['Objectifs à définir'];
};

// Obtenir les méthodes d'évaluation
export const getEvaluationMethods = (evaluationMethods?: {
  profile_evaluation?: boolean;
  skills_evaluation?: boolean;
  knowledge_evaluation?: boolean;
  satisfaction_survey?: boolean;
}) => {
  const methods = [];
  
  if (evaluationMethods?.profile_evaluation) methods.push("Évaluation du profil avant formation");
  if (evaluationMethods?.skills_evaluation) methods.push("Évaluation des compétences acquises");
  if (evaluationMethods?.knowledge_evaluation) methods.push("Évaluation des connaissances");
  if (evaluationMethods?.satisfaction_survey) methods.push("Questionnaire de satisfaction");
  
  return methods.length > 0 ? methods : ["Évaluation à définir"];
};

// Obtenir les méthodes de suivi
export const getTrackingMethods = (trackingMethods?: {
  attendance_sheet?: boolean;
  completion_certificate?: boolean;
}) => {
  const methods = [];
  
  if (trackingMethods?.attendance_sheet) methods.push("Feuilles d'émargement");
  if (trackingMethods?.completion_certificate) methods.push("Attestation de fin de formation");
  
  return methods.length > 0 ? methods : ["Suivi à définir"];
};

// Obtenir les méthodes pédagogiques
export const getPedagogicalMethods = (pedagogicalMethods?: {
  needs_evaluation?: boolean;
  theoretical_content?: boolean;
  practical_exercises?: boolean;
  case_studies?: boolean;
  experience_sharing?: boolean;
  digital_support?: boolean;
}) => {
  const methods = [];
  
  if (pedagogicalMethods?.needs_evaluation) methods.push("Évaluation des besoins");
  if (pedagogicalMethods?.theoretical_content) methods.push("Apports théoriques");
  if (pedagogicalMethods?.practical_exercises) methods.push("Exercices pratiques");
  if (pedagogicalMethods?.case_studies) methods.push("Études de cas");
  if (pedagogicalMethods?.experience_sharing) methods.push("Partage d'expérience");
  if (pedagogicalMethods?.digital_support) methods.push("Support numérique");
  
  return methods.length > 0 ? methods : ["Méthodes pédagogiques à définir"];
};

// Obtenir les éléments matériels
export const getMaterialElements = (materialElements?: {
  computer_provided?: boolean;
  pedagogical_material?: boolean;
  digital_support_provided?: boolean;
}) => {
  const elements = [];
  
  if (materialElements?.computer_provided) elements.push("Ordinateur fourni");
  if (materialElements?.pedagogical_material) elements.push("Matériel pédagogique");
  if (materialElements?.digital_support_provided) elements.push("Support numérique fourni");
  
  return elements.length > 0 ? elements : ["Éléments matériels à définir"];
};

// Générer un PDF multi-pages à partir d'un élément HTML
export const generateDocumentPDF = async (element: HTMLElement): Promise<Blob> => {
  console.log("📄 [PDF_GEN_START] Début de la génération PDF.");
  try {
    // Détecter le type de document à partir de l'attribut data-document-type
    const documentType = element.getAttribute('data-document-type') as DocumentType | null;
    console.log(`📄 [PDF_GEN_INFO] Type de document détecté: ${documentType || 'non trouvé/inconnu'}`);

    // Configuration de html2pdf.js
    const pdfOptions = {
      margin: 40, // Revenir à une valeur unique (probablement en points)
      filename: `${documentType || 'document'}_${Date.now()}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: {
        scale: 2, // Augmenter la résolution
        logging: true, // Activer les logs html2canvas pour plus de détails
        useCORS: true,
        allowTaint: true, // Essayer d'autoriser les images cross-origin
        onrendered: function(canvas: HTMLCanvasElement) {
          // Tentative pour éviter les canvas vides
          if (canvas.width === 0 || canvas.height === 0) {
            console.error('❌ [PDF_GEN_H2C_ERROR] Erreur Html2Canvas: Canvas vide généré.');
          } else {
            console.log('📄 [PDF_GEN_H2C_SUCCESS] Html2Canvas a rendu le canvas avec succès.');
          }
        }
      },
      jsPDF: {
        unit: 'pt', // Assurer la cohérence avec la marge
        format: 'a4',
        orientation: 'portrait'
      },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] } // Modes de gestion des sauts de page
    };

    console.log('📄 [PDF_GEN_OPTIONS] Options html2pdf préparées:', JSON.stringify(pdfOptions, null, 2));

    // Créer une copie clonée pour éviter les modifications directes
    console.log('📄 [PDF_GEN_CLONE] Clonage de l\'élément HTML source.');
    const clonedElement = element.cloneNode(true) as HTMLElement;
    console.log('📄 [PDF_GEN_CLONE_SUCCESS] Élément HTML cloné.');

    let positions: Record<string, SignaturePosition> | null = null;
    // Appliquer le positionnement des signatures si nécessaire
    if (documentType) {
      try {
        console.log(`📄 [PDF_GEN_POS_FETCH] Tentative de récupération des positions pour ${documentType}`);
        positions = await getSignaturePositions(documentType);
        if (positions && Object.keys(positions).length > 0) {
          console.log(`📄 [PDF_GEN_POS_FOUND] Positions trouvées pour ${documentType}:`, JSON.stringify(positions, null, 2));
          console.log(`📄 [PDF_GEN_POS_APPLY] Tentative d\'application des positions sur l\'élément cloné.`);
          applySignaturePositions(clonedElement, positions);
          console.log(`📄 [PDF_GEN_POS_APPLY_SUCCESS] Application des positions terminée.`);
        } else {
          console.log(`📄 [PDF_GEN_POS_NOT_FOUND] Aucune position de signature trouvée ou définie pour ${documentType}.`);
        }
      } catch (error) {
        console.error(`❌ [PDF_GEN_POS_ERROR] Erreur lors de la récupération/application des positions pour ${documentType}:`, error);
        // Continuer sans positionnement si erreur
      }
    } else {
      console.log('📄 [PDF_GEN_POS_SKIP] Pas de type de document détecté, positionnement des signatures ignoré.');
    }

    // Générer le PDF avec html2pdf
    console.log('📄 [PDF_GEN_CORE_START] Appel de html2pdf().set(pdfOptions).from(clonedElement).outputPdf(\'blob\')...');
    const pdfBlob = await html2pdf().set(pdfOptions).from(clonedElement).outputPdf('blob');

    console.log('📄 [PDF_GEN_CORE_SUCCESS] PDF Blob généré avec succès. Taille:', pdfBlob.size);
    console.log("📄 [PDF_GEN_END] Fin de la génération PDF (succès).");
    return pdfBlob;

  } catch (error) {
    console.error('❌ [PDF_GEN_END_ERROR] Erreur majeure lors de la génération du PDF:', error);
    console.log("📄 [PDF_GEN_END] Fin de la génération PDF (erreur).");
    // Retourner un Blob vide ou rejeter la promesse en cas d'erreur critique
    return new Blob([]); // Ou throw error;
  }
};
            
/**
 * Génère un PDF et l'ouvre dans une fenêtre modale avec le PdfViewer
 * @param element Élément HTML à convertir en PDF
 * @param onPdfGenerated Callback appelé avec le Blob du PDF généré
 */
export async function generateAndDisplayPDF(element: HTMLElement, onPdfGenerated?: (blob: Blob) => void): Promise<Blob> {
  try {
    // Générer le PDF
    const pdfBlob = await generateDocumentPDF(element);
    
    // Appeler le callback si fourni
    if (onPdfGenerated) {
      onPdfGenerated(pdfBlob);
      }
    
    return pdfBlob;
  } catch (error) {
    console.error('Erreur lors de la génération et de l\'affichage du PDF:', error);
    throw error;
  }
} 