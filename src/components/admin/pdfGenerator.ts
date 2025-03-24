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
      }
      
      .pdf-temp-container h3 {
        font-size: 14pt;
        margin-top: 8pt;
        margin-bottom: 6pt;
      }
      
      .pdf-temp-container p {
        margin: 6pt 0;
      }
      
      .pdf-temp-container strong {
        font-weight: bold;
      }
      
      .pdf-temp-container ul, .pdf-temp-container ol {
        margin-top: 6pt;
        margin-bottom: 6pt;
      }
      
      .pdf-temp-container li {
        margin-bottom: 4pt;
      }
      
      .pdf-temp-container table {
        width: 100%;
        border-collapse: collapse;
        margin: 10pt 0;
      }
      
      .pdf-temp-container th, .pdf-temp-container td {
        border: 1px solid #000;
        padding: 5pt;
        text-align: left;
      }
      
      .pdf-temp-container th {
        background-color: #f2f2f2;
        font-weight: bold;
      }
      
      .pdf-temp-container .signature-box {
        border: 1px solid #000;
        padding: 10pt;
        margin-top: 10pt;
        min-height: 80pt;
      }
      
      .pdf-temp-container .signature-section {
        margin-top: 20pt;
        page-break-inside: avoid;
      }
      
      .pdf-temp-container .page-break {
        page-break-before: always;
      }
      
      @media print {
        .pdf-temp-container {
          font-size: 12pt;
        }
      }
    `;
    document.head.appendChild(printStyles);
    
    // Fonction pour appliquer la typographie française
    const applyFrenchTypography = (element: HTMLElement) => {
      // Remplacer les espaces simples par des espaces insécables avant certains signes de ponctuation
      const textNodes = document.createNodeIterator(element, NodeFilter.SHOW_TEXT);
      let node;
      while ((node = textNodes.nextNode())) {
        if (node.textContent) {
          // Espaces insécables avant :, !, ?, ; et après «
          node.textContent = node.textContent
            .replace(/\s+:/g, '\u00A0:')
            .replace(/\s+!/g, '\u00A0!')
            .replace(/\s+\?/g, '\u00A0?')
            .replace(/\s+;/g, '\u00A0;')
            .replace(/«\s+/g, '«\u00A0')
            .replace(/\s+»/g, '\u00A0»');
        }
      }
    };
    
    // Fonction pour corriger l'alignement des puces dans les listes
    const fixBulletPoints = (element: HTMLElement) => {
      const listItems = element.querySelectorAll('li');
      listItems.forEach(item => {
        if (item.style.textIndent === '') {
          item.style.textIndent = '-20px';
          item.style.marginLeft = '20px';
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
          const clonedContainer = clonedDoc.querySelector('.pdf-temp-container');
          if (clonedContainer) {
            clonedContainer.querySelectorAll('*').forEach((el) => {
              if (el instanceof HTMLElement) {
                el.style.whiteSpace = 'pre-wrap';
                el.style.wordBreak = 'break-word';
              }
            });
          }
        }
      });
      
      // Calculer la hauteur disponible pour le contenu sur une page
      const contentHeightInPx = contentHeight * canvas.width / contentWidth;
      
      // Initialiser un tableau pour stocker les positions de saut de page
      const canvasPageBreakPositions = [0];
      
      // Déterminer les sauts de page nécessaires en fonction du contenu
      let currentPageHeight = 0;
      const dynamicSections = tempContainer.querySelectorAll('.dynamic-section');
      
      dynamicSections.forEach((section, index) => {
        const sectionHeight = section.clientHeight;
        const sectionHeightInPx = sectionHeight * canvas.width / tempContainer.clientWidth;
        
        // Si la section ne rentre pas sur la page actuelle, créer un saut de page
        if (currentPageHeight + sectionHeightInPx > contentHeightInPx && currentPageHeight > 0) {
          // Ajouter une position de saut de page
          canvasPageBreakPositions.push(currentPageHeight * canvas.height / tempContainer.clientHeight);
          currentPageHeight = sectionHeightInPx;
        } else {
          currentPageHeight += sectionHeightInPx;
        }
        
        // Pour la dernière section, s'assurer d'ajouter la position finale
        if (index === dynamicSections.length - 1) {
          // Ajouter la position finale (hauteur totale du canvas)
          canvasPageBreakPositions.push(canvas.height);
        }
      });
      
      // Si aucune section n'a été trouvée, utiliser une approche simple par hauteur
      if (dynamicSections.length === 0) {
        const numPages = Math.ceil(canvas.height / contentHeightInPx);
        for (let i = 1; i <= numPages; i++) {
          canvasPageBreakPositions.push(Math.min(i * contentHeightInPx, canvas.height));
        }
      }
      
      // Générer chaque page du PDF
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

/**
 * Génère un PDF à partir d'un élément HTML et l'affiche dans un nouvel onglet au lieu de le télécharger
 * @param contentRef Référence à l'élément HTML contenant le contenu à convertir en PDF
 * @param fileName Nom du fichier PDF (utilisé uniquement pour l'affichage)
 */
export const generateAndDisplayPDF = async (contentRef: HTMLDivElement, fileName: string): Promise<void> => {
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
      }
      
      .pdf-temp-container h3 {
        font-size: 14pt;
        margin-top: 8pt;
        margin-bottom: 6pt;
      }
      
      .pdf-temp-container p {
        margin: 6pt 0;
      }
      
      .pdf-temp-container strong {
        font-weight: bold;
      }
      
      .pdf-temp-container ul, .pdf-temp-container ol {
        margin-top: 6pt;
        margin-bottom: 6pt;
      }
      
      .pdf-temp-container li {
        margin-bottom: 4pt;
      }
      
      .pdf-temp-container table {
        width: 100%;
        border-collapse: collapse;
        margin: 10pt 0;
      }
      
      .pdf-temp-container th, .pdf-temp-container td {
        border: 1px solid #000;
        padding: 5pt;
        text-align: left;
      }
      
      .pdf-temp-container th {
        background-color: #f2f2f2;
        font-weight: bold;
      }
      
      .pdf-temp-container .signature-box {
        border: 1px solid #000;
        padding: 10pt;
        margin-top: 10pt;
        min-height: 80pt;
      }
      
      .pdf-temp-container .signature-section {
        margin-top: 20pt;
        page-break-inside: avoid;
      }
      
      .pdf-temp-container .page-break {
        page-break-before: always;
      }
      
      @media print {
        .pdf-temp-container {
          font-size: 12pt;
        }
      }
    `;
    document.head.appendChild(printStyles);
    
    // Fonction pour appliquer la typographie française
    const applyFrenchTypography = (element: HTMLElement) => {
      // Remplacer les espaces simples par des espaces insécables avant certains signes de ponctuation
      const textNodes = document.createNodeIterator(element, NodeFilter.SHOW_TEXT);
      let node;
      while ((node = textNodes.nextNode())) {
        if (node.textContent) {
          // Espaces insécables avant :, !, ?, ; et après «
          node.textContent = node.textContent
            .replace(/\s+:/g, '\u00A0:')
            .replace(/\s+!/g, '\u00A0!')
            .replace(/\s+\?/g, '\u00A0?')
            .replace(/\s+;/g, '\u00A0;')
            .replace(/«\s+/g, '«\u00A0')
            .replace(/\s+»/g, '\u00A0»');
        }
      }
    };
    
    // Fonction pour corriger l'alignement des puces dans les listes
    const fixBulletPoints = (element: HTMLElement) => {
      const listItems = element.querySelectorAll('li');
      listItems.forEach(item => {
        if (item.style.textIndent === '') {
          item.style.textIndent = '-20px';
          item.style.marginLeft = '20px';
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
          const clonedContainer = clonedDoc.querySelector('.pdf-temp-container');
          if (clonedContainer) {
            clonedContainer.querySelectorAll('*').forEach((el) => {
              if (el instanceof HTMLElement) {
                el.style.whiteSpace = 'pre-wrap';
                el.style.wordBreak = 'break-word';
              }
            });
          }
        }
      });
      
      // Calculer la hauteur disponible pour le contenu sur une page
      const contentHeightInPx = contentHeight * canvas.width / contentWidth;
      
      // Initialiser un tableau pour stocker les positions de saut de page
      const canvasPageBreakPositions = [0];
      
      // Déterminer les sauts de page nécessaires en fonction du contenu
      let currentPageHeight = 0;
      const dynamicSections = tempContainer.querySelectorAll('.dynamic-section');
      
      dynamicSections.forEach((section, index) => {
        const sectionHeight = section.clientHeight;
        const sectionHeightInPx = sectionHeight * canvas.width / tempContainer.clientWidth;
        
        // Si la section ne rentre pas sur la page actuelle, créer un saut de page
        if (currentPageHeight + sectionHeightInPx > contentHeightInPx && currentPageHeight > 0) {
          // Ajouter une position de saut de page
          canvasPageBreakPositions.push(currentPageHeight * canvas.height / tempContainer.clientHeight);
          currentPageHeight = sectionHeightInPx;
        } else {
          currentPageHeight += sectionHeightInPx;
        }
        
        // Pour la dernière section, s'assurer d'ajouter la position finale
        if (index === dynamicSections.length - 1) {
          // Ajouter la position finale (hauteur totale du canvas)
          canvasPageBreakPositions.push(canvas.height);
        }
      });
      
      // Si aucune section n'a été trouvée, utiliser une approche simple par hauteur
      if (dynamicSections.length === 0) {
        const numPages = Math.ceil(canvas.height / contentHeightInPx);
        for (let i = 1; i <= numPages; i++) {
          canvasPageBreakPositions.push(Math.min(i * contentHeightInPx, canvas.height));
        }
      }
      
      // Générer chaque page du PDF
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
      
      // AU LIEU DE TÉLÉCHARGER: Afficher le PDF dans un nouvel onglet
      const pdfOutput = pdf.output('blob');
      const pdfUrl = URL.createObjectURL(pdfOutput);
      
      console.log('🔍 [DEBUG] Tentative d\'ouverture du PDF dans un nouvel onglet');
      
      try {
        // Ouvrir dans un nouvel onglet avec indication explicite que c'est un PDF
        const newTab = window.open('', '_blank');
        if (newTab) {
          try {
            newTab.document.write(`
              <!DOCTYPE html>
              <html>
                <head>
                  <title>${fileName}</title>
                  <style>
                    body, html {
                      margin: 0;
                      padding: 0;
                      height: 100%;
                      overflow: hidden;
                    }
                    iframe {
                      width: 100%;
                      height: 100%;
                      border: none;
                    }
                  </style>
                </head>
                <body>
                  <iframe src="${pdfUrl}" type="application/pdf" width="100%" height="100%"></iframe>
                </body>
              </html>
            `);
            newTab.document.close();
            console.log('✅ [DEBUG] PDF ouvert avec succès dans un nouvel onglet via iframe');
          } catch (writeError) {
            console.warn('⚠️ [DEBUG] Erreur lors de l\'écriture dans le nouvel onglet:', writeError);
            
            // Si l'écriture dans le document échoue, essayer d'ouvrir l'URL directement
            newTab.location.href = pdfUrl;
            console.log('🔍 [DEBUG] Tentative d\'ouverture directe du PDF via location.href');
          }
        } else {
          // Fallback direct: ouvrir le PDF directement
          console.warn('⚠️ [DEBUG] Impossible d\'ouvrir un nouvel onglet vide. Tentative d\'ouverture directe...');
          const directTab = window.open(pdfUrl, '_blank');
          
          if (directTab) {
            console.log('✅ [DEBUG] PDF ouvert avec succès en utilisant l\'URL directe');
          } else {
            throw new Error('Ouverture du nouvel onglet bloquée par le navigateur');
          }
        }
      } catch (error) {
        console.error('❌ [ERROR] Échec de l\'ouverture du PDF dans un nouvel onglet:', error);
        
        // Dernière tentative: forcer le téléchargement
        console.log('🔍 [DEBUG] Tentative de téléchargement direct du PDF comme solution de secours');
        
        const link = document.createElement('a');
        link.href = pdfUrl;
        link.download = fileName;
        link.target = '_blank';
        link.click();
        
        alert('L\'ouverture du PDF a échoué. Le fichier va être téléchargé à la place.');
      }
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