import React, { useEffect, useRef, useState } from 'react';
import { Upload, Pen, Check, X, Stamp, Type } from 'lucide-react';

// Styles pour les polices de signature
const fontStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Dancing+Script:wght@400;700&family=Great+Vibes&family=Pacifico&family=Satisfy&display=swap');
`;

export interface SignatureCanvasProps {
  onSave: (dataUrl: string) => void;
  onCancel: () => void;
  signatureType?: 'trainer' | 'participant' | 'organizationSeal' | 'companySeal';
  isLoading?: boolean;
  initialName?: string;
}

const SignatureCanvas: React.FC<SignatureCanvasProps> = ({
  onSave,
  onCancel,
  signatureType = 'participant',
  isLoading = false,
  initialName = ''
}) => {
  const [activeTab, setActiveTab] = useState<string>('draw');
  const [canvasInitialized, setCanvasInitialized] = useState<boolean>(false);
  const [canvasIsEmpty, setCanvasIsEmpty] = useState<boolean>(true);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [showDrawingInstructions, setShowDrawingInstructions] = useState<boolean>(true);
  
  // États pour la signature par texte
  const [fullName, setFullName] = useState(initialName);
  const [selectedSignature, setSelectedSignature] = useState<number | null>(null);
  const [textSignaturePreview, setTextSignaturePreview] = useState<string | null>(null);
  
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const canvasContext = useRef<CanvasRenderingContext2D | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  
  // Styles de signature prédéfinis
  const signatureStyles = [
    { font: 'Dancing Script, cursive', style: 'normal' },
    { font: 'Pacifico, cursive', style: 'normal' },
    { font: 'Satisfy, cursive', style: 'normal' },
    { font: 'Great Vibes, cursive', style: 'normal' }
  ];
  
  // Déterminer s'il s'agit d'un tampon ou d'une signature
  const isStamp = signatureType === 'organizationSeal' || signatureType === 'companySeal';
  
  // Éviter tout rechargement de page accidentel
  const preventSubmit = (e: React.FormEvent) => {
    console.log('🚨 [PREVENT] Tentative de soumission dans SignatureCanvas empêchée');
    e.preventDefault();
    e.stopPropagation();
    return false;
  };

  // Si c'est un tampon, utiliser l'onglet "upload" par défaut
  useEffect(() => {
    if (isStamp) {
      setActiveTab('upload');
    }
  }, [isStamp]);

  // Initialisation du canvas
  useEffect(() => {
    if (activeTab === 'draw' && canvasRef.current && !canvasInitialized) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        // Définir la taille du canvas
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
        
        // Configurer le contexte
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = '#000000';
        
        canvasContext.current = ctx;
        setCanvasInitialized(true);
        
        console.log('🔧 [DIAGNOSTIC] Canvas initialisé', canvas.width, canvas.height);
      }
    }
  }, [activeTab, canvasInitialized]);

  // Gestion du changement d'onglet
  const handleTabChange = (value: string) => {
    console.log('🔧 [DIAGNOSTIC] Changement d\'onglet:', value);
    setActiveTab(value);
    setCanvasIsEmpty(true);
    setUploadedImage(null);
    
    if (value === 'draw') {
      // Réinitialiser le canvas si on change vers l'onglet dessin
      setCanvasInitialized(false);
      setShowDrawingInstructions(true);
    } else if (value === 'text') {
      // Réinitialiser la sélection du style de texte
      setSelectedSignature(null);
      setTextSignaturePreview(null);
    }
  };

  // Fonctions de dessin
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!canvasContext.current) return;
    
    setIsDrawing(true);
    setShowDrawingInstructions(false);
    setCanvasIsEmpty(false);
    
    canvasContext.current.beginPath();
    
    // Obtenir les coordonnées
    let x, y;
    if ('touches' in e) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    }
    
    canvasContext.current.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !canvasContext.current) return;
    
    // Obtenir les coordonnées
    let x, y;
    if ('touches' in e) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    }
    
    canvasContext.current.lineTo(x, y);
    canvasContext.current.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    
    setIsDrawing(false);
    if (canvasContext.current) {
      canvasContext.current.closePath();
    }
  };

  // Préparer le canvas pour la sauvegarde
  const prepareCanvasForSave = (): string | null => {
    if (!canvasRef.current) return null;
    
    // Créer un canvas temporaire pour la sauvegarde
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    
    if (!tempCtx) return null;
    
    // Copier le contenu du canvas actuel
    tempCanvas.width = canvasRef.current.width;
    tempCanvas.height = canvasRef.current.height;
    tempCtx.drawImage(canvasRef.current, 0, 0);
    
    // Convertir en dataURL
    return tempCanvas.toDataURL('image/png');
  };

  // Gérer l'upload d'image
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Vérifier la taille du fichier (max 5 Mo)
    if (file.size > 5 * 1024 * 1024) {
      alert('Le fichier est trop volumineux. Taille maximale: 5 Mo');
      return;
    }
    
    // Vérifier le type de fichier
    if (!file.type.startsWith('image/')) {
      alert('Seules les images sont acceptées');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setUploadedImage(event.target.result as string);
        setCanvasIsEmpty(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Créer une signature à partir du texte
  const createTextSignature = (styleIndex: number) => {
    if (fullName.trim() === '') {
      alert('Veuillez entrer votre nom complet');
      return;
    }
    
    setSelectedSignature(styleIndex);
    
    // Créer un canvas temporaire pour générer l'image
    const tempCanvas = document.createElement('canvas');
    const width = 400;
    const height = 150;
    tempCanvas.width = width;
    tempCanvas.height = height;
    
    const ctx = tempCanvas.getContext('2d');
    if (!ctx) return;
    
    // Fond blanc
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);
    
    // Ajuster la taille de police en fonction de la longueur du nom
    let fontSize = 48;
    if (fullName.length > 15) fontSize = 40;
    if (fullName.length > 20) fontSize = 32;
    
    const style = signatureStyles[styleIndex];
    ctx.font = `${style.style} ${fontSize}px ${style.font}`;
    ctx.fillStyle = '#000000';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(fullName, width / 2, height / 2);
    
    // Convertir en dataURL
    const dataUrl = tempCanvas.toDataURL('image/png');
    setTextSignaturePreview(dataUrl);
    setCanvasIsEmpty(false);
  };

  // Fonction pour appliquer la signature ou le tampon
  const handleApplyClick = (e: React.MouseEvent) => {
    // Prévenir tout comportement par défaut qui pourrait causer un rechargement
    e.preventDefault();
    e.stopPropagation();
    
    console.log('🚨 [URGENT] Clic sur Appliquer', {
      activeTab,
      signatureType,
      isStamp
    });
    
    // Vérifier si on peut appliquer la signature
    const canApply = !(
      (activeTab === 'draw' && canvasIsEmpty) || 
      (activeTab === 'text' && !textSignaturePreview) || 
      (activeTab === 'upload' && !uploadedImage)
    );
    
    if (!canApply) {
      console.log('🚨 [URGENT] Impossible d\'appliquer la signature - données invalides');
      return;
    }
    
    try {
      // Préparer les données selon l'onglet actif
      let dataURL: string | null = null;
      
      switch (activeTab) {
        case 'draw':
          dataURL = prepareCanvasForSave();
          console.log('🎯 [TRAÇAGE_APPLIQUER] Données canvas préparées, longueur:', dataURL?.length || 0);
          console.log('🎯 [TRAÇAGE_APPLIQUER] Début dataURL:', dataURL?.substring(0, 30));
          break;
        case 'text':
          dataURL = textSignaturePreview;
          console.log('🎯 [TRAÇAGE_APPLIQUER] Données texte préparées, longueur:', dataURL?.length || 0);
          console.log('🎯 [TRAÇAGE_APPLIQUER] Début dataURL:', dataURL?.substring(0, 30));
          break;
        case 'upload':
          dataURL = uploadedImage;
          console.log('🎯 [TRAÇAGE_APPLIQUER] Données upload préparées, longueur:', dataURL?.length || 0);
          console.log('🎯 [TRAÇAGE_APPLIQUER] Début dataURL:', dataURL?.substring(0, 30));
          break;
      }
      
      // Vérifier que les données sont valides
      if (!dataURL) {
        console.error('🚨 [URGENT] Données de signature invalides');
        return;
      }
      
      console.log('🚨 [URGENT] Données de signature prêtes, appel de onSave');
      console.log('🎯 [TRAÇAGE_APPLIQUER] Type de onSave:', typeof onSave);
      console.log('🎯 [TRAÇAGE_APPLIQUER] onSave est undefined?', onSave === undefined);
      console.log('🎯 [TRAÇAGE_APPLIQUER] onSave est null?', onSave === null);
      
      // Appliquer la signature via le callback
      try {
        console.log('🎯 [TRAÇAGE_APPLIQUER] AVANT appel de onSave');
        onSave(dataURL);
        console.log('🎯 [TRAÇAGE_APPLIQUER] APRÈS appel de onSave');
      } catch (callbackError) {
        console.error('🎯 [TRAÇAGE_APPLIQUER] Exception dans l\'appel de onSave:', callbackError);
        throw callbackError;
      }
    } catch (error) {
      console.error('🚨 [URGENT] Erreur lors de l\'application de la signature:', error);
    }
  };

  // Vider le canvas
  const clearCanvas = () => {
    if (canvasRef.current && canvasContext.current) {
      canvasContext.current.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      setCanvasIsEmpty(true);
      setShowDrawingInstructions(true);
    }
  };

  // Cliquer pour choisir un fichier
  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div 
      role="form" 
      className="flex flex-col h-full w-full"
      onSubmit={(e) => {
        console.log('🖋️ [SIGNATURE] Tentative de soumission interceptée sur le div');
        e.preventDefault();
        e.stopPropagation();
        return false;
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: fontStyles }} />
      <h3 className="text-lg font-semibold mb-2">
        {isStamp 
          ? "Ajouter un tampon" 
          : "Ajouter une signature"}
      </h3>
      
      <div className="w-full">
        <div className="mb-4 border-b border-gray-200">
          <div className="flex -mb-px">
            <button
              type="button"
              className={`py-2 px-4 text-center border-b-2 text-sm font-medium ${
                activeTab === 'draw' 
                  ? 'border-blue-500 text-blue-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              onClick={() => handleTabChange('draw')}
              disabled={isLoading}
            >
              <div className="flex items-center">
                <Pen className="w-4 h-4 mr-2" />
                Dessiner
              </div>
            </button>
            
            <button
              type="button"
              className={`py-2 px-4 text-center border-b-2 text-sm font-medium ${
                activeTab === 'text' 
                  ? 'border-blue-500 text-blue-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              onClick={() => handleTabChange('text')}
              disabled={isLoading}
            >
              <div className="flex items-center">
                <Type className="w-4 h-4 mr-2" />
                Texte
              </div>
            </button>
            
            <button
              type="button"
              className={`py-2 px-4 text-center border-b-2 text-sm font-medium ${
                activeTab === 'upload' 
                  ? 'border-blue-500 text-blue-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              onClick={() => handleTabChange('upload')}
              disabled={isLoading}
            >
              <div className="flex items-center">
                <Upload className="w-4 h-4 mr-2" />
                Importer
              </div>
            </button>
          </div>
        </div>
        
        {!isStamp && activeTab === 'draw' && (
          <div className="relative">
            <div className="flex flex-col items-center gap-2">
              <div 
                className="relative border border-gray-300 rounded-md w-full" 
                style={{ height: '200px', position: 'relative' }}
              >
                {showDrawingInstructions && (
                  <div className="absolute inset-0 flex items-center justify-center text-gray-500 pointer-events-none">
                    Dessinez votre signature ici
                  </div>
                )}
                {isDrawing && (
                  <div className="absolute top-2 right-2 bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                    Mode dessin
                  </div>
                )}
                <canvas
                  ref={canvasRef}
                  className="w-full h-full"
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                />
              </div>
              
              <div className="flex w-full gap-2 mt-2">
                <button 
                  type="button" 
                  onClick={clearCanvas}
                  className="flex-1 flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  <X className="mr-2 h-4 w-4" />
                  Effacer
                </button>
              </div>
            </div>
          </div>
        )}

        {!isStamp && activeTab === 'text' && (
          <div className="flex flex-col gap-4">
            <div className="mb-4">
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
                Nom complet
              </label>
              <input
                type="text"
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Entrez votre nom complet"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              {signatureStyles.map((style, index) => (
                <button
                  key={index}
                  className={`w-full text-left p-4 border border-gray-300 rounded-md flex items-center ${
                    selectedSignature === index ? 'bg-blue-50 border-blue-300' : 'hover:bg-gray-100'
                  }`}
                  onClick={() => createTextSignature(index)}
                >
                  <span className="w-6 h-6 rounded-full border border-gray-300 flex items-center justify-center mr-3 bg-white">
                    {selectedSignature === index && <span className="w-4 h-4 bg-blue-500 rounded-full"></span>}
                  </span>
                  <span 
                    style={{ 
                      fontFamily: style.font, 
                      fontStyle: style.style, 
                      fontSize: '28px', 
                      color: '#000',
                      textShadow: selectedSignature === index ? '0 0 1px rgba(0,0,0,0.2)' : 'none'
                    }}
                  >
                    {fullName || 'Votre nom'}
                  </span>
                </button>
              ))}
            </div>
            
            {textSignaturePreview && (
              <div className="mt-4 border border-gray-300 rounded-md p-4 flex justify-center items-center bg-gray-50">
                <img src={textSignaturePreview} alt="Signature" className="max-h-32" />
              </div>
            )}
          </div>
        )}
        
        {activeTab === 'upload' && (
          <div className="flex flex-col items-center gap-4">
            <div 
              onClick={triggerFileInput}
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 cursor-pointer hover:border-gray-400 w-full flex flex-col items-center transition-colors"
            >
              {uploadedImage ? (
                <div className="w-full flex justify-center">
                  <img 
                    src={uploadedImage} 
                    alt="Aperçu" 
                    className="max-h-40 object-contain" 
                  />
                </div>
              ) : (
                <>
                  {isStamp ? (
                    <>
                      <Stamp className="h-10 w-10 text-gray-400 mb-2" />
                      <p className="text-gray-500 text-center">
                        Cliquez pour importer une image de tampon <br/>
                        <span className="text-xs">Formats acceptés: JPG, PNG</span>
                      </p>
                    </>
                  ) : (
                    <>
                      <Upload className="h-10 w-10 text-gray-400 mb-2" />
                      <p className="text-gray-500 text-center">
                        Cliquez pour importer une image de signature <br/>
                        <span className="text-xs">Formats acceptés: JPG, PNG</span>
                      </p>
                    </>
                  )}
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileUpload}
              />
            </div>
          </div>
        )}
      </div>
      
      <div className="flex justify-end gap-2 mt-4">
        <button 
          type="button" 
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50"
        >
          Annuler
        </button>
        <button 
          type="button" 
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleApplyClick(e);
          }}
          disabled={isLoading || (activeTab === 'draw' && canvasIsEmpty) || (activeTab === 'text' && !textSignaturePreview) || (activeTab === 'upload' && !uploadedImage)}
          className={`px-4 py-2 border rounded-md ${isLoading || (activeTab === 'draw' && canvasIsEmpty) || (activeTab === 'text' && !textSignaturePreview) || (activeTab === 'upload' && !uploadedImage) ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
        >
          {isLoading ? 'Enregistrement...' : 'Appliquer'}
        </button>
      </div>
    </div>
  );
};

// Exporter le composant à la fois comme export par défaut et comme export nommé
export { SignatureCanvas };
export default SignatureCanvas; 