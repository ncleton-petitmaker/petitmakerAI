import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

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
  try {
    // Créer un élément div temporaire pour la génération du PDF
    const tempContainer = document.createElement('div');
    tempContainer.className = 'pdf-content-container';
    tempContainer.style.width = '210mm'; // Largeur A4
    tempContainer.style.position = 'absolute';
    tempContainer.style.left = '-9999px'; // Hors de l'écran
    tempContainer.style.top = '0';
    
    // Cloner l'élément et ajouter des attributs data pour identifier les sections
    const clonedElement = element.cloneNode(true) as HTMLElement;
    
    // Identifier les sections qui ne doivent pas être coupées
    const sectionsToPreserve = clonedElement.querySelectorAll('h1, h2, h3, table, ul, ol, p');
    sectionsToPreserve.forEach((section, index) => {
      section.setAttribute('data-section-id', `section-${index}`);
      section.setAttribute('data-preserve', 'true');
    });
    
    tempContainer.appendChild(clonedElement);
    document.body.appendChild(tempContainer);
    
    // Créer un nouveau document PDF
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });
    
    // Dimensions de la page A4
    const pageWidth = 210; // mm
    const pageHeight = 297; // mm
    const margin = 15; // mm
    const contentWidth = pageWidth - 2 * margin; // mm
    const contentHeight = pageHeight - 2 * margin - 10; // mm (avec 10mm de marge supplémentaire en bas)
    
    // Marge de sécurité en pixels pour éviter les coupures
    const safetyMarginPx = 20; // pixels de marge de sécurité
    
    // Préchargement des images avec une promesse
    const preloadAllImages = async () => {
      return new Promise<void>((resolve) => {
        // Liste pour stocker les promesses de préchargement d'images
        const imagePromises: Promise<void>[] = [];
        
        // Fonction pour précharger une image
        const preloadImage = (img: HTMLImageElement, idPrefix: string, index: number): Promise<void> => {
          return new Promise<void>((resolveImg) => {
            if (img && img.src) {
              // Assigner un ID unique si l'image n'en a pas
              if (!img.id) {
                img.id = `${idPrefix}-img-${index}`;
              }
              
              console.log(`🔍 [DEBUG] Préchargement de l'image ${img.id}:`, img.src);
              
              // Forcer le rechargement de l'image avec un cache buster
              const originalSrc = img.src;
              const cacheBuster = new Date().getTime();
              const newSrc = originalSrc.includes('?') 
                ? `${originalSrc}&_cb=${cacheBuster}` 
                : `${originalSrc}?_cb=${cacheBuster}`;
              
              // Créer une nouvelle image pour précharger
              const preloadImg = new Image();
              
              let timeout: NodeJS.Timeout;
              
              preloadImg.onload = () => {
                // Appliquer la nouvelle source et s'assurer que l'image est visible
                img.src = newSrc;
                img.style.display = 'block';
                img.style.visibility = 'visible';
                img.style.maxWidth = '100%';
                img.style.maxHeight = '100%';
                img.style.objectFit = 'contain';
                console.log(`🔍 [DEBUG] Image ${img.id} préchargée avec succès:`, newSrc);
                
                clearTimeout(timeout);
                resolveImg();
              };
              
              preloadImg.onerror = () => {
                console.error(`🔍 [DEBUG] Erreur de préchargement de l'image ${img.id}:`, newSrc);
                // En cas d'erreur, essayer d'utiliser l'URL originale
                img.src = originalSrc;
                img.style.display = 'block';
                img.style.visibility = 'visible';
                
                clearTimeout(timeout);
                resolveImg(); // Résoudre quand même pour ne pas bloquer
              };
              
              // Définir un timeout de 3 secondes pour éviter de bloquer indéfiniment
              timeout = setTimeout(() => {
                console.warn(`🔍 [DEBUG] Timeout pour le préchargement de l'image ${img.id}`);
                resolveImg();
              }, 3000);
              
              // Lancer le préchargement
              preloadImg.src = newSrc;
            } else {
              resolveImg();
            }
          });
        };
        
        // Fonction pour traiter un sélecteur d'images
        const processImages = (selector: string, idPrefix: string) => {
          const images = tempContainer.querySelectorAll(`img${selector}`) as NodeListOf<HTMLImageElement>;
          
          images.forEach((img, index) => {
            imagePromises.push(preloadImage(img, idPrefix, index));
          });
        };
        
        // Traiter toutes les signatures possibles avec différents sélecteurs
        processImages('[id$="-signature-img"]', 'signature');
        processImages('[id*="signature"]', 'signature-generic');
        processImages('[alt*="Signature"]', 'signature-alt');
        processImages('[class*="signature"]', 'signature-class');
        processImages('[src*="signature"]', 'signature-src');
        
        // Traiter également toutes les images standard
        processImages('', 'image');
        
        // Attendre que toutes les images soient préchargées ou que le timeout soit atteint
        Promise.all(imagePromises)
          .then(() => {
            console.log('🔍 [DEBUG] Toutes les images ont été préchargées ou ont atteint leur timeout');
            
            // Ajouter un délai supplémentaire pour s'assurer que le DOM est bien mis à jour
            setTimeout(() => {
              console.log('🔍 [DEBUG] Délai supplémentaire écoulé, le DOM devrait être prêt');
              resolve();
            }, 500);
          })
          .catch(err => {
            console.error('🔍 [DEBUG] Erreur lors du préchargement des images:', err);
            resolve(); // Résoudre quand même pour ne pas bloquer la génération du PDF
          });
      });
    };
    
    // Précharger toutes les images avant de générer le canvas
    await preloadAllImages();
    
    // Configurer toutes les images pour qu'elles utilisent crossOrigin
    const allImages = tempContainer.querySelectorAll('img') as NodeListOf<HTMLImageElement>;
    allImages.forEach((img) => {
      if (img && img.src) {
        img.crossOrigin = "anonymous";
        
        // Pour les signatures, ajouter un cache-buster
        if (img.id?.includes('signature') || img.src.includes('signature') || img.alt?.toLowerCase().includes('signature')) {
          if (img.src.includes('supabase.co/storage')) {
            // Générer un anti-cache robuste
            const timestamp = Date.now();
            const random = Math.random().toString(36).substring(2, 15);
            const cacheBusterUrl = img.src.includes('?') 
              ? `${img.src}&_preload_cb=${timestamp}&r=${random}&nocache=true` 
              : `${img.src}?_preload_cb=${timestamp}&r=${random}&nocache=true`;
            img.src = cacheBusterUrl;
            
            // Forcer le mode noCache et CORS
            img.setAttribute('loading', 'eager');
            img.setAttribute('decoding', 'async');
            
            console.log('🔍 [DEBUG] URL de signature avec anti-cache complet:', img.src);
          }
        }
      }
    });
    
    // Générer le canvas pour tout le contenu après le préchargement
    const canvas = await html2canvas(tempContainer, {
      scale: 2,
      useCORS: true,
      logging: false,
      allowTaint: true,
      backgroundColor: '#ffffff',
      onclone: (document, clone) => {
        // Ajouter des styles additionnels pour éviter les coupures de mots
        const style = document.createElement('style');
        style.innerHTML = `
          .pdf-content-container p {
            page-break-inside: avoid !important;
            orphans: 3;
            widows: 3;
          }
          .pdf-content-container table {
            page-break-inside: avoid !important;
          }
          .pdf-content-container .avoid-break {
            page-break-inside: avoid !important;
          }
        `;
        document.head.appendChild(style);
        
        // S'assurer une dernière fois que toutes les images sont visibles
        const allImages = clone.querySelectorAll('img') as NodeListOf<HTMLImageElement>;
        allImages.forEach((img) => {
          if (img && img.src) {
            img.style.display = 'block';
            img.style.visibility = 'visible';
            img.style.maxWidth = '100%';
            img.style.maxHeight = '100%';
            img.style.objectFit = 'contain';
            
            // Pour les signatures, ajouter un handler d'erreur qui permet d'avoir un fallback
            if (img.id?.includes('signature') || img.src.includes('signature') || img.alt?.toLowerCase().includes('signature')) {
              console.log(`🔍 [DEBUG] Image de signature détectée dans onclone:`, img.id, img.src);
              
              // Configurer les attributs pour les images de signature
              img.crossOrigin = "anonymous";
              img.setAttribute('loading', 'eager');
              img.setAttribute('decoding', 'async');
              
              // Ajouter un cache-buster spécifique pour cette requête
              if (img.src.includes('supabase.co/storage')) {
                // Générer un anti-cache robuste pour le PDF final
                const timestamp = Date.now();
                const random = Math.random().toString(36).substring(2, 15);
                const cacheBusterUrl = img.src.includes('?') 
                  ? `${img.src}&_pdf_cb=${timestamp}&r=${random}&nocache=true` 
                  : `${img.src}?_pdf_cb=${timestamp}&r=${random}&nocache=true`;
                img.src = cacheBusterUrl;
                console.log(`🔍 [DEBUG] URL de signature mise à jour avec anti-cache complet:`, img.src);
              }
            }
            
            console.log(`🔍 [DEBUG] Image vérifiée dans onclone:`, img.id, img.src);
          }
        });
      }
    });

    // Calculer la hauteur de chaque page en pixels
    const pxRatio = canvas.width / contentWidth;
    const pageHeightPx = contentHeight * pxRatio;
    
    // Collecter les informations sur les sections à préserver
    const preserveSections: {id: string, top: number, bottom: number}[] = [];
    sectionsToPreserve.forEach((section) => {
      const rect = section.getBoundingClientRect();
      const containerRect = tempContainer.getBoundingClientRect();
      const relativeTop = rect.top - containerRect.top;
      preserveSections.push({
        id: section.getAttribute('data-section-id') || '',
        top: relativeTop * (canvas.height / tempContainer.offsetHeight),
        bottom: (relativeTop + rect.height) * (canvas.height / tempContainer.offsetHeight)
      });
    });
    
    // Calculer les positions de saut de page optimales
    const pageBreakPositions: number[] = [0]; // Commencer par le début du document
    let currentPageBottom = pageHeightPx;
    
    // Parcourir le document et déterminer les meilleurs points de coupure
    while (currentPageBottom < canvas.height) {
      // Position idéale de coupure (bas de la page actuelle)
      let idealCutPosition = currentPageBottom;
      
      // Trouver la meilleure position de coupure en évitant de couper les sections
      let bestCutPosition = idealCutPosition;
      let minDistance = Number.MAX_SAFE_INTEGER;
      
      // Vérifier si la position idéale coupe une section
      const sectionsAtCut = preserveSections.filter(section => 
        section.top < idealCutPosition && section.bottom > idealCutPosition
      );
      
      if (sectionsAtCut.length > 0) {
        // Chercher une meilleure position de coupure
        preserveSections.forEach(section => {
          // Essayer de couper avant la section
          if (section.top > idealCutPosition - pageHeightPx + safetyMarginPx && 
              section.top < idealCutPosition) {
            const distance = Math.abs(section.top - idealCutPosition);
            if (distance < minDistance) {
              minDistance = distance;
              bestCutPosition = section.top;
            }
          }
          
          // Essayer de couper après la section
          if (section.bottom > idealCutPosition && 
              section.bottom < idealCutPosition + safetyMarginPx) {
            const distance = Math.abs(section.bottom - idealCutPosition);
            if (distance < minDistance) {
              minDistance = distance;
              bestCutPosition = section.bottom;
            }
          }
        });
      }
      
      // Si aucune meilleure position n'est trouvée, utiliser la position idéale
      if (minDistance === Number.MAX_SAFE_INTEGER) {
        bestCutPosition = idealCutPosition;
      }
      
      // Ajouter la position de coupure et passer à la page suivante
      pageBreakPositions.push(bestCutPosition);
      currentPageBottom = bestCutPosition + pageHeightPx;
    }
    
    // Ajouter la position Y de la fin du contenu
    pageBreakPositions.push(canvas.height);
    
    console.log(`🔍 [DEBUG] Génération de PDF: ${pageBreakPositions.length - 1} pages nécessaires`);
    
    // Générer chaque page
    for (let i = 0; i < pageBreakPositions.length - 1; i++) {
      // Si ce n'est pas la première page, ajouter une nouvelle page
      if (i > 0) {
        pdf.addPage();
      }
      
      // Calculer les coordonnées de la section à extraire du canvas
      const startY = pageBreakPositions[i];
      const endY = pageBreakPositions[i + 1];
      const height = endY - startY;
      
      // Vérifier si la hauteur est valide
      if (height <= 0) continue;
      
      // Créer un canvas temporaire pour la section
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvas.width;
      tempCanvas.height = height;
      const ctx = tempCanvas.getContext('2d');
      
      if (ctx) {
        // Dessiner la section sur le canvas temporaire
        ctx.drawImage(
          canvas,
          0, startY, canvas.width, height,
          0, 0, canvas.width, height
        );

        // Convertir le canvas temporaire en image
        const imgData = tempCanvas.toDataURL('image/jpeg', 0.95);
        
        // Ajouter l'image au PDF
        pdf.addImage(imgData, 'JPEG', margin, margin, contentWidth, height * contentWidth / canvas.width);
      }
    }
    
    // Nettoyer
    document.body.removeChild(tempContainer);
    
    return pdf.output('blob');
  } catch (error) {
    console.error('🔍 [DEBUG] Erreur lors de la génération du PDF:', error);
    throw error;
  }
}; 