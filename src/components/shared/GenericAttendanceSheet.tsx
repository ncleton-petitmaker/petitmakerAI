import React, { useState, useEffect } from 'react';
import { DocumentWithSignatures } from './DocumentWithSignatures';
import { Training, Participant, OrganizationSettings } from './DocumentUtils';
import { AttendanceSheetTemplate } from './templates/AttendanceSheetTemplate';
import { DocumentType, SignatureType } from './DocumentSignatureManager';
import { supabase } from '../../lib/supabase';
import SignatureCanvas from '../SignatureCanvas';

interface GenericAttendanceSheetProps {
  training: Training;
  participant: Participant;
  signedDates?: string[];
  onCancel: () => void;
  viewContext?: 'crm' | 'student';
  onDocumentOpen?: () => void;
  onDocumentClose?: () => void;
}

/**
 * Composant de feuille d'émargement générique utilisant le système unifié
 * de gestion des documents et signatures.
 * 
 * Ce composant peut être utilisé à la fois dans l'interface administrateur
 * et dans l'interface apprenant.
 */
export const GenericAttendanceSheet: React.FC<GenericAttendanceSheetProps> = ({
  training,
  participant,
  signedDates = [],
  onCancel,
  viewContext = 'crm',
  onDocumentOpen,
  onDocumentClose
}) => {
  const [organizationSettings, setOrganizationSettings] = useState<OrganizationSettings | null>(null);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [participantSignature, setParticipantSignature] = useState<string | null>(null);
  const [trainerSignature, setTrainerSignature] = useState<string | null>(null);
  const [signedCells, setSignedCells] = useState<Array<{ date: string; period: 'morning' | 'afternoon' }>>([]);
  const [isSigningEnabled, setIsSigningEnabled] = useState(true);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [currentSigningCell, setCurrentSigningCell] = useState<{ date: string; period: 'morning' | 'afternoon' } | null>(null);
  const [participantSignatures, setParticipantSignatures] = useState<{ [key: string]: string }>({});
  const [trainerSignatures, setTrainerSignatures] = useState<{ [key: string]: string }>({});
  const [defaultSignature, setDefaultSignature] = useState<string | null>(null);
  const [isFirstSignature, setIsFirstSignature] = useState(true);

  // Nom complet du participant pour l'affichage
  const participantName = `${participant.first_name} ${participant.last_name}`;

  // Chargement des paramètres de l'organisme de formation
  useEffect(() => {
    const loadOrganizationSettings = async () => {
      setIsLoadingSettings(true);
      try {
        const { data, error } = await supabase
          .from('settings')
          .select('*')
          .single();

        if (error) {
          console.error('Erreur lors du chargement des paramètres:', error);
          return;
        }

        if (data) {
          setOrganizationSettings({
            organization_name: data.organization_name || 'PetitMaker',
            siret: data.organization_siret || '123456789',
            address: data.organization_address || '',
            activity_declaration_number: data.organization_declaration_number || '',
            representative_name: data.organization_representative_name || '',
            representative_title: data.organization_representative_title || ''
          });
        }
      } catch (error) {
        console.error('Erreur inattendue lors du chargement des paramètres:', error);
      } finally {
        setIsLoadingSettings(false);
      }
    };

    loadOrganizationSettings();
  }, []);

  // Chargement des signatures existantes
  useEffect(() => {
    const loadExistingSignatures = async () => {
      try {
        // Rechercher les signatures globales pour le participant
        const { data: participantSigData, error: participantSigError } = await supabase
          .from('documents')
          .select('file_url')
          .eq('training_id', training.id)
          .eq('user_id', participant.id)
          .eq('type', 'attestation')
          .ilike('title', '%signature%')
          .order('created_at', { ascending: false })
          .limit(1);

        if (!participantSigError && participantSigData && participantSigData.length > 0) {
          console.log("✅ [LOAD] Signature globale du participant trouvée:", participantSigData[0].file_url?.substring(0, 30) + "...");
          setParticipantSignature(participantSigData[0].file_url);
          setDefaultSignature(participantSigData[0].file_url);
          setIsFirstSignature(false);
        } else {
          console.log("ℹ️ [LOAD] Aucune signature globale trouvée pour le participant");
        }

        // Rechercher les signatures pour le formateur et la formation
        const { data: trainerSigData, error: trainerSigError } = await supabase
          .from('documents')
          .select('file_url')
          .eq('training_id', training.id)
          .eq('type', 'attestation')
          .ilike('title', '%signature%formateur%')
          .order('created_at', { ascending: false })
          .limit(1);

        if (!trainerSigError && trainerSigData && trainerSigData.length > 0) {
          console.log("✅ [LOAD] Signature du formateur trouvée");
          setTrainerSignature(trainerSigData[0].file_url);
        } else {
          console.log("ℹ️ [LOAD] Aucune signature du formateur trouvée");
        }

        // Charger UNIQUEMENT les cellules signées par le PARTICIPANT
        const { data: signedCellsData, error: signedCellsError } = await supabase
          .from('attendance_sheet_signatures')
          .select('id, date, period, signature_url')
          .eq('training_id', training.id)
          .eq('user_id', participant.id)
          .eq('signature_type', 'participant');

        if (signedCellsError) {
          console.error("❌ [LOAD] Erreur lors du chargement des cellules signées par l'apprenant:", signedCellsError);
        } else if (signedCellsData && signedCellsData.length > 0) {
          console.log(`✅ [LOAD] ${signedCellsData.length} cellules signées par l'apprenant trouvées`);
          
          // Mettre à jour la liste des cellules signées PAR L'APPRENANT UNIQUEMENT
          const cells = signedCellsData.map(({ date, period }) => ({ date, period }));
          setSignedCells(cells);
          
          // Créer un dictionnaire des signatures participant par cellule
          const signatures: { [key: string]: string } = {};
          signedCellsData.forEach(cell => {
            const key = `${cell.date}_${cell.period}`;
            signatures[key] = cell.signature_url;
          });
          
          // Mettre à jour les signatures participant par cellule
          setParticipantSignatures(signatures);
          console.log("✅ [LOAD] Signatures par cellule de l'apprenant chargées:", Object.keys(signatures).length);
        } else {
          console.log("ℹ️ [LOAD] Aucune cellule signée par l'apprenant trouvée");
          // S'assurer que signedCells est vide pour éviter les confusions
          setSignedCells([]);
          setParticipantSignatures({});
        }

        // Charger les cellules signées par le formateur SÉPARÉMENT
        // Note: on cherche "signature_type = 'trainer'" et non "user_id = 'trainer'"
        // car le user_id pourrait ne pas être cohérent
        const { data: trainerCellsData, error: trainerCellsError } = await supabase
          .from('attendance_sheet_signatures')
          .select('id, date, period, signature_url')
          .eq('training_id', training.id)
          .eq('signature_type', 'trainer');

        if (trainerCellsError) {
          console.error("❌ [LOAD] Erreur lors du chargement des cellules signées par le formateur:", trainerCellsError);
        } else if (trainerCellsData && trainerCellsData.length > 0) {
          console.log(`✅ [LOAD] ${trainerCellsData.length} cellules signées par le formateur trouvées`);
          
          // Créer un dictionnaire des signatures par cellule pour le formateur
          const trainerSigs: { [key: string]: string } = {};
          trainerCellsData.forEach(cell => {
            const key = `${cell.date}_${cell.period}`;
            trainerSigs[key] = cell.signature_url;
          });
          
          // Mettre à jour les signatures par cellule pour le formateur UNIQUEMENT
          setTrainerSignatures(trainerSigs);
          console.log("✅ [LOAD] Signatures du formateur par cellule chargées:", Object.keys(trainerSigs).length);
        } else {
          console.log("ℹ️ [LOAD] Aucune cellule signée par le formateur trouvée");
          setTrainerSignatures({});
        }
      } catch (error) {
        console.error('❌ [LOAD] Erreur lors du chargement des signatures:', error);
      }
    };

    if (training.id && participant.id) {
      loadExistingSignatures();
    }
  }, [training.id, participant.id]);

  // Gérer le clic sur une cellule de signature
  const handleCellClick = async (date: string, period: 'morning' | 'afternoon') => {
    if (!isSigningEnabled) return;

    // Cas spécial pour la modification globale de signature
    if (date === 'global') {
      console.log("Modification globale de la signature demandée");
      setShowSignatureModal(true);
      setCurrentSigningCell(null); // On ne cible pas une cellule spécifique
      return;
    }

    if (viewContext === 'student') {
      if (isFirstSignature || !defaultSignature) {
        // Pour la première signature, ouvrir le modal de signature
        setCurrentSigningCell({ date, period });
        setShowSignatureModal(true);
      } else {
        // Pour les signatures suivantes, utiliser la signature par défaut
        // Mais seulement pour la demi-journée cliquée
        console.log(`Signature de la demi-journée ${date} ${period} avec signature par défaut`);
        
        // Vérifier si cette cellule n'est pas déjà signée
        const isCellAlreadySigned = signedCells.some(
          cell => cell.date === date && cell.period === period
        );
        
        if (isCellAlreadySigned) {
          console.log(`La cellule ${date} ${period} est déjà signée, opération ignorée`);
          return;
        }
        
        const newSignedCells = [...signedCells, { date, period }];
        setSignedCells(newSignedCells);
        
        // Ajouter la signature dans la liste des signatures pour cette date
        setParticipantSignatures(prev => ({
          ...prev,
          [`${date}_${period}`]: defaultSignature
        }));
        
        // Enregistrer la signature dans la base de données
        try {
          const { error } = await supabase
            .from('attendance_sheet_signatures')
            .insert({
              training_id: training.id,
              user_id: participant.id,
              date,
              period,
              signature_url: defaultSignature,
              signature_type: 'participant'
            });

          if (error) {
            console.error('Erreur lors de l\'enregistrement de la signature:', error);
          } else {
            console.log(`Signature enregistrée avec succès pour ${date} ${period}`);
          }
        } catch (error) {
          console.error('Exception lors de l\'enregistrement de la signature:', error);
        }
      }
    } else if (viewContext === 'crm') {
      // Pour le formateur, utiliser un flux similaire
      if (!trainerSignature) {
        // Si pas de signature formateur, ouvrir la modale de signature
        setCurrentSigningCell({ date, period });
        setShowSignatureModal(true);
      } else {
        // Si on a déjà une signature, l'utiliser directement
        console.log(`Signature formateur pour ${date} ${period} avec signature existante`);
        
        // Vérifier si cette cellule n'est pas déjà signée par le formateur
        const isTrainerCellSigned = Object.keys(trainerSignatures).includes(`${date}_${period}`);
        
        if (isTrainerCellSigned) {
          console.log(`La cellule ${date} ${period} est déjà signée par le formateur, opération ignorée`);
          return;
        }
        
        // Ajouter la signature dans la liste des signatures pour cette date
        setTrainerSignatures(prev => ({
          ...prev,
          [`${date}_${period}`]: trainerSignature
        }));
        
        // Enregistrer la signature du formateur dans la base de données
        try {
          const { error } = await supabase
            .from('attendance_sheet_signatures')
            .insert({
              training_id: training.id,
              user_id: 'trainer', // Identifiant spécial pour le formateur
              date,
              period,
              signature_url: trainerSignature,
              signature_type: 'trainer'
            });

          if (error) {
            console.error('Erreur lors de l\'enregistrement de la signature du formateur:', error);
          } else {
            console.log(`Signature du formateur enregistrée avec succès pour ${date} ${period}`);
          }
        } catch (error) {
          console.error('Exception lors de l\'enregistrement de la signature du formateur:', error);
        }
      }
    }
  };

  // Handler pour déclencher la signature d'une cellule
  const handleSignature = (date: string, period: "morning" | "afternoon") => {
    console.log(`🖊️ [SIGNATURE] Signature demandée pour ${date} ${period}`);
    setCurrentSigningCell({ date, period });
    
    // Si nous avons déjà une signature principale pour ce participant,
    // on la met à jour automatiquement dans tous les créneaux sans ouvrir la modale
    if (participantSignature) {
      console.log("✅ [SIGNATURE] Signature existante trouvée, application automatique");
      handleSignatureCreated(participantSignature);
    } else {
      // Sinon, on ouvre la modale de signature
      setShowSignatureModal(true);
    }
  };

  // Handler pour quand une signature est créée ou modifiée
  const handleSignatureCreated = async (signatureUrl: string) => {
    console.log("✅ [SIGNATURE] Nouvelle signature créée ou modifiée:", signatureUrl?.substring(0, 30) + "...");
    
    try {
      // 1. Convertir le Data URL en Blob
      const res = await fetch(signatureUrl);
      const blob = await res.blob();
      
      // 2. Générer un nom de fichier simple qui distingue clairement l'apprenant du formateur
      const fileName = viewContext === 'student'
        ? `attendance_participant_${participant.id.substring(0, 8)}_${Date.now()}.png`
        : `attendance_trainer_${training.id.substring(0, 8)}_${Date.now()}.png`;
      
      // 3. Sauvegarder l'image dans le bucket 'signatures'
      console.log("🔄 [SIGNATURE] Sauvegarde de l'image dans le bucket signatures...");
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('signatures')
        .upload(fileName, blob, {
          contentType: 'image/png',
          upsert: true
        });
      
      if (uploadError) {
        console.error("❌ [SIGNATURE] Erreur lors de l'upload de la signature:", uploadError);
        throw new Error(`Erreur lors de l'upload de la signature: ${uploadError.message}`);
      }
      
      // 4. Obtenir l'URL publique du fichier
      const { data: { publicUrl } } = supabase.storage
        .from('signatures')
        .getPublicUrl(fileName);
      
      console.log("✅ [SIGNATURE] Signature uploadée avec succès, URL:", publicUrl);
      
      if (viewContext === 'student') {
        // UNIQUEMENT pour les signatures d'apprenant
        setDefaultSignature(publicUrl);
        setIsFirstSignature(false);
        
        // Mettre à jour la signature principale
        setParticipantSignature(publicUrl);
        
        // 5. Mettre à jour/créer la signature globale du participant pour cette formation
        // Rechercher d'abord si une signature existe déjà
        const { data: existingDocuments, error: queryError } = await supabase
          .from('documents')
          .select('id')
          .eq('training_id', training.id)
          .eq('user_id', participant.id)
          .eq('type', 'attestation')
          .ilike('title', '%signature%');
        
        if (queryError) {
          console.error("❌ [SIGNATURE] Erreur lors de la recherche du document existant:", queryError);
        } else {
          if (existingDocuments && existingDocuments.length > 0) {
            // Mettre à jour le document existant
            const { error: updateError } = await supabase
              .from('documents')
              .update({
                file_url: publicUrl,
                updated_at: new Date().toISOString()
              })
              .eq('id', existingDocuments[0].id);
            
            if (updateError) {
              console.error("❌ [SIGNATURE] Erreur lors de la mise à jour du document:", updateError);
            } else {
              console.log("✅ [SIGNATURE] Document existant mis à jour avec succès");
            }
          } else {
            // Créer un nouveau document
            const { error: insertError } = await supabase
              .from('documents')
              .insert({
                title: `Signature de ${participant.first_name} ${participant.last_name} pour émargement`,
                type: 'attestation',
                training_id: training.id,
                user_id: participant.id,
                file_url: publicUrl,
                created_by: participant.id,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              });
            
            if (insertError) {
              console.error("❌ [SIGNATURE] Erreur lors de la création du document:", insertError);
            } else {
              console.log("✅ [SIGNATURE] Nouveau document créé avec succès");
            }
          }
        }
      } else if (viewContext === 'crm') {
        // UNIQUEMENT pour les signatures formateur
        setTrainerSignature(publicUrl);
        
        // Mettre à jour/créer la signature globale du formateur pour cette formation
        const { data: existingDocuments, error: queryError } = await supabase
          .from('documents')
          .select('id')
          .eq('training_id', training.id)
          .eq('type', 'attestation')
          .ilike('title', '%signature%formateur%')
          .order('created_at', { ascending: false })
          .limit(1);
        
        if (queryError) {
          console.error("❌ [SIGNATURE] Erreur lors de la recherche du document formateur existant:", queryError);
        } else {
          if (existingDocuments && existingDocuments.length > 0) {
            // Mettre à jour le document existant
            const { error: updateError } = await supabase
              .from('documents')
              .update({
                file_url: publicUrl,
                updated_at: new Date().toISOString()
              })
              .eq('id', existingDocuments[0].id);
            
            if (updateError) {
              console.error("❌ [SIGNATURE] Erreur lors de la mise à jour du document formateur:", updateError);
            } else {
              console.log("✅ [SIGNATURE] Document formateur existant mis à jour avec succès");
            }
          } else {
            // Créer un nouveau document
            const { error: insertError } = await supabase
              .from('documents')
              .insert({
                title: `Signature du formateur pour émargement`,
                type: 'attestation',
                training_id: training.id,
                file_url: publicUrl,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              });
            
            if (insertError) {
              console.error("❌ [SIGNATURE] Erreur lors de la création du document formateur:", insertError);
            } else {
              console.log("✅ [SIGNATURE] Nouveau document formateur créé avec succès");
            }
          }
        }
      }
      
      // 6. Si nous avons une cellule en cours de signature, la marquer comme signée
      if (currentSigningCell) {
        const { date, period } = currentSigningCell;
        
        if (viewContext === 'student') {
          // Vérifier si cette cellule n'est pas déjà signée
          const cellExists = signedCells.some(
            cell => cell.date === date && cell.period === period
          );
          
          if (!cellExists) {
            console.log(`➕ [SIGNATURE] Ajout d'une nouvelle signature participant pour ${date} ${period}`);
            
            // Ajouter à l'état local
            const newSignedCells = [...signedCells, { date, period }];
            setSignedCells(newSignedCells);
            
            // Ajouter dans les signatures par date
            setParticipantSignatures(prev => ({
              ...prev,
              [`${date}_${period}`]: publicUrl
            }));
            
            // Enregistrer dans la base de données
            const { error } = await supabase
              .from('attendance_sheet_signatures')
              .insert({
                training_id: training.id,
                user_id: participant.id,
                date,
                period,
                signature_url: publicUrl,
                signature_type: 'participant' // S'assurer que le type est correct
              });
              
            if (error) {
              console.error(`❌ [SIGNATURE] Erreur lors de l'enregistrement de la signature pour ${date} ${period}:`, error);
            } else {
              console.log(`✅ [SIGNATURE] Signature enregistrée avec succès pour ${date} ${period}`);
            }
          }
        } else if (viewContext === 'crm') {
          // Pour le formateur
          console.log(`➕ [SIGNATURE] Ajout d'une nouvelle signature formateur pour ${date} ${period}`);
          
          // Ajouter dans les signatures formateur par date
          setTrainerSignatures(prev => ({
            ...prev,
            [`${date}_${period}`]: publicUrl
          }));
          
          // Enregistrer dans la base de données avec le bon type et identifiant
          const { error } = await supabase
            .from('attendance_sheet_signatures')
            .insert({
              training_id: training.id,
              user_id: 'trainer', // Identifiant spécial pour le formateur
              date,
              period,
              signature_url: publicUrl,
              signature_type: 'trainer' // S'assurer que le type est correct
            });
            
          if (error) {
            console.error(`❌ [SIGNATURE] Erreur lors de l'enregistrement de la signature formateur pour ${date} ${period}:`, error);
          } else {
            console.log(`✅ [SIGNATURE] Signature formateur enregistrée avec succès pour ${date} ${period}`);
          }
        }
        
        // Fermer la modale
        setShowSignatureModal(false);
        setCurrentSigningCell(null);
      }
    } catch (error) {
      console.error("❌ [SIGNATURE] Erreur lors du traitement de la signature:", error);
    }
  };

  // Fonction qui construit le template du document
  const renderTemplate = ({ 
    participantSignature: partSig, 
    representativeSignature, 
    trainerSignature: trainerSig,
    companySeal,
    organizationSeal 
  }: { 
    participantSignature: string | null; 
    representativeSignature: string | null; 
    trainerSignature: string | null;
    companySeal: string | null;
    organizationSeal: string | null;
  }) => {
    // Diagnostic pour voir les signatures qui sont passées
    console.log('DIAGNOSTIC RENDER TEMPLATE:', {
      participantSignatureFromProps: partSig?.substring(0, 30) + '...',
      trainerSignatureFromProps: trainerSig?.substring(0, 30) + '...',
      participantSignatureFromState: participantSignature?.substring(0, 30) + '...',
      participantSignaturesCount: Object.keys(participantSignatures).length
    });
    
    return (
      <AttendanceSheetTemplate
        training={training}
        participant={participant}
        organizationSettings={organizationSettings || undefined}
        participantSignature={partSig}
        trainerSignature={trainerSig}
        participantSignatures={participantSignatures}
        trainerSignatures={trainerSignatures}
        viewContext={viewContext}
        signedCells={signedCells}
        onCellClick={handleCellClick}
        isSigningEnabled={isSigningEnabled}
        signedDates={signedDates}
      />
    );
  };

  return (
    <>
      {/* Diagnostic pour vérifier la valeur de participantSignature */}
      {(() => {
        console.log('DIAGNOSTIC GENERIC ATTENDANCE SHEET:', {
          participantSignatureExists: !!participantSignature,
          participantSignatureValue: participantSignature?.substring(0, 30) + '...',
          hasSomeSignatures: Object.keys(participantSignatures).length > 0
        });
        return null;
      })()}
      
      <DocumentWithSignatures
        documentType={DocumentType.EMARGEMENT}
        trainingId={training.id}
        participantId={participant.id}
        participantName={participantName}
        viewContext={viewContext}
        onCancel={onCancel}
        onDocumentOpen={onDocumentOpen}
        onDocumentClose={onDocumentClose}
        renderTemplate={renderTemplate}
        documentTitle="Feuille d'émargement"
        allowCompanySeal={false}
        allowOrganizationSeal={false}
        onSignatureCreated={handleSignatureCreated}
        hideSignButton={true}
        alwaysShowDownloadButton={true}
      />
      
      {/* Modale de signature */}
      {showSignatureModal && (
        <div className="fixed inset-0 z-[60] bg-black bg-opacity-75 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[80vh] overflow-y-auto my-4">
            <div className="p-4 sm:p-6">
              <h3 className="text-lg font-semibold mb-4">Votre signature</h3>
              <p className="mb-4">Veuillez créer votre signature pour la feuille d'émargement :</p>
              
              <SignatureCanvas 
                onSave={(dataURL) => {
                  console.log("Sauvegarde de la signature avec dataURL de longueur:", dataURL?.length || 0);
                  if (dataURL) {
                    // Approche 1 : Appeler le processus de sauvegarde de signature via événement personnalisé
                    const documentContainer = document.getElementById('document-container');
                    console.log("Document container trouvé:", !!documentContainer);
                    
                    if (documentContainer) {
                      const signatureManagerId = documentContainer.getAttribute('data-signature-manager-id');
                      console.log("ID du gestionnaire de signatures:", signatureManagerId);
                      
                      if (signatureManagerId) {
                        console.log("Envoi de l'événement save-signature");
                        const event = new CustomEvent('save-signature', { 
                          detail: { 
                            dataURL, 
                            signatureType: viewContext === 'crm' ? 'trainer' : 'participant',
                            callbackId: Math.random().toString(36).substring(2, 15)
                          } 
                        });
                        document.dispatchEvent(event);
                      } else {
                        console.error("Attribut data-signature-manager-id non trouvé sur #document-container");
                      }
                    } else {
                      console.error("Élément #document-container non trouvé dans le DOM");
                    }
                    
                    // Approche 2 : Sauvegarde directe dans Supabase si l'événement échoue
                    console.log("Sauvegarde directe de la signature dans Supabase en fallback");
                    
                    // 1. Convertir le Data URL en Blob
                    fetch(dataURL)
                      .then(res => res.blob())
                      .then(async (blob) => {
                        // 2. Générer un nom de fichier simple
                        const fileName = `attendance_${participant.id.substring(0, 8)}_${Date.now()}.png`;
                        
                        try {
                          // 3. Sauvegarder l'image dans le bucket 'signatures'
                          console.log("🔄 Sauvegarde de l'image dans le bucket signatures...");
                          const { data: uploadData, error: uploadError } = await supabase.storage
                            .from('signatures')
                            .upload(fileName, blob, {
                              contentType: 'image/png',
                              upsert: true
                            });
                          
                          if (uploadError) {
                            console.error("❌ Erreur lors de l'upload de la signature:", uploadError);
                            throw new Error(`Erreur lors de l'upload de la signature: ${uploadError.message}`);
                          }
                          
                          // 4. Obtenir l'URL publique du fichier
                          const { data: { publicUrl } } = supabase.storage
                            .from('signatures')
                            .getPublicUrl(fileName);
                          
                          console.log("✅ Signature uploadée avec succès, URL:", publicUrl);
                          
                          // 5. Créer le document
                          const { error: insertError } = await supabase
                            .from('documents')
                            .insert({
                              title: `Signature de ${participant.first_name} ${participant.last_name} pour émargement`,
                              type: 'attestation',
                              training_id: training.id,
                              user_id: participant.id,
                              file_url: publicUrl,
                              created_by: participant.id,
                              created_at: new Date().toISOString(),
                              updated_at: new Date().toISOString()
                            });
                            
                          if (insertError) {
                            console.error("❌ Erreur lors de la création du document:", insertError);
                          } else {
                            console.log("✅ Document créé avec succès");
                            
                            // Utiliser la signature sauvegardée
                            setDefaultSignature(publicUrl);
                            setIsFirstSignature(false);
                            
                            // Si nous avons une cellule en cours de signature, la marquer comme signée
                            if (currentSigningCell) {
                              const { date, period } = currentSigningCell;
                              
                              // Enregistrer uniquement la demi-journée cliquée
                              const newSignedCells = [...signedCells, { date, period }];
                              setSignedCells(newSignedCells);
                              
                              // Ajouter la signature dans la liste des signatures pour cette date
                              setParticipantSignatures(prev => ({
                                ...prev,
                                [`${date}_${period}`]: publicUrl
                              }));
                              
                              // Enregistrer la signature dans la base de données pour cette demi-journée spécifique
                              supabase
                                .from('attendance_sheet_signatures')
                                .insert({
                                  training_id: training.id,
                                  user_id: participant.id,
                                  date,
                                  period,
                                  signature_url: publicUrl,
                                  signature_type: viewContext === 'crm' ? 'trainer' : 'participant'
                                })
                                .then(({ error }) => {
                                  if (error) {
                                    console.error("Erreur lors de l'enregistrement de la signature pour la demi-journée:", error);
                                  } else {
                                    console.log(`Signature enregistrée avec succès pour ${date} ${period}`);
                                  }
                                });
                              
                              // Mettre à jour la signature principale
                              setParticipantSignature(publicUrl);
                            }
                          }
                        } catch (error) {
                          console.error("❌ Erreur lors du traitement de la signature:", error);
                        }
                      })
                      .catch(error => {
                        console.error("❌ Erreur lors de la conversion du dataURL en blob:", error);
                      });
                    
                    // Fermer la modale
                    setShowSignatureModal(false);
                  }
                }}
                onCancel={() => {
                  setShowSignatureModal(false);
                  setCurrentSigningCell(null);
                }}
                signatureType={viewContext === 'crm' ? 'trainer' : 'participant'}
                initialName={viewContext === 'crm' ? training.trainer_name || 'Formateur' : `${participant.first_name} ${participant.last_name}`}
              />
              
              <p className="text-xs text-gray-500 mt-3">
                Utilisez votre souris ou votre doigt pour dessiner votre signature.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}; 