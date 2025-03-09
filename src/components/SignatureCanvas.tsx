import React, { useState, useRef, useEffect } from 'react';
import { Download, Upload, X } from 'lucide-react';

interface SignatureCanvasProps {
  onSave: (signatureDataUrl: string) => void;
  onCancel: () => void;
  initialName?: string;
}

export const SignatureCanvas: React.FC<SignatureCanvasProps> = ({
  onSave,
  onCancel,
  initialName = ''
}) => {
  const [fullName, setFullName] = useState(initialName);
  const [activeTab, setActiveTab] = useState<'signature' | 'stamp' | 'upload'>('signature');
  const [selectedSignature, setSelectedSignature] = useState<number | null>(null);
  const [color, setColor] = useState<'black' | 'red' | 'blue' | 'green'>('black');
  const [isDrawing, setIsDrawing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvasSignature, setCanvasSignature] = useState<string | null>(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [stampImage, setStampImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const stampInputRef = useRef<HTMLInputElement>(null);

  // Styles de signature prédéfinis
  const signatureStyles = [
    { font: 'cursive', style: 'italic' },
    { font: 'cursive', style: 'normal' },
    { font: 'sans-serif', style: 'normal' },
    { font: 'monospace', style: 'italic' }
  ];

  // Initialiser le canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Utiliser un fond légèrement grisé pour mieux voir le dessin
        ctx.fillStyle = '#f8f8f8';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.lineWidth = 3; // Ligne plus épaisse pour meilleure visibilité
        ctx.lineCap = 'round';
        ctx.strokeStyle = getColorValue(color);
      }
    }
  }, [color]);

  // Fonction pour obtenir la valeur de couleur
  const getColorValue = (colorName: 'black' | 'red' | 'blue' | 'green'): string => {
    switch (colorName) {
      case 'red': return '#e63946';
      case 'blue': return '#457b9d';
      case 'green': return '#2a9d8f';
      default: return '#000000'; // Noir plus foncé pour meilleure visibilité
    }
  };

  // Gérer le début du dessin
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        ctx.beginPath();
        ctx.moveTo(x, y);
      }
    }
  };

  // Gérer le dessin
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        ctx.lineTo(x, y);
        ctx.stroke();
      }
    }
  };

  // Gérer la fin du dessin
  const handleMouseUp = () => {
    setIsDrawing(false);
    if (canvasRef.current) {
      setCanvasSignature(canvasRef.current.toDataURL('image/png'));
    }
  };

  // Gérer la sortie du canvas
  const handleMouseLeave = () => {
    setIsDrawing(false);
  };

  // Gérer les événements tactiles
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const rect = canvas.getBoundingClientRect();
        const touch = e.touches[0];
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        ctx.beginPath();
        ctx.moveTo(x, y);
        setIsDrawing(true);
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const rect = canvas.getBoundingClientRect();
        const touch = e.touches[0];
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        ctx.lineTo(x, y);
        ctx.stroke();
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    setIsDrawing(false);
    if (canvasRef.current) {
      setCanvasSignature(canvasRef.current.toDataURL('image/png'));
    }
  };

  // Effacer le canvas
  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#f8f8f8';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        setCanvasSignature(null);
      }
    }
  };

  // Sélectionner un style de signature
  const selectSignatureStyle = (index: number) => {
    setSelectedSignature(index);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#f8f8f8';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        const style = signatureStyles[index];
        ctx.font = `${style.style} 36px ${style.font}`;
        ctx.fillStyle = getColorValue(color);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(fullName, canvas.width / 2, canvas.height / 2);
        
        setCanvasSignature(canvas.toDataURL('image/png'));
      }
    }
  };

  // Gérer l'upload de fichier
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setUploadedImage(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Gérer l'upload du tampon
  const handleStampUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setStampImage(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Appliquer la signature
  const applySignature = () => {
    if (activeTab === 'signature' && canvasSignature) {
      onSave(canvasSignature);
    } else if (activeTab === 'upload' && uploadedImage) {
      onSave(uploadedImage);
    } else if (activeTab === 'stamp' && stampImage) {
      onSave(stampImage);
    }
  };

  // Vérifier si un bouton d'application peut être activé
  const canApply = () => {
    if (activeTab === 'signature') return !!canvasSignature;
    if (activeTab === 'upload') return !!uploadedImage;
    if (activeTab === 'stamp') return !!stampImage;
    return false;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-100 flex items-center justify-center z-[9999] overflow-hidden">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col m-4">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-900">Signature du document</h2>
            <button 
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-500"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="mt-4">
            <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">
              Nom complet :
            </label>
            <input
              type="text"
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            />
          </div>
        </div>

        <div className="border-b border-gray-200">
          <div className="flex">
            <button
              className={`flex-1 py-3 px-4 flex items-center justify-center ${
                activeTab === 'signature' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-500'
              }`}
              onClick={() => setActiveTab('signature')}
            >
              <span className="mr-2">✏️</span>
              Dessiner
            </button>
            <button
              className={`flex-1 py-3 px-4 flex items-center justify-center ${
                activeTab === 'upload' ? 'border-b-2 border-purple-500 text-purple-500' : 'text-gray-500'
              }`}
              onClick={() => setActiveTab('upload')}
            >
              <span className="mr-2"><Upload className="h-4 w-4" /></span>
              Importer signature
            </button>
            <button
              className={`flex-1 py-3 px-4 flex items-center justify-center ${
                activeTab === 'stamp' ? 'border-b-2 border-green-500 text-green-500' : 'text-gray-500'
              }`}
              onClick={() => setActiveTab('stamp')}
            >
              <span className="mr-2">🔖</span>
              Tampon d'entreprise
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4">
          {activeTab === 'signature' && (
            <div>
              {fullName && (
                <div className="mb-4">
                  <p className="text-sm text-gray-700 mb-2 font-medium">Sélectionnez un style de signature :</p>
                  <div className="border border-gray-300 rounded-md overflow-hidden bg-gray-50">
                    {signatureStyles.map((style, index) => (
                      <button
                        key={index}
                        className={`w-full text-left p-4 border-b border-gray-300 flex items-center ${
                          selectedSignature === index ? 'bg-blue-50' : 'hover:bg-gray-100'
                        }`}
                        onClick={() => selectSignatureStyle(index)}
                      >
                        <span className="w-6 h-6 rounded-full border border-gray-300 flex items-center justify-center mr-3 bg-white">
                          {selectedSignature === index && <span className="w-4 h-4 bg-blue-500 rounded-full"></span>}
                        </span>
                        <span 
                          style={{ 
                            fontFamily: style.font, 
                            fontStyle: style.style, 
                            fontSize: '24px', 
                            color: '#000',
                            textShadow: selectedSignature === index ? '0 0 1px rgba(0,0,0,0.2)' : 'none'
                          }}
                          className={selectedSignature === index ? 'font-bold' : ''}
                        >
                          {fullName}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="mb-4">
                <p className="text-sm text-gray-700 mb-2">Ou dessinez votre signature :</p>
                <div className="border border-gray-300 rounded-md p-2 bg-gray-50">
                  <canvas
                    ref={canvasRef}
                    width={500}
                    height={200}
                    className="w-full border border-gray-300 rounded"
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseLeave}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                  />
                  <div className="mt-2 flex items-center justify-between">
                    <p className="text-gray-600">Dessinez votre signature ici</p>
                    <button
                      className="px-4 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 flex items-center"
                      onClick={clearCanvas}
                    >
                      <X className="h-4 w-4 mr-1.5" />
                      Effacer
                    </button>
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-sm text-gray-700 mb-2">Couleur :</p>
                <div className="flex space-x-2">
                  <button
                    className={`w-8 h-8 rounded-full bg-black ${color === 'black' ? 'ring-2 ring-offset-2 ring-gray-500' : ''}`}
                    onClick={() => setColor('black')}
                  />
                  <button
                    className={`w-8 h-8 rounded-full bg-red-500 ${color === 'red' ? 'ring-2 ring-offset-2 ring-red-300' : ''}`}
                    onClick={() => setColor('red')}
                  />
                  <button
                    className={`w-8 h-8 rounded-full bg-blue-500 ${color === 'blue' ? 'ring-2 ring-offset-2 ring-blue-300' : ''}`}
                    onClick={() => setColor('blue')}
                  />
                  <button
                    className={`w-8 h-8 rounded-full bg-green-500 ${color === 'green' ? 'ring-2 ring-offset-2 ring-green-300' : ''}`}
                    onClick={() => setColor('green')}
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'upload' && (
            <div className="flex flex-col items-center justify-center h-64">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept="image/*"
                className="hidden"
              />
              
              {uploadedImage ? (
                <div className="text-center w-full">
                  <div className="mb-4 border border-gray-300 p-4 rounded-md bg-gray-50">
                    <img 
                      src={uploadedImage} 
                      alt="Signature téléchargée" 
                      className="max-h-40 mx-auto"
                    />
                    <div className="mt-4 flex items-center justify-center space-x-3">
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="px-4 py-2 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 flex items-center"
                      >
                        <Upload className="h-4 w-4 mr-1.5" />
                        Changer
                      </button>
                      <button
                        onClick={() => setUploadedImage(null)}
                        className="px-4 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 flex items-center"
                      >
                        <X className="h-4 w-4 mr-1.5" />
                        Supprimer
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center w-full">
                  <div 
                    className="border-2 border-dashed border-gray-300 p-8 rounded-md mb-4 cursor-pointer hover:border-blue-400 bg-gray-50"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-10 w-10 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-600 font-medium">Cliquez pour télécharger votre signature</p>
                    <p className="text-gray-400 text-sm mt-1">Formats acceptés: JPG, PNG, GIF</p>
                  </div>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 flex items-center mx-auto"
                  >
                    <Upload className="h-4 w-4 mr-1.5" />
                    Parcourir les fichiers
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'stamp' && (
            <div className="flex flex-col items-center justify-center h-64">
              <input
                type="file"
                ref={stampInputRef}
                onChange={handleStampUpload}
                accept="image/*"
                className="hidden"
              />
              
              {stampImage ? (
                <div className="text-center w-full">
                  <div className="mb-4 border border-gray-300 p-4 rounded-md bg-gray-50">
                    <img 
                      src={stampImage} 
                      alt="Tampon d'entreprise" 
                      className="max-h-40 mx-auto"
                    />
                    <div className="mt-4 flex items-center justify-center space-x-3">
                      <button
                        onClick={() => stampInputRef.current?.click()}
                        className="px-4 py-2 bg-green-100 text-green-700 rounded-md hover:bg-green-200 flex items-center"
                      >
                        <Upload className="h-4 w-4 mr-1.5" />
                        Changer
                      </button>
                      <button
                        onClick={() => setStampImage(null)}
                        className="px-4 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 flex items-center"
                      >
                        <X className="h-4 w-4 mr-1.5" />
                        Supprimer
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center w-full">
                  <div 
                    className="border-2 border-dashed border-gray-300 p-8 rounded-md mb-4 cursor-pointer hover:border-green-400 bg-gray-50"
                    onClick={() => stampInputRef.current?.click()}
                  >
                    <Upload className="h-10 w-10 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-600 font-medium">Cliquez pour télécharger un tampon d'entreprise</p>
                    <p className="text-gray-400 text-sm mt-1">Formats acceptés: JPG, PNG, GIF</p>
                  </div>
                  <button
                    onClick={() => stampInputRef.current?.click()}
                    className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 flex items-center mx-auto"
                  >
                    <Upload className="h-4 w-4 mr-1.5" />
                    Parcourir les fichiers
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-200 flex justify-between">
          <button
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            onClick={onCancel}
          >
            Annuler
          </button>
          <button
            className="px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-300 disabled:text-gray-500"
            onClick={applySignature}
            disabled={!canApply()}
          >
            Appliquer
          </button>
        </div>
      </div>
    </div>
  );
}; 