import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * Génère un PDF à partir d'un élément HTML avec un formatage de type Word
 * @param contentRef Référence à l'élément HTML contenant le contenu à convertir en PDF
 * @param fileName Nom du fichier PDF à générer
 */
export const generateWordLikePDF = async (contentRef: HTMLDivElement, fileName: string): Promise<void> => {
  if (!contentRef) return;
  
  try {
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
    
    // Créer une copie du contenu pour ne pas modifier l'original
    const contentClone = contentRef.cloneNode(true) as HTMLDivElement;
    
    // Appliquer des styles spécifiques pour l'impression
    const printStyles = document.createElement('style');
    printStyles.innerHTML = `
      .pdf-temp-container {
        width: ${contentWidth}mm;
        margin: 0;
        padding: 0;
        background-color: white;
        font-family: 'Times New Roman', Times, serif;
        font-size: 12pt;
        line-height: 1.4;
        word-wrap: break-word;
        overflow-wrap: break-word;
        hyphens: auto;
      }
      
      .pdf-temp-container h2 {
        font-size: 16pt;
        margin-top: 10pt;
        margin-bottom: 8pt;
        text-align: center;
      }
      
      .pdf-temp-container h3 {
        font-size: 14pt;
        margin-top: 10pt;
        margin-bottom: 8pt;
        background-color: #f3f4f6;
        padding: 4pt;
        page-break-after: avoid;
      }
      
      .pdf-temp-container h4 {
        font-size: 13pt;
        margin-top: 8pt;
        margin-bottom: 6pt;
        page-break-after: avoid;
      }
      
      .pdf-temp-container p {
        margin-top: 0;
        margin-bottom: 5pt;
        font-size: 12pt;
        text-align: justify;
        page-break-inside: avoid;
      }
      
      .pdf-temp-container ul, .pdf-temp-container ol {
        margin-top: 3pt;
        margin-bottom: 5pt;
        padding-left: 20pt;
      }
      
      .pdf-temp-container li {
        margin-bottom: 3pt;
        font-size: 12pt;
        text-align: justify;
        position: relative;
      }
      
      /* Correction pour l'alignement des puces */
      .pdf-temp-container ul li {
        list-style-position: outside;
        margin-left: 5pt;
        padding-left: 5pt;
      }
      
      .pdf-temp-container ol li {
        list-style-position: outside;
        margin-left: 5pt;
        padding-left: 5pt;
      }
      
      .pdf-temp-container table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 6pt;
        margin-bottom: 8pt;
        page-break-inside: avoid;
      }
      
      .pdf-temp-container td, .pdf-temp-container th {
        border: 1pt solid black;
        padding: 5pt 6pt;
        font-size: 12pt;
        text-align: center;
        vertical-align: middle;
      }
      
      .pdf-temp-container .mb-4 {
        margin-bottom: 8pt !important;
      }
      
      .pdf-temp-container .mb-3 {
        margin-bottom: 6pt !important;
      }
      
      .pdf-temp-container .mb-2 {
        margin-bottom: 4pt !important;
      }
      
      .pdf-temp-container .mb-1 {
        margin-bottom: 2pt !important;
      }
      
      .pdf-temp-container .mb-0 {
        margin-bottom: 0 !important;
      }
      
      .page-break-before {
        display: block;
        height: 1px;
        margin-top: 20px;
        page-break-before: always !important;
      }
      
      .avoid-break {
        page-break-inside: avoid !important;
      }
      
      /* Styles spécifiques pour les tableaux */
      .pdf-temp-container .w-full {
        width: 100% !important;
        max-width: ${contentWidth}mm !important;
        margin-left: auto !important;
        margin-right: auto !important;
      }
      
      .pdf-temp-container .text-center {
        text-align: center !important;
      }
      
      .pdf-temp-container .font-semibold {
        font-weight: bold !important;
      }
      
      /* Éviter les coupures de mots inappropriées */
      .pdf-temp-container span {
        white-space: nowrap;
      }
      
      /* Ajustements pour les signatures */
      .pdf-temp-container .grid {
        display: flex;
        flex-wrap: wrap;
        justify-content: space-between;
        margin-top: 15pt;
      }
      
      .pdf-temp-container .grid > div {
        width: 45%;
        margin-bottom: 15pt;
      }
      
      /* Styles pour les bordures */
      .pdf-temp-container .border {
        border: 1pt solid #000 !important;
      }
      
      .pdf-temp-container .border-gray-300 {
        border-color: #000 !important;
      }
      
      /* Espacement supplémentaire pour aérer le contenu */
      .pdf-temp-container .section-content {
        margin-top: 5pt;
        margin-bottom: 10pt;
      }
      
      /* Styles pour les annexes */
      .pdf-temp-container .annexe-title {
        font-size: 14pt;
        font-weight: bold;
        text-align: center;
        margin-top: 10pt;
        margin-bottom: 10pt;
      }
      
      .pdf-temp-container .annexe-content {
        margin-top: 8pt;
        margin-bottom: 8pt;
      }
      
      /* Classe pour les sections qui doivent être calculées dynamiquement */
      .pdf-temp-container .dynamic-section {
        position: relative;
      }
      
      /* Marge supplémentaire en fin de document pour éviter les coupures */
      .pdf-temp-container::after {
        content: '';
        display: block;
        height: 20mm;
        width: 100%;
      }
    `;
    document.head.appendChild(printStyles);
    
    // Fonction pour appliquer la typographie française
    const applyFrenchTypography = (element: HTMLElement) => {
      const textNodes = [];
      const walk = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null);
      let node;
      while (node = walk.nextNode()) {
        textNodes.push(node);
      }
      
      textNodes.forEach(textNode => {
        if (textNode.textContent) {
          textNode.textContent = textNode.textContent
            .replace(/(\s)([;:!?»])/g, '\u202F$2')
            .replace(/(«)(\s)/g, '$1\u202F');
        }
      });
    };
    
    // Fonction pour corriger l'alignement des puces
    const fixBulletPoints = (element: HTMLElement) => {
      const listItems = element.querySelectorAll('li');
      listItems.forEach(item => {
        // S'assurer que les puces sont bien alignées avec le texte
        if (item.parentElement?.tagName === 'UL') {
          item.style.listStyleType = 'disc';
          item.style.marginLeft = '5pt';
          item.style.paddingLeft = '5pt';
        } else if (item.parentElement?.tagName === 'OL') {
          item.style.listStyleType = 'decimal';
          item.style.marginLeft = '5pt';
          item.style.paddingLeft = '5pt';
        }
      });
    };
    
    // Fonction pour générer le PDF avec calcul dynamique de l'espace
    const generatePDF = async () => {
      // Créer un conteneur temporaire pour le contenu
      const tempContainer = document.createElement('div');
      tempContainer.className = 'pdf-temp-container';
      tempContainer.appendChild(contentClone);
      document.body.appendChild(tempContainer);
      
      // Appliquer la typographie française
      applyFrenchTypography(tempContainer);
      
      // Corriger l'alignement des puces
      fixBulletPoints(tempContainer);
      
      // Ajouter un élément vide à la fin pour éviter les coupures
      const spacer = document.createElement('div');
      spacer.style.height = '20mm';
      spacer.style.width = '100%';
      tempContainer.appendChild(spacer);
      
      // Ajouter la classe dynamic-section à toutes les sections
      const sections = Array.from(tempContainer.querySelectorAll('.section-content, .annexe'));
      sections.forEach((section, index) => {
        section.classList.add('dynamic-section');
        section.setAttribute('data-section-id', `section-${index}`);
      });
      
      // Générer le canvas pour tout le contenu
      const canvas = await html2canvas(tempContainer, {
        scale: 2,
        useCORS: true,
        logging: false,
        allowTaint: true,
        backgroundColor: '#ffffff',
        windowWidth: 1200, // Largeur fixe pour éviter les problèmes de mise en page
        onclone: (clonedDoc) => {
          // Appliquer des styles supplémentaires au clone pour éviter les coupures de mots
          const style = clonedDoc.createElement('style');
          style.innerHTML = `
            .pdf-temp-container p {
              page-break-inside: avoid !important;
              orphans: 3;
              widows: 3;
            }
            .pdf-temp-container table {
              page-break-inside: avoid !important;
            }
            .pdf-temp-container .avoid-break {
              page-break-inside: avoid !important;
            }
            .pdf-temp-container ul li, .pdf-temp-container ol li {
              list-style-position: outside !important;
              margin-left: 5pt !important;
              padding-left: 5pt !important;
            }
          `;
          clonedDoc.head.appendChild(style);
        }
      });
      
      // Calculer la hauteur de chaque page en pixels
      const pageHeightPx = canvas.width * (contentHeight / contentWidth);
      
      // Calculer la taille de chaque section
      const sectionSizes: { id: string; height: number; element: Element }[] = [];
      sections.forEach(section => {
        const rect = section.getBoundingClientRect();
        const containerRect = tempContainer.getBoundingClientRect();
        const relativeTop = rect.top - containerRect.top;
        const relativeHeight = rect.height;
        const canvasHeight = relativeHeight * (canvas.height / tempContainer.offsetHeight);
        
        sectionSizes.push({
          id: section.getAttribute('data-section-id') || '',
          height: canvasHeight,
          element: section
        });
      });
      
      console.log('Tailles des sections:', sectionSizes.map(s => `${s.id}: ${s.height}px`).join(', '));
      
      // Calculer les positions des sauts de page en fonction de la taille des sections
      const pageBreakPositions: number[] = [0]; // Commencer par le début du document
      let currentPageHeight = 0;
      
      // Parcourir chaque section et déterminer si elle peut tenir sur la page actuelle
      sectionSizes.forEach(section => {
        // Si la section est une annexe, toujours commencer une nouvelle page
        if (section.element.classList.contains('annexe')) {
          pageBreakPositions.push(section.element.getBoundingClientRect().top - tempContainer.getBoundingClientRect().top);
          currentPageHeight = section.height;
          return;
        }
        
        // Si la section ne peut pas tenir sur la page actuelle, ajouter un saut de page
        if (currentPageHeight + section.height > pageHeightPx) {
          pageBreakPositions.push(section.element.getBoundingClientRect().top - tempContainer.getBoundingClientRect().top);
          currentPageHeight = section.height;
        } else {
          currentPageHeight += section.height;
        }
      });
      
      // Ajouter la position Y de la fin du contenu
      pageBreakPositions.push(canvas.height);
      
      // Convertir les positions en pixels du canvas
      const canvasPageBreakPositions = pageBreakPositions.map(pos => 
        pos * (canvas.height / tempContainer.offsetHeight)
      );
      
      console.log(`Positions calculées des sauts de page: ${canvasPageBreakPositions.join(', ')}`);
      console.log(`Nombre de pages nécessaires: ${canvasPageBreakPositions.length - 1}`);
      
      // Générer chaque page
      for (let i = 0; i < canvasPageBreakPositions.length - 1; i++) {
        // Si ce n'est pas la première page, ajouter une nouvelle page
        if (i > 0) {
          pdf.addPage();
        }
        
        // Calculer les coordonnées de la section à extraire du canvas
        const startY = canvasPageBreakPositions[i];
        const endY = Math.min(canvasPageBreakPositions[i + 1], canvas.height);
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
          const imgWidth = contentWidth;
          const imgHeight = height * imgWidth / canvas.width;
          
          // Ajouter l'image au PDF
          pdf.addImage(imgData, 'JPEG', margin, margin, imgWidth, imgHeight);
        }
      }
      
      // Nettoyer
      document.body.removeChild(tempContainer);
      
      // Sauvegarder le PDF
      pdf.save(fileName);
    };
    
    // Exécuter la génération du PDF
    await generatePDF();
    
    // Supprimer les styles temporaires
    document.head.removeChild(printStyles);
    
    return Promise.resolve();
  } catch (error) {
    console.error('Erreur lors de la génération du PDF:', error);
    return Promise.reject(error);
  }
}; 