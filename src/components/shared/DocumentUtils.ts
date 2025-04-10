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
  training_days?: Array<{
    date: string;
    morning: boolean;
    afternoon: boolean;
  }>;
  periods?: Array<{
    startDate?: string;
    start_date?: string;
    endDate?: string;
    end_date?: string;
    [key: string]: any;
  }>;
  metadata?: any;
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
  console.log('🔍 [DEBUG_DATES] Début getTrainingDates avec startDate:', startDate, 'endDate:', endDate);
  
  if (!startDate || !endDate) {
    console.log('🔍 [DEBUG_DATES] Dates manquantes, retour tableau vide');
    return [];
  }

  try {
    // Normalize dates to ensure consistent handling
    const parseDate = (dateStr: string): Date => {
      // Handle ISO format (YYYY-MM-DD)
      if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
        return new Date(dateStr);
      }
      
      // Handle French format (DD/MM/YYYY)
      if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateStr)) {
        const parts = dateStr.split('/');
        return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
      }
      
      // Default parsing
      return new Date(dateStr);
    };
    
    const start = parseDate(startDate);
    const end = parseDate(endDate);
    
    // Verify the dates are valid
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      console.error('🔍 [DEBUG_DATES] Dates invalides:', startDate, endDate);
      return [];
    }
    
    console.log('🔍 [DEBUG_DATES] Dates converties - start:', start, 'end:', end);
    
    const dates: string[] = [];
    const dayMilliseconds = 24 * 60 * 60 * 1000;
    const totalDays = Math.ceil((end.getTime() - start.getTime()) / dayMilliseconds) + 1;
    
    // Safety check to avoid infinite loops
    if (totalDays > 100) {
      console.error('🔍 [DEBUG_DATES] Trop de jours entre les dates:', totalDays);
      return [];
    }

    for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
      // Create a new date object to avoid reference issues
      const currentDate = new Date(date);
      let formattedDate = formatDate(currentDate);
      
      // Ensure we have a properly formatted date - if not, format it manually
      if (!formattedDate || !/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(formattedDate)) {
        console.warn('🔍 [DEBUG_DATES] Reformatage manuel de la date:', currentDate);
        // Manual formatting to ensure DD/MM/YYYY
        const day = currentDate.getDate().toString().padStart(2, '0');
        const month = (currentDate.getMonth() + 1).toString().padStart(2, '0');
        const year = currentDate.getFullYear();
        formattedDate = `${day}/${month}/${year}`;
      }
      
      // Final verification that we have a valid date string
      if (formattedDate && /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(formattedDate)) {
        dates.push(formattedDate);
      } else {
        console.error('🔍 [DEBUG_DATES] Format de date invalide après correction:', formattedDate, 'pour', currentDate);
      }
    }

    console.log('🔍 [DEBUG_DATES] Dates générées:', dates);
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
  console.log("📄 [PDF_GEN_START] Début de la génération PDF...");
  
  // Récupérer le type de document depuis l'attribut data-document-type
  const documentTypeValue = element.querySelector('[data-document-type]')?.getAttribute('data-document-type');
  const documentType = documentTypeValue as DocumentType | null;
  console.log(`📄 [PDF_GEN_TYPE] Type de document détecté: ${documentType || 'inconnu'}`);
  
  // Créer une copie profonde de l'élément pour ne pas modifier l'original
  const clonedElement = element.cloneNode(true) as HTMLElement;
  
  // Traitement spécial pour les feuilles d'émargement
  if (documentType === DocumentType.ATTENDANCE_SHEET || documentTypeValue === 'attendance_sheet') {
    console.log('📄 [PDF_GEN_ATTENDANCE] Traitement spécial pour feuille d\'émargement');
    
    // 1. Corriger spécifiquement les cellules rowSpan en ajoutant des attributs HTML et CSS explicites
    const dateCells = clonedElement.querySelectorAll('td[data-date]');
    
    dateCells.forEach(cell => {
      const date = cell.getAttribute('data-date');
      
      // Vérifier si l'attribut rowSpan existe, sinon l'ajouter
      if (!cell.hasAttribute('rowspan')) {
        cell.setAttribute('rowspan', '2');
      }
      
      // Appliquer des styles consistants pour toutes les cellules de date
      (cell as HTMLElement).style.verticalAlign = 'middle';
      (cell as HTMLElement).style.fontWeight = 'normal';
      (cell as HTMLElement).style.border = '1px solid #ccc';
      (cell as HTMLElement).style.textAlign = 'center';
      (cell as HTMLElement).style.padding = '8px';
      
      // IMPORTANT: Force le contenu texte des cellules date
      // Remplacer tout contenu avec des points par "Date invalide"
      const currentContent = cell.textContent?.trim() || '';
      if (currentContent.includes('.') || currentContent === '. .' || currentContent === '• •' || currentContent === '· ·') {
        cell.innerHTML = '<span style="font-style: italic; color: #666;">Date invalide</span>';
      } else {
        // Vérifier si la cellule contient un span avec la classe date-display
        const dateSpan = cell.querySelector('.date-display');
        if (dateSpan) {
          // S'assurer que le contenu du span est correct
          const spanContent = dateSpan.textContent?.trim() || '';
          if (spanContent.includes('.') || spanContent === '') {
            dateSpan.textContent = 'Date invalide';
          }
        } else if (date && /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(date)) {
          // Si nous avons une date valide mais pas de span, forcer l'affichage de la date
          cell.innerHTML = `<span>${date}</span>`;
        } else if (!currentContent || currentContent === '') {
          // Si la cellule est vide, mettre "Date invalide"
          cell.innerHTML = '<span style="font-style: italic; color: #666;">Date invalide</span>';
        }
      }
    });
    
    // 2. Marquer toutes les lignes avec des attributs data pour s'assurer qu'elles sont correctement reliées
    // Trouver toutes les lignes qui contiennent des cellules de date
    const dateRows = clonedElement.querySelectorAll('tr');
    let currentDate: string | null = null;
    
    dateRows.forEach((row, index) => {
      // Chercher une cellule de date dans cette ligne
      const dateCell = row.querySelector('td[data-date]');
      if (dateCell) {
        currentDate = dateCell.getAttribute('data-date');
        row.setAttribute('data-date-row', currentDate || '');
        row.setAttribute('data-row-type', 'morning');
      } else if (currentDate && index > 0) {
        // Si ligne suivante sans cellule de date, c'est probablement l'après-midi
        const prevRow = dateRows[index - 1];
        if (prevRow && prevRow.getAttribute('data-date-row') === currentDate) {
          row.setAttribute('data-date-row', currentDate);
          row.setAttribute('data-row-type', 'afternoon');
        }
      }
    });
    
    // 3. Rechercher toutes les cellules de signature et s'assurer qu'elles sont correctement formatées
    const signatureCells = clonedElement.querySelectorAll('td[data-signature-cell="true"]');
    
    signatureCells.forEach(cell => {
      // Ajouter un style de base pour s'assurer que la cellule est bien visible
      (cell as HTMLElement).style.border = '1px solid #ccc';
      (cell as HTMLElement).style.minHeight = '60px';
      (cell as HTMLElement).style.height = '60px';
      
      // Vérifier si c'est une cellule de la date 24/04/2025
      const parentRow = cell.closest('tr');
      if (parentRow) {
        const dateRowAttr = parentRow.getAttribute('data-date-row');
        if (dateRowAttr === '24/04/2025') {
          console.log('📄 [PDF_GEN_ATTENDANCE] Correction de cellule de signature pour 24/04/2025');
          // Forcer styles pour la cellule de signature problématique
          (cell as HTMLElement).style.border = '2px solid #aaa';
          (cell as HTMLElement).style.background = '#fafafa';
        }
      }
    });
    
    // 4. Forcer le style de la table pour garantir un rendu cohérent
    const tables = clonedElement.querySelectorAll('table');
    tables.forEach(table => {
      table.setAttribute('cellspacing', '0');
      table.setAttribute('cellpadding', '0');
      table.setAttribute('border', '1');
      (table as HTMLElement).style.borderCollapse = 'collapse';
      (table as HTMLElement).style.width = '100%';
      (table as HTMLElement).style.tableLayout = 'fixed';
    });
  }
  
  // Configuration optimisée pour les PDFs
  const pdfOptions = {
    margin: 10, // Marge uniforme en mm
    filename: `document_${new Date().getTime()}.pdf`,
    image: { type: 'jpeg', quality: 0.95 },
    html2canvas: { 
      scale: 2,  // Augmenter la résolution pour une meilleure qualité
      useCORS: true, // Pour permettre le chargement d'images externes
      logging: false, // Désactiver les logs de html2canvas
      letterRendering: true, // Améliore le rendu du texte
      allowTaint: true, // Permet de capturer des images cross-origin
      scrollX: 0,
      scrollY: 0,
      windowWidth: document.documentElement.offsetWidth,
      windowHeight: document.documentElement.offsetHeight
    },
    jsPDF: { 
      unit: 'mm', 
      format: 'a4', 
      orientation: 'portrait',
      compress: true, // Compresser le PDF
      precision: 16 // Précision des calculs
    }
  };
  
  // Pré-traitement supplémentaire pour les signatures
  try {
    // 1. S'assurer que toutes les images sont chargées
    const signatureImages = clonedElement.querySelectorAll('img');
    for (let i = 0; i < signatureImages.length; i++) {
      const img = signatureImages[i] as HTMLImageElement;
      
      // Si l'image a un alt qui contient "signature" ou "tampon", assurer qu'elle est correctement dimensionnée
      if (img.alt && (img.alt.toLowerCase().includes('signature') || img.alt.toLowerCase().includes('tampon'))) {
        // Appliquer des styles pour s'assurer que l'image s'affiche correctement dans le PDF
        img.style.maxWidth = '100%';
        img.style.maxHeight = '80px';
        img.style.objectFit = 'contain';
        img.setAttribute('crossorigin', 'anonymous');
        
        // Ajouter une classe pour faciliter les manipulations ultérieures
        img.classList.add('signature-image-for-pdf');
        
        console.log(`📄 [PDF_GEN_SIG_IMAGE] Optimisation de l'image: ${img.alt}`);
      }
    }
    
    // 2. Supprimer les éléments interactifs ou non nécessaires pour le PDF
    const elementsToRemove = clonedElement.querySelectorAll('button, input, .pdf-hide, [data-pdf-hide="true"]');
    elementsToRemove.forEach(el => el.parentNode?.removeChild(el));
    
    console.log('📄 [PDF_GEN_CLEAN] Nettoyage des éléments interactifs terminé');
  } catch (preprocessError) {
    console.error('❌ [PDF_GEN_PREPROCESS_ERROR] Erreur lors du pré-traitement:', preprocessError);
    // Continuer malgré l'erreur
  }
  
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
  
  // Ajouter un délai pour permettre au navigateur de finaliser le rendu
  await new Promise(resolve => setTimeout(resolve, 100));
  
  const pdfBlob = await html2pdf().set(pdfOptions).from(clonedElement).outputPdf('blob');

  console.log('📄 [PDF_GEN_CORE_SUCCESS] PDF Blob généré avec succès. Taille:', pdfBlob.size);
  console.log("📄 [PDF_GEN_END] Fin de la génération PDF (succès).");
  return pdfBlob;
}
            
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