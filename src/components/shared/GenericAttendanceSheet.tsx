import React, { useState, useEffect } from 'react';
import { DocumentWithSignatures } from './DocumentWithSignatures';
import { Training, Participant, OrganizationSettings } from './DocumentUtils';
import { AttendanceSheetTemplate } from './templates/AttendanceSheetTemplate';
import { DocumentType, SignatureType } from '../../types/SignatureTypes';
import { supabase } from '../../lib/supabase';
import SignatureCanvas from '../SignatureCanvas';

// Define structure expected for items in training_days array
interface TrainingDayInfo {
    date: string;
    morning: boolean;
    afternoon: boolean;
    // Add other properties if they exist on the day object
}

interface GenericAttendanceSheetProps {
  training: Training;
  participant: Participant;
  onCancel: () => void;
  viewContext?: 'crm' | 'student';
  onDocumentOpen?: () => void;
  onDocumentClose?: () => void;
  participantSignature?: string | null;
  trainerSignature?: string | null;
  onSignatureSave?: (signatureUrl: string) => void;
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
  onCancel,
  viewContext = 'crm',
  onDocumentOpen,
  onDocumentClose,
  participantSignature: participantSignatureFromProps,
  trainerSignature: trainerSignatureFromProps,
  onSignatureSave
}) => {
  const [organizationSettings, setOrganizationSettings] = useState<OrganizationSettings | null>(null);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [participantSignatureValue, setParticipantSignatureValue] = useState<string | undefined>(() => participantSignatureFromProps || undefined);
  const [isSaving, setIsSaving] = useState(false);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [currentSigningCell, setCurrentSigningCell] = useState<{ date: string; period: 'morning' | 'afternoon' } | null>(null);
  const [participantSignatures, setParticipantSignatures] = useState<{ [key: string]: string }>({});
  const [trainerSignatures, setTrainerSignatures] = useState<{ [key: string]: string }>({});
  const [defaultSignature, setDefaultSignature] = useState<string | null>(() => participantSignatureFromProps || null);
  const [isFirstSignature, setIsFirstSignature] = useState(!participantSignatureFromProps);
  const [signedCells, setSignedCells] = useState<Array<{ date: string; period: 'morning' | 'afternoon' }>>([]);
  const [isSigningEnabled, setIsSigningEnabled] = useState(true);
  const [saveSignatureGlobally, setSaveSignatureGlobally] = useState(true);
  // Nouvelle variable d'état pour stocker la dernière signature du formateur
  const [lastTrainerSignature, setLastTrainerSignature] = useState<string | null>(trainerSignatureFromProps || null);

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

  // Charger la signature GLOBALE du participant (une seule fois)
  useEffect(() => {
    const loadParticipantGlobalSignature = async () => {
      if (!participant?.id) return;
      console.log(`🔍 [GATS_LOAD_GLOBAL_SIG] Chargement signature globale pour participant ${participant.id}`);
      try {
        const { data, error } = await supabase
          .from('documents')
          .select('file_url')
          .eq('user_id', participant.id)
          .eq('training_id', training.id)
          .eq('title', "Signature de l'apprenant")
          .order('created_at', { ascending: false })
          .limit(1);

        if (error) {
          console.error('❌ [GATS_LOAD_GLOBAL_SIG] Erreur chargement:', error);
        } else if (data && data.length > 0 && data[0].file_url) {
          const loadedUrl = data[0].file_url;
          console.log("✅ [LOAD] Signature globale du participant trouvée:", loadedUrl?.substring(0, 30) + "...");
          setDefaultSignature(loadedUrl);
          setParticipantSignatureValue(loadedUrl);
          setIsFirstSignature(false);
        } else {
          console.log("ℹ️ [LOAD] Aucune signature globale trouvée pour le participant");
          setDefaultSignature(null);
          setParticipantSignatureValue(undefined);
          setIsFirstSignature(true);
        }
      } catch (e) {
        console.error('💥 [GATS_LOAD_GLOBAL_SIG] Exception:', e);
      }
    };
    loadParticipantGlobalSignature();
  }, [training?.id, participant?.id]);

  // Chargement des signatures existantes
  useEffect(() => {
    const loadExistingSignatures = async () => {
      try {
        // Rechercher les signatures globales pour le participant
        // Utiliser un filtre plus précis sur le titre pour éviter de charger une mauvaise signature
        const participantNameForTitle = `${participant.first_name} ${participant.last_name}`;
        const expectedTitle = `Signature de ${participantNameForTitle} pour émargement`;
        
        console.log(`🔍 [LOAD_SIG_GLOBAL] Recherche signature globale participant avec user_id=${participant.id} et title='${expectedTitle}'`);
        
        const { data: participantSigData, error: participantSigError } = await supabase
          .from('documents')
          .select('file_url')
          .eq('training_id', training.id)
          .eq('user_id', participant.id)
          .eq('type', 'attestation') // Le type est important
          .eq('title', expectedTitle) // Utiliser le titre exact attendu
          .order('created_at', { ascending: false })
          .limit(1);

        if (!participantSigError && participantSigData && participantSigData.length > 0) {
          console.log("✅ [LOAD] Signature globale du participant trouvée:", participantSigData[0].file_url?.substring(0, 30) + "...");
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
          // Utiliser la prop onSignatureSave si elle existe pour la signature globale
          if (onSignatureSave && typeof trainerSigData[0].file_url === 'string') {
            // Ne pas appeler setTrainerSignature ici, mais potentiellement remonter via prop si nécessaire
            // onSignatureSave(trainerSigData[0].file_url); 
            // Cependant, le chargement ne devrait pas déclencher une sauvegarde.
            // On pourrait juste stocker localement si besoin, mais le parent (DWS) s'en charge via le manager.
          } else {
            // console.log("ℹ️ [LOAD] Signature du formateur chargée mais pas de callback onSignatureSave.");
          }
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
        // Sécurité: S'assurer qu'on ne charge QUE les signatures où signature_type est 'trainer'
        // ET que user_id n'est PAS un UUID (pour filtrer les cas où un apprenant aurait été marqué comme trainer par erreur)
        const { data: trainerCellsData, error: trainerCellsError } = await supabase
          .from('attendance_sheet_signatures')
          .select('id, date, period, signature_url')
          .eq('training_id', training.id)
          .eq('signature_type', 'trainer'); // Filtrer par type est la méthode principale
          // Optionnel: Ajouter .not('user_id', 'like', '%-%-%-%-%') si des user_id UUID trainent avec le type trainer
          // Mais normalement, le filtre sur signature_type suffit.

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

  // Mettre à jour lastTrainerSignature quand trainerSignatureFromProps change
  useEffect(() => {
    if (trainerSignatureFromProps) {
      console.log('🔄 [UPDATE_TRAINER_SIG] Mise à jour lastTrainerSignature depuis props');
      setLastTrainerSignature(trainerSignatureFromProps);
    }
  }, [trainerSignatureFromProps]);

  // >>> AJOUT DE LOGS DÉTAILLÉS AU MONTAGE <<<
  useEffect(() => {
    console.log('🔬 [GATS_MOUNT_PROPS] GenericAttendanceSheet monté avec props:', {
      trainingId: training?.id,
      participantId: participant?.id,
      participantSignatureFromProps: participantSignatureFromProps ? (typeof participantSignatureFromProps === 'string' ? participantSignatureFromProps.substring(0, 30) + '...' : 'non-string') : 'undefined',
      trainerSignatureFromProps: trainerSignatureFromProps ? (typeof trainerSignatureFromProps === 'string' ? trainerSignatureFromProps.substring(0, 30) + '...' : 'non-string') : 'undefined',
      viewContext
    });
  }, []);

  // Gérer le clic sur une cellule de signature
  const handleCellClick = async (date: string, period: 'morning' | 'afternoon') => {
    if (!isSigningEnabled || isSaving) return;
    setSaveSignatureGlobally(true);

    // Cas spécial pour la modification globale de signature
    if (date === 'global') {
      console.log("Modification globale de la signature demandée");
      setShowSignatureModal(true);
      setCurrentSigningCell(null);
      return;
    }

    if (viewContext === 'student') {
      const cellKey = `${date}_${period}`;
      console.log(`Clic apprenant sur cellule ${cellKey}`);

      // Vérifier si cette cellule spécifique est déjà signée par l'apprenant
      const isCellAlreadySigned = signedCells.some(
        cell => cell.date === date && cell.period === period
      );

      if (isCellAlreadySigned) {
        // Si DÉJÀ signée -> ouvrir la modale pour modification/remplacement
        console.log(`Cellule ${cellKey} déjà signée par l'apprenant, ouverture modale pour remplacement...`);
        setCurrentSigningCell({ date, period });
        setShowSignatureModal(true);
      } else {
        // Si NON signée -> Vérifier si une signature globale existe
        if (defaultSignature) {
           // Signature globale existe -> L'utiliser pour signer automatiquement cette cellule
           console.log(`Signature globale existe (${defaultSignature.substring(0,30)}...), ajout automatique pour ${cellKey}...`);
           
           // Mettre à jour l'état local IMMÉDIATEMENT pour affichage
        const newSignedCells = [...signedCells, { date, period }];
        setSignedCells(newSignedCells);
        
           // Enregistrer dans la DB en arrière-plan
           try {
            setIsSaving(true);
            console.log(`💾 [AUTO_SAVE_PARTICIPANT_CELL] Appel upsertAttendanceSignature avec defaultSignature: ${defaultSignature.substring(0,50)}...`);
            const successDb = await upsertAttendanceSignature(date, period, participant.id, 'participant', defaultSignature);
            if (!successDb) {
              console.error(`❌ Erreur lors de l'enregistrement automatique de la signature pour ${cellKey}: upsertAttendanceSignature a échoué`);
              // Annuler l'ajout local si l'enregistrement échoue
              setSignedCells(currentCells => currentCells.filter(c => !(c.date === date && c.period === period))); 
          } else {
              console.log(`✅ Signature automatique enregistrée avec succès pour ${cellKey}`);
              // Peut-être plus besoin de isFirstSignature ici, car on utilise juste defaultSignature
          }
        } catch (error) {
            console.error(`💥 Exception lors de l'enregistrement automatique de la signature pour ${cellKey}:`, error);
            setSignedCells(currentCells => currentCells.filter(c => !(c.date === date && c.period === period))); 
          } finally {
            setIsSaving(false);
          }

        } else {
          // Signature globale N'EXISTE PAS -> Ouvrir la modale pour la création
          console.log(`Cellule ${cellKey} non signée et aucune signature globale, ouverture modale pour création...`);
          setCurrentSigningCell({ date, period });
          setShowSignatureModal(true);
        }
      }
    } else if (viewContext === 'crm') {
      // Si le formateur clique, il veut signer/modifier cette cellule
      const cellKey = `${date}_${period}`;
      console.log(`Clic formateur sur cellule ${cellKey}`);
      
      // Vérifier si cette cellule est déjà signée par le formateur
      const trainerHasSignedThisCell = trainerSignatures[cellKey];
      
      if (trainerHasSignedThisCell) {
        console.log(`Cellule ${cellKey} déjà signée par le formateur, ouverture modale pour modification...`);
        setCurrentSigningCell({ date, period });
        setShowSignatureModal(true);
      } else {
        // Si NON signée -> deux possibilités
        if (!trainerSignatureFromProps) {
          // Pas de signature globale -> ouvrir la modale pour créer la signature
          console.log("Aucune signature globale formateur trouvée, ouverture modale pour création...");
          setCurrentSigningCell({ date, period });
          setShowSignatureModal(true);
        } else {
          // Signature globale existe -> utiliser cette signature pour la cellule
          console.log(`Utilisation signature globale formateur existante pour cellule ${cellKey}`);
          
          // Mettre à jour l'état local
        setTrainerSignatures(prev => ({
          ...prev,
            [cellKey]: trainerSignatureFromProps
        }));
        
          try {
            setIsSaving(true);
             console.log(`💾 [SAVE_TRAINER_CELL] Appel upsertAttendanceSignature avec trainerSignature: ${trainerSignatureFromProps.substring(0,50)}...`);
             // Utiliser la fonction helper upsertAttendanceSignature qui utilise la bonne table
            const successDb = await upsertAttendanceSignature(date, period, 'trainer', 'trainer', trainerSignatureFromProps); // Utilisation de trainerSignatureFromProps ici
            
            if (!successDb) {
              console.error(`❌ Erreur lors de l'enregistrement de la signature formateur pour ${cellKey}: upsertAttendanceSignature a échoué`);
              // Annuler l'ajout local
              setTrainerSignatures(prev => {
                 const newState = {...prev};
                 delete newState[cellKey];
                 return newState;
              });
          } else {
              console.log(`✅ Signature formateur enregistrée avec succès pour ${cellKey}`);
          }
        } catch (error) {
            console.error(`💥 Exception lors de l'enregistrement de la signature formateur pour ${cellKey}:`, error);
            // Annuler l'ajout local
             setTrainerSignatures(prev => {
                 const newState = {...prev};
                 delete newState[cellKey];
                 return newState;
              });
          } finally {
            setIsSaving(false);
          }
        }
      }
    }
    
    // >>> AJOUT DE LOGS DE DIAGNOSTIC SANS MODIFIER LA STRUCTURE <<<
    console.log(`🧪 [GATS_SIGNATURE_STATE] État signatures après clic:`, {
      participantSignature: participantSignatureFromProps ? 'défini' : 'non défini',  
      participantSignatureValue: participantSignatureValue ? 'chargé' : 'non chargé', 
      defaultSignature: defaultSignature ? 'défini' : 'non défini',
      isFirstSignature,
      signedCellsCount: signedCells.length,
      viewContext
    });
  };

  // Handler pour déclencher la signature d'une cellule
  const handleSignature = (date: string, period: "morning" | "afternoon") => {
    console.log(`🖊️ [SIGNATURE] Signature demandée pour ${date} ${period}`);
    setCurrentSigningCell({ date, period });
    
    // Si nous avons déjà une signature principale pour ce participant,
    // on la met à jour automatiquement dans tous les créneaux sans ouvrir la modale
    if (participantSignatureFromProps) {
      console.log("✅ [SIGNATURE] Signature existante trouvée, application automatique");
      handleSignatureCreated(participantSignatureFromProps);
    } else {
      // Sinon, on ouvre la modale de signature
      setShowSignatureModal(true);
    }
  };

  // Handler pour quand une signature est créée ou modifiée
  const handleSignatureCreated = async (signatureUrl: string) => {
    if (isSaving) return;
    console.log("🌀 [HANDLE_SIG_CREATED] Start - URL data len:", signatureUrl?.length);
    setIsSaving(true);
    let newlyCreatedPublicUrl: string | null = null;
    let cellUpdateSuccess = true;

    try {
      // 1. Convertir le Data URL en Blob
      const res = await fetch(signatureUrl);
      const blob = await res.blob();
      
      // 2. Générer un nom de fichier
      const fileName = viewContext === 'student'
        ? `attendance_participant_${participant.id.substring(0, 8)}_${Date.now()}.png`
        : `attendance_trainer_${training.id.substring(0, 8)}_${Date.now()}.png`;
      console.log(`🌀 [HANDLE_SIG_CREATED] FileName généré: ${fileName}`);
      
      // 3. Upload vers Storage
      console.log(`🌀 [HANDLE_SIG_CREATED] Upload vers Storage (bucket: signatures, file: ${fileName})...`);
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('signatures')
        .upload(fileName, blob, {
          contentType: 'image/png',
          upsert: true
        });
      
      if (uploadError) {
        console.error("❌ [HANDLE_SIG_CREATED] Erreur Upload Storage:", uploadError);
        throw new Error(`Erreur Upload Storage: ${uploadError.message}`);
      }
      
      // 4. Obtenir l'URL publique
      console.log(`🌀 [HANDLE_SIG_CREATED] Récupération Public URL pour: ${fileName}...`);
      const { data: urlData } = supabase.storage
        .from('signatures')
        .getPublicUrl(fileName);
      
      newlyCreatedPublicUrl = urlData?.publicUrl;
      console.log(`🌀 [HANDLE_SIG_CREATED] Public URL obtenue: ${newlyCreatedPublicUrl}`);

      if (!newlyCreatedPublicUrl) {
        console.error('❌ [HANDLE_SIG_CREATED] Public URL est null ou undefined!');
        throw new Error('Public URL non obtenue après upload.');
      }

      // --- Mise à jour de l'état local IMMÉDIATEMENT --- 
      if (viewContext === 'student') {
        console.log(`🌀 [HANDLE_SIG_CREATED] Contexte STUDENT - Mise à jour ÉTAT LOCAL...`);
        console.log(`   -> Mise à jour état defaultSignature avec: ${newlyCreatedPublicUrl}`);
        setDefaultSignature(newlyCreatedPublicUrl);
        setIsFirstSignature(false);
        console.log(`   -> Mise à jour état participantSignatureValue avec: ${newlyCreatedPublicUrl}`);
        setParticipantSignatureValue(newlyCreatedPublicUrl);
        
        // >>> AJOUT : Sauvegarde de la nouvelle signature globale dans la table documents <<<
        if (saveSignatureGlobally && newlyCreatedPublicUrl) {
            console.log(`💾 [HANDLE_SIG_CREATED] Appel upsertDocumentSignature pour la signature globale de l'apprenant...`);
            await upsertDocumentSignature("Signature de l'apprenant", participant.id, newlyCreatedPublicUrl);
        } else {
            // Correction: Doit être un log, pas une erreur si l'URL est OK mais saveSignatureGlobally est faux
            if (!newlyCreatedPublicUrl) {
                console.error('❌ [HANDLE_SIG_CREATED] Impossible de sauvegarder la signature globale: newlyCreatedPublicUrl est null');
            } else {
                 console.log(`ℹ️ [HANDLE_SIG_CREATED] Sauvegarde globale désactivée, pas d'upsert dans documents.`);
            }
        }

      } else if (viewContext === 'crm') {
        console.log(`🌀 [HANDLE_SIG_CREATED] Contexte CRM - Mise à jour ÉTAT LOCAL...`);
        // Stocker la nouvelle signature dans l'état local
        if (newlyCreatedPublicUrl) {
          console.log(`   -> Mise à jour état lastTrainerSignature avec: ${newlyCreatedPublicUrl}`);
          setLastTrainerSignature(newlyCreatedPublicUrl);
        }
        // On remonte l'info via onSignatureSave
        if(onSignatureSave && newlyCreatedPublicUrl) {
          console.log(`   -> Appel onSignatureSave (pour formateur) avec: ${newlyCreatedPublicUrl}`);
          onSignatureSave(newlyCreatedPublicUrl);
        }
      }
      
      // --- Traitement de la cellule spécifique si applicable --- 
      if (currentSigningCell) {
        console.log(`🌀 [HANDLE_SIG_CREATED] Traitement cellule spécifique: ${currentSigningCell.date}_${currentSigningCell.period}`);
        const { date, period } = currentSigningCell;
        const cellKey = `${date}_${period}`;
        let successDb = false;
        
        // Assurer que l'URL est bien une chaîne avant de mettre à jour l'état des signatures par cellule
        // Note: newlyCreatedPublicUrl a déjà été vérifié non-null plus haut, donc il est string ici.
        const finalUrl = newlyCreatedPublicUrl; // TypeScript sait maintenant que c'est une string
        
        if (viewContext === 'student') {
            console.log(`   -> Mise à jour état participantSignatures[${cellKey}] avec: ${finalUrl}`);
            setParticipantSignatures(prev => ({ ...prev, [cellKey]: finalUrl })); // Utiliser finalUrl
            console.log(`   -> Mise à jour état signedCells`);
            setSignedCells(prev => {
              if (!prev.some(c => c.date === date && c.period === period)) {
                return [...prev, { date, period }];
              }
              return prev;
            });
            
            console.log(`   -> Upsert DB attendance_sheet_signatures (participant) pour ${cellKey} avec URL: ${finalUrl}`);
            successDb = await upsertAttendanceSignature(date, period, participant.id, 'participant', finalUrl); // Utiliser finalUrl

          } else if (viewContext === 'crm') {
            console.log(`   -> Mise à jour état trainerSignatures[${cellKey}] avec: ${finalUrl}`);
            setTrainerSignatures(prev => ({ ...prev, [cellKey]: finalUrl })); // Utiliser finalUrl

            console.log(`   -> Upsert DB attendance_sheet_signatures (trainer) pour ${cellKey} avec URL: ${finalUrl}`);
            successDb = await upsertAttendanceSignature(date, period, 'trainer', 'trainer', finalUrl); // Utiliser finalUrl
          }
        
        if(successDb) {
            // Fermer la modale uniquement si l'enregistrement DB a réussi
            setShowSignatureModal(false);
            setCurrentSigningCell(null);
            console.log(`🌀 [HANDLE_SIG_CREATED] Modale fermée.`);
        } else {
            console.error(`❌ [HANDLE_SIG_CREATED] Échec de l'upsert dans attendance_sheet_signatures pour ${cellKey}. Modale reste ouverte.`);
            alert("Erreur lors de l'enregistrement de la signature pour cette cellule.");
        }
      } else {
        console.log(`🌀 [HANDLE_SIG_CREATED] Pas de cellule spécifique à traiter (modif globale).`);
        // Si c'est une modif globale (pas de cellule), on peut fermer la modale ici
        setShowSignatureModal(false);
        
        // NOUVEAU: Si c'est une signature globale (pas de cellule spécifique), 
        // lancer le processus de signature pour toutes les cellules
        // Note: newlyCreatedPublicUrl est déjà vérifié non-null plus haut, donc il est string ici.
        const finalGlobalUrl = newlyCreatedPublicUrl;
        console.log(`🌀 [HANDLE_SIG_CREATED] Signature globale créée, application à toutes les cellules non signées...`);
        
        // Fermer la modale d'abord
        setIsSaving(false); // Temporairement désactiver l'état de sauvegarde
        
        // Utiliser setTimeout pour permettre à l'état de se mettre à jour avant de lancer handleSignAll
        setTimeout(() => {
          if (viewContext === 'student') {
            // Pour l'étudiant, on peut utiliser handleSignAll directement
            handleSignAll('participant');
          } else {
            // Pour le formateur, nous devons d'abord nous assurer que l'URL est bien remontée au parent
            // via onSignatureSave, puis utiliser cette nouvelle URL pour signer toutes les cellules
            // Utiliser directement finalGlobalUrl qui est disponible immédiatement
            console.log(`🌀 [HANDLE_SIG_CREATED] Application signatures formateur avec URL: ${finalGlobalUrl}`);
            
            const allCells = getAllPossibleCells();
            const unsignedCells = allCells.filter(cell => !trainerSignatures[`${cell.date}_${cell.period}`]);
            
            if (unsignedCells.length > 0) {
              console.log(`🌀 [HANDLE_SIG_CREATED] Signature de ${unsignedCells.length} cellules pour le formateur...`);
              
              // Utiliser Promise.allSettled pour signer toutes les cellules en parallèle
              Promise.allSettled(
                unsignedCells.map(cell => {
                    return upsertAttendanceSignature(cell.date, cell.period, 'trainer', 'trainer', finalGlobalUrl);
                })
              ).then(results => {
                const successfulSigns = unsignedCells.filter((_, index) => 
                  results[index].status === 'fulfilled' && (results[index] as PromiseFulfilledResult<boolean>).value
                );
                
                // Mettre à jour l'état local pour les signatures réussies
                if (successfulSigns.length > 0) {
                  setTrainerSignatures(prev => {
                    const updated = { ...prev };
                    // CORRECTION LINTER: Assurer que l'URL n'est pas null avant l'assignation
                    if (finalGlobalUrl) { 
                      successfulSigns.forEach(cell => updated[`${cell.date}_${cell.period}`] = finalGlobalUrl);
                    }
                    return updated;
                  });
                }
              });
            } else {
              console.log(`ℹ️ [HANDLE_SIG_CREATED] Aucune cellule non signée trouvée pour le formateur.`);
            }
          }
        }, 300);
        
      }
      console.log(`🌀 [HANDLE_SIG_CREATED] Fin succès.`);

    } catch (error) {
      console.error("❌ [HANDLE_SIG_CREATED] Erreur globale dans handleSignatureCreated:", error);
      alert("Une erreur est survenue lors de la sauvegarde de votre signature.");
    } finally {
       setIsSaving(false);
    }
  };
  
  // Fonction helper pour l'upsert dans la table documents
  const upsertDocumentSignature = async (title: string, userId: string | null, fileUrl: string) => {
      console.log(`💾 [UPSERT_DOC] Tentative Upsert pour title='${title}', userId='${userId}', fileUrl='${fileUrl?.substring(0,50)}...'`);
      
      let query = supabase
          .from('documents')
          .select('id')
          .eq('training_id', training.id)
          .eq('title', title);
          
      // Ajouter le filtre user_id seulement s'il est fourni (pour le cas formateur)
      if (userId) {
          query = query.eq('user_id', userId);
      }
      // Pour le formateur, on pourrait aussi avoir besoin de type='attestation' si plusieurs docs formateur existent
      if (!userId) { // Supposons que si userId est null, c'est le formateur
         query = query.eq('type', 'attestation'); 
      }
          
      const { data: existing, error: queryError } = await query.limit(1);

      if (queryError) {
          console.error(`❌ [UPSERT_DOC] Erreur recherche existant pour '${title}':`, queryError);
          return; 
      }

      if (existing && existing.length > 0) {
          console.log(`🔄 [UPSERT_DOC] Document existant trouvé (ID: ${existing[0].id}) pour '${title}', mise à jour avec URL: ${fileUrl?.substring(0,50)}...`);
          const { error: updateError } = await supabase
              .from('documents')
              .update({ file_url: fileUrl, updated_at: new Date().toISOString() })
              .eq('id', existing[0].id);
          if (updateError) console.error(`❌ [UPSERT_DOC] Erreur update pour '${title}':`, updateError);
          else console.log(`✅ [UPSERT_DOC] Update succès pour '${title}'.`);
      } else {
          console.log(`➕ [UPSERT_DOC] Document non trouvé pour '${title}', création avec URL: ${fileUrl?.substring(0,50)}...`);
          const insertData: any = {
              title: title,
              type: 'attestation', // Ou adapter si nécessaire
              training_id: training.id,
              file_url: fileUrl,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
          };
          // Ajouter user_id et created_by seulement si userId est fourni
          if (userId) {
              insertData.user_id = userId;
              insertData.created_by = userId; 
          }
          const { error: insertError } = await supabase.from('documents').insert(insertData);
          if (insertError) console.error(`❌ [UPSERT_DOC] Erreur insert pour '${title}':`, insertError);
          else console.log(`✅ [UPSERT_DOC] Insert succès pour '${title}'.`);
      }
  };
  
  // Fonction helper pour l'upsert dans attendance_sheet_signatures
  const upsertAttendanceSignature = async (date: string, period: 'morning' | 'afternoon', userId: string, signatureType: 'participant' | 'trainer', signatureUrl: string): Promise<boolean> => {
      console.log(`💾 [UPSERT_ATT_SIG] Tentative Upsert pour ${date}_${period}, userId='${userId}', type='${signatureType}'`);
      const { error } = await supabase
          .from('attendance_sheet_signatures')
          .upsert({
              training_id: training.id,
              user_id: userId,
              date: date,
              period: period,
              signature_type: signatureType,
              signature_url: signatureUrl,
              // updated_at peut être géré par un trigger DB ou ajouté ici
          }, {
              onConflict: 'training_id, user_id, date, period, signature_type' // Assurez-vous que cette contrainte UNIQUE existe!
          });
          
       if (error) {
           console.error(`❌ [UPSERT_ATT_SIG] Erreur upsert pour ${date}_${period}, userId='${userId}', type='${signatureType}':`, error);
           return false;
       } else {
           console.log(`✅ [UPSERT_ATT_SIG] Upsert succès pour ${date}_${period}, userId='${userId}', type='${signatureType}'.`);
           return true;
    }
  };

  // Fonction de débogage pour vérifier la structure des jours de formation
  const debugTrainingDays = () => {
    console.log('🔍 [DEBUG_DAYS] Structure de training:', training);
    
    // Créer un tableau pour stocker les jours générés
    let days: Array<{date: string; morning: boolean; afternoon: boolean}> = [];
    
    try {
      // Vérifier si training_days existe déjà en toute sécurité en testant avec in
      if ('training_days' in training && Array.isArray(training.training_days) && training.training_days.length > 0) {
        console.log(`✅ [DEBUG_DAYS] training_days existe déjà avec ${training.training_days.length} jours:`, 
          training.training_days.map(d => d.date).join(", "));
        return training.training_days;
      }
    } catch (e) {
      console.log("❌ [DEBUG_DAYS] Erreur lors de l'accès à training_days:", e);
    }
    
    console.log('🔍 [DEBUG_DAYS] Recherche d\'autres sources pour les jours de formation');
    console.log('🔍 [DEBUG_DAYS] Propriétés disponibles:', Object.keys(training));
    
    // Vérifier si le champ periods contient des informations sur les jours
    try {
      if ('periods' in training && Array.isArray(training.periods) && training.periods.length > 0) {
        console.log(`🔍 [DEBUG_DAYS] La propriété 'periods' contient un tableau:`, training.periods);
        
        // Vérifier si ce tableau contient des objets avec startDate, endDate
        if (training.periods[0] && typeof training.periods[0] === 'object') {
          if ('startDate' in training.periods[0] || 'start_date' in training.periods[0]) {
            console.log(`✅ [DEBUG_DAYS] La propriété 'periods' semble contenir les jours de formation`);
            
            // Construire un tableau de jours à partir des périodes
            training.periods.forEach(period => {
              const startDate = period.startDate || period.start_date;
              const endDate = period.endDate || period.end_date;
              
              if (startDate && endDate) {
                // Pour chaque jour de la période, créer un objet jour
                const start = new Date(startDate);
                const end = new Date(endDate);
                
                console.log(`🔍 [DEBUG_DAYS] Génération de jours pour la période du ${start.toISOString()} au ${end.toISOString()}`);
                
                // Ajuster la date de fin pour inclure le dernier jour
                end.setHours(23, 59, 59, 999);
                
                for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
                  // Éviter les weekends
                  const dayOfWeek = date.getDay();
                  if (dayOfWeek !== 0 && dayOfWeek !== 6) {
                    const isoDate = date.toISOString().split('T')[0];
                    days.push({
                      date: isoDate,
                      morning: true,
                      afternoon: true
                    });
                    console.log(`➕ [DEBUG_DAYS] Jour ajouté: ${isoDate}`);
                  }
                }
              }
            });
            
            if (days.length > 0) {
              console.log(`✅ [DEBUG_DAYS] ${days.length} jours générés à partir des périodes:`, days);
              return days;
            }
          }
        }
      }
    } catch (e) {
      console.log("❌ [DEBUG_DAYS] Erreur lors de l'accès à periods:", e);
    }
    
    // Vérifier si le champ metadata contient des informations
    try {
      if ('metadata' in training && training.metadata) {
        let metadata;
        try {
          if (typeof training.metadata === 'string') {
            metadata = JSON.parse(training.metadata);
          } else {
            metadata = training.metadata;
          }
          
          // Vérifier si metadata.periods existe
          if (metadata && metadata.periods && Array.isArray(metadata.periods) && metadata.periods.length > 0) {
            console.log(`🔍 [DEBUG_DAYS] La propriété 'metadata.periods' contient un tableau:`, metadata.periods);
            
            // Vérifier si ce tableau contient des objets avec start_date, end_date
            if (metadata.periods[0] && typeof metadata.periods[0] === 'object') {
              if ('startDate' in metadata.periods[0] || 'start_date' in metadata.periods[0]) {
                console.log(`✅ [DEBUG_DAYS] La propriété 'metadata.periods' semble contenir les jours de formation`);
                
                // Construire un tableau de jours à partir des périodes
                metadata.periods.forEach((period: any) => {
                  const startDate = period.startDate || period.start_date;
                  const endDate = period.endDate || period.end_date;
                  
                  if (startDate && endDate) {
                    // Pour chaque jour de la période, créer un objet jour
                    const start = new Date(startDate);
                    const end = new Date(endDate);
                    
                    console.log(`🔍 [DEBUG_DAYS] Génération de jours pour metadata.period du ${start.toISOString()} au ${end.toISOString()}`);
                    
                    // Ajuster la date de fin pour inclure le dernier jour
                    end.setHours(23, 59, 59, 999);
                    
                    for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
                      // Éviter les weekends
                      const dayOfWeek = date.getDay();
                      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
                        const isoDate = date.toISOString().split('T')[0];
                        days.push({
                          date: isoDate,
                          morning: true,
                          afternoon: true
                        });
                        console.log(`➕ [DEBUG_DAYS] Jour ajouté: ${isoDate}`);
                      }
                    }
                  }
                });
                
                if (days.length > 0) {
                  console.log(`✅ [DEBUG_DAYS] ${days.length} jours générés à partir de metadata.periods:`, days);
                  return days;
                }
              }
            }
          }
        } catch (error) {
          console.error(`❌ [DEBUG_DAYS] Erreur lors du parsing du champ metadata:`, error);
        }
      }
    } catch (e) {
      console.log("❌ [DEBUG_DAYS] Erreur lors de l'accès à metadata:", e);
    }
    
    // Fallback: Si start_date et end_date sont disponibles, générer les jours de formation
    try {
      if ('start_date' in training && 'end_date' in training && training.start_date && training.end_date) {
        console.log(`🔍 [DEBUG_DAYS] Génération des jours à partir de start_date (${training.start_date}) et end_date (${training.end_date})`);
        
        // NOUVEAU: Logs des dates exactes pour le diagnostic
        console.log(`🔍 [DEBUG_DAYS] Valeurs exactes: start_date=${JSON.stringify(training.start_date)}, end_date=${JSON.stringify(training.end_date)}`);
        
        const start = new Date(training.start_date);
        const end = new Date(training.end_date);

        // Mise à minuit UTC pour une comparaison fiable des jours
        start.setUTCHours(0, 0, 0, 0);
        end.setUTCHours(0, 0, 0, 0); 

        // *** CORRECTION CLÉ ***
        // Ajouter 24 heures complètes à la date de fin pour s'assurer que le dernier jour est inclus
        // Le problème est que end_date pointe vers le début (00h) du dernier jour, donc nous avons besoin
        // d'ajouter une journée complète pour inclure toute la dernière journée
        const correctedEnd = new Date(end);
        correctedEnd.setUTCDate(correctedEnd.getUTCDate() + 1);
        
        console.log(`🔍 [DEBUG_DAYS] Date début UTC (00h): ${start.toISOString()}`);
        console.log(`🔍 [DEBUG_DAYS] Date fin UTC originale (00h): ${end.toISOString()}`);
        console.log(`🔍 [DEBUG_DAYS] Date fin UTC corrigée (+24h): ${correctedEnd.toISOString()}`);

        // Utiliser la date de fin corrigée dans la boucle
        for (let date = new Date(start); date <= correctedEnd; date.setDate(date.getDate() + 1)) {
          // Mettre la date courante à minuit UTC pour la comparaison et l'extraction de l'ISO date
          const currentDay = new Date(date); 
          currentDay.setUTCHours(0, 0, 0, 0); 
          
          const dayOfWeek = currentDay.getUTCDay(); // Utiliser getUTCDay() pour correspondre à setUTCHours
          
          console.log(`  -> Vérification jour: ${currentDay.toISOString().split('T')[0]}, Jour de la semaine (UTC): ${dayOfWeek} (0=Dim, 6=Sam)`);

          // Exclure Dimanche (0) et Samedi (6)
          if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            const isoDate = currentDay.toISOString().split('T')[0];
            // Vérifier si la date n'est pas déjà ajoutée (double sécurité)
            if (!days.some(d => d.date === isoDate)) {
                days.push({
                  date: isoDate,
                  morning: true,
                  afternoon: true
                });
                console.log(`     ✅ Jour ajouté: ${isoDate}`);
            } else {
                console.log(`     ⚠️ Jour déjà présent: ${isoDate}`);
            }
          } else {
            console.log(`     ❌ Jour ignoré (Weekend)`);
          }
        }
        
        if (days.length > 0) {
          console.log(`✅ [DEBUG_DAYS] ${days.length} jours générés à partir de start_date et end_date.`);
          console.log(`   -> Dates ISO générées: [${days.map(d => d.date).join(', ')}]`); 
          return days;
        }
      }
    } catch (e) {
      console.log("❌ [DEBUG_DAYS] Erreur lors de l'accès à start_date/end_date:", e);
    }
    
    // Si aucune source n'a fourni de jours, retourner un tableau vide
    if (days.length === 0) {
        console.log("⚠️ [DEBUG_DAYS] Aucune source de jours de formation trouvée (training_days, periods, metadata, start/end_date). Retourne un tableau vide.");
    }
    return days;
  };
  
  // Get all possible signature cells from training days
  const getAllPossibleCells = (): Array<{ date: string; period: 'morning' | 'afternoon' }> => {
    // Utiliser un Map pour garantir l'unicité des cellules par clé (date_period)
    const uniqueCellsMap = new Map<string, { date: string; period: 'morning' | 'afternoon' }>();
    
    console.log("🔍 [DEBUG_CELLS] Génération des cellules possibles");
    
    // Obtenir les jours de formation sans modifier l'objet training
    const trainingDays = debugTrainingDays();
    console.log(`🔍 [DEBUG_CELLS] ${trainingDays.length} jours de formation trouvés par debugTrainingDays`);
    
    // Générer les cellules à partir des jours de formation
    if (trainingDays.length > 0) {
      trainingDays.forEach(day => {
        if (day.morning) {
          const key = `${day.date}_morning`;
          if (!uniqueCellsMap.has(key)) {
              uniqueCellsMap.set(key, { date: day.date, period: 'morning' });
          }
        }
        
        if (day.afternoon) {
          const key = `${day.date}_afternoon`;
          if (!uniqueCellsMap.has(key)) {
              uniqueCellsMap.set(key, { date: day.date, period: 'afternoon' });
          }
        }
      });
    }
    
    // Convertir la Map en tableau
    const cells = Array.from(uniqueCellsMap.values());
    console.log(`🔍 [DEBUG_CELLS] ${cells.length} cellules uniques générées:`, cells);
    
    return cells;
  };

  // ***** NEW: Function to handle "Sign All" *****
  const handleSignAll = async (type: 'participant' | 'trainer') => {
    if (isSaving) return; // Prevent concurrent operations
    
    console.log(`🔍 [DEBUG_SIGN_ALL] Starting handleSignAll for ${type}`);
    console.log(`🔍 [DEBUG_SIGN_ALL] Training object:`, training);

    // Utiliser lastTrainerSignature pour le formateur au lieu de trainerSignatureFromProps
    const signatureUrl = type === 'participant' ? defaultSignature : lastTrainerSignature;
    const userId = type === 'participant' ? participant.id : 'trainer'; // Use 'trainer' identifier for trainer type

    console.log(`🔍 [DEBUG_SIGN_ALL] signatureUrl=${!!signatureUrl}`);

    if (!signatureUrl) {
      // Au lieu d'afficher une alerte, ouvrir directement la modale de signature
      console.log(`🖊️ [SIGN_ALL_${type.toUpperCase()}] Aucune signature par défaut trouvée, ouverture de la modale.`);
      setSaveSignatureGlobally(true);
      setCurrentSigningCell(null);
      setShowSignatureModal(true);
      return;
    }
    
    // S'assurer que signatureUrl est une chaîne avant de continuer
    if (typeof signatureUrl !== 'string') {
      console.error(`❌ [SIGN_ALL] signatureUrl n'est pas une chaîne valide:`, signatureUrl);
      alert("Signature invalide. Veuillez réessayer.");
      return;
    }

    setIsSaving(true);

    try {
      // Générer les cellules possibles (jours et périodes) qui doivent être signées
      // en utilisant notre fonction de déduplication
      const allPossibleCells = getAllPossibleCells();
      console.log(`🔍 [DEBUG_SIGN_ALL] ${allPossibleCells.length} cellules possibles:`, allPossibleCells);

      // Charger les signatures existantes avant de commencer
      console.log(`🔍 [DEBUG_SIGN_ALL] Chargement des signatures existantes...`);
      
      // 1. Charger les signatures du participant
      const { data: participantSigs, error: participantError } = await supabase
        .from('attendance_sheet_signatures')
        .select('date, period, signature_url')
        .eq('training_id', training.id)
        .eq('user_id', participant.id)
        .eq('signature_type', 'participant');
        
      // Créer un dictionnaire pour suivre les signatures existantes
      const existingParticipantSigs: {[key: string]: string} = {};
      
      if (participantError) {
        console.error(`❌ [SIGN_ALL] Erreur lors du chargement des signatures participant:`, participantError);
      } else if (participantSigs) {
        participantSigs.forEach(item => {
          const key = `${item.date}_${item.period}`;
          existingParticipantSigs[key] = item.signature_url;
        });
        
        console.log(`✅ [SIGN_ALL] ${participantSigs.length} signatures participant existantes trouvées`);
      }
      
      // 2. Charger les signatures du formateur
      const { data: trainerSigs, error: trainerError } = await supabase
        .from('attendance_sheet_signatures')
        .select('date, period, signature_url')
        .eq('training_id', training.id)
        .eq('signature_type', 'trainer');
      
      // Créer un dictionnaire pour suivre les signatures formateur existantes
      const existingTrainerSigs: {[key: string]: string} = {};
      
      if (trainerError) {
        console.error(`❌ [SIGN_ALL] Erreur lors du chargement des signatures formateur:`, trainerError);
      } else if (trainerSigs) {
        trainerSigs.forEach(item => {
          const key = `${item.date}_${item.period}`;
          existingTrainerSigs[key] = item.signature_url;
        });
        
        console.log(`✅ [SIGN_ALL] ${trainerSigs.length} signatures formateur existantes trouvées`);
      }

      // Filtrer pour ne garder que les cellules non signées
      const signedSigs = type === 'participant' ? existingParticipantSigs : existingTrainerSigs;
      const unsignedCells = allPossibleCells.filter(cell => {
        const key = `${cell.date}_${cell.period}`;
        return !signedSigs[key]; // Garder uniquement celles qui ne sont pas signées
      });
      
      console.log(`🔍 [DEBUG_SIGN_ALL] ${unsignedCells.length} cellules non signées à traiter:`, unsignedCells);
      
      if (unsignedCells.length === 0) {
        console.log(`ℹ️ [SIGN_ALL] Toutes les cellules sont déjà signées pour ${type}`);
        alert("Toutes les cases sont déjà signées.");
        setIsSaving(false);
        return;
      }
      
      console.log(`🖊️ [SIGN_ALL_${type.toUpperCase()}] Signature de ${unsignedCells.length} cellules...`);
      
      // Signer toutes les cellules non signées
      const results = await Promise.allSettled(
        unsignedCells.map(cell => 
          upsertAttendanceSignature(cell.date, cell.period, userId, type, signatureUrl)
        )
      );
      
      const successfulSigns = unsignedCells.filter((_, index) => 
        results[index].status === 'fulfilled' && 
        (results[index] as PromiseFulfilledResult<boolean>).value
      );
      
      console.log(`✅ [SIGN_ALL] ${successfulSigns.length} cellules signées avec succès`);
      
      // *** AMÉLIORATION CLÉ 1: Rechargement plus robuste des signatures ***
      console.log(`🔄 [SIGN_ALL] Rechargement complet des signatures après signature massive...`);
      
      // Forcer un délai pour s'assurer que la DB a bien traité toutes les signatures
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Charger TOUTES les signatures participant pour cette formation
      const { data: refreshedSigs, error: refreshError } = await supabase
        .from('attendance_sheet_signatures')
        .select('*') // Sélectionner tous les champs pour un maximum d'informations
        .eq('training_id', training.id)
        .eq('user_id', participant.id)
        .eq('signature_type', 'participant');
          
      if (refreshError) {
        console.error(`❌ [SIGN_ALL] Erreur lors du rechargement des signatures:`, refreshError);
      } else if (refreshedSigs) {
        console.log(`✅ [SIGN_ALL] ${refreshedSigs.length} signatures participant rechargées:`, refreshedSigs);
        
        // *** AMÉLIORATION CLÉ 2: Reconstruire complètement les structures de données ***
        if (type === 'participant') {
          // Construire un nouveau dictionnaire de signatures participant
          const newParticipantSignatures: {[key: string]: string} = {};
          const newSignedCells: Array<{date: string; period: 'morning' | 'afternoon'}> = [];
          
          // Traiter chaque signature rechargée
          refreshedSigs.forEach(sig => {
            const key = `${sig.date}_${sig.period}`;
            
            // Ajouter au dictionnaire des signatures
            if (sig.signature_url) {
              newParticipantSignatures[key] = sig.signature_url;
              console.log(`🔍 [DEBUG_SIGN_ALL] Ajout signature '${key}': ${sig.signature_url.substring(0, 30)}...`);
            }
            
            // Ajouter aux cellules signées
            newSignedCells.push({date: sig.date, period: sig.period as 'morning' | 'afternoon'});
          });
          
          // Log des détails de ce qui va être mis à jour
          console.log(`🔄 [SIGN_ALL] Mise à jour participantSignatures avec ${Object.keys(newParticipantSignatures).length} signatures`);
          console.log(`🔄 [SIGN_ALL] Mise à jour signedCells avec ${newSignedCells.length} cellules`);
          
          // Appliquer les états
          setParticipantSignatures(newParticipantSignatures);
          setSignedCells(newSignedCells);
          
          // Log immédiat APRÈS les setState pour diagnostic
          console.log(`🔄 [SIGN_ALL_POST_SET] participantSignatures après mise à jour:`, {...newParticipantSignatures});
          console.log(`🔄 [SIGN_ALL_POST_SET] signedCells après mise à jour:`, [...newSignedCells]);
          console.log(`🔄 [SIGN_ALL_POST_SET] Clés disponibles: ${Object.keys(newParticipantSignatures).join(', ')}`);
        }
      }
      
      // Si c'est le formateur, charger aussi ses signatures
      if (type === 'trainer') {
        const { data: refreshedTrainerSigs, error: refreshTrainerError } = await supabase
          .from('attendance_sheet_signatures')
          .select('*')
          .eq('training_id', training.id)
          .eq('signature_type', 'trainer');
          
        if (refreshTrainerError) {
          console.error(`❌ [SIGN_ALL] Erreur lors du rechargement des signatures formateur:`, refreshTrainerError);
        } else if (refreshedTrainerSigs && refreshedTrainerSigs.length > 0) {
          // Construire un nouveau dictionnaire de signatures formateur
          const newTrainerSignatures: {[key: string]: string} = {};
          
          // Traiter chaque signature rechargée
          refreshedTrainerSigs.forEach(sig => {
            const key = `${sig.date}_${sig.period}`;
            if (sig.signature_url) {
              newTrainerSignatures[key] = sig.signature_url;
            }
          });
          
          console.log(`🔄 [SIGN_ALL] Mise à jour trainerSignatures avec ${Object.keys(newTrainerSignatures).length} signatures`);
          setTrainerSignatures(newTrainerSignatures);
          console.log(`🔄 [SIGN_ALL_POST_SET] trainerSignatures après mise à jour:`, {...newTrainerSignatures});
        }
      }
      
      // *** AMÉLIORATION CLÉ 3: Forcer un re-rendu complet ***
      // Forcer une mise à jour de l'état de manière complète avec un nouvel objet
      if (successfulSigns.length > 0) {
        // Cette étape CRITIQUE garantit que le composant détecte le changement d'état
        setParticipantSignatures(prevState => ({...prevState}));
        setSignedCells(prevState => [...prevState]);
        
        // Message de succès
        alert(`Toutes les ${successfulSigns.length} cases ont été signées avec succès.`);
      } else {
        alert("Aucune nouvelle signature n'a été ajoutée.");
      }
      
    } catch (error) {
      console.error(`💥 [SIGN_ALL] Erreur dans handleSignAll:`, error);
      alert("Une erreur s'est produite lors de la signature. Veuillez réessayer.");
    } finally {
      setIsSaving(false);
    }
  };

  // Function to sign a specific cell with participant or trainer signature
  const signCell = async (date: string, period: 'morning' | 'afternoon', type: 'participant' | 'trainer') => {
    console.log(`🔍 [SIGN_CELL] Signing cell for ${date} ${period} as ${type}`);
    try {
      // Determine signature URL based on type
      let signatureUrl: string | null = null;
      if (type === 'participant') {
        // CORRECTION LINTER: Handle undefined case explicitly
        signatureUrl = participantSignatureFromProps ?? null;
      } else if (type === 'trainer') {
        // CORRECTION LINTER: Handle undefined case explicitly
        signatureUrl = lastTrainerSignature ?? trainerSignatureFromProps ?? null;
      }

      // If no signature URL is available, return failure
      if (!signatureUrl) {
        console.error(`❌ [SIGN_CELL] No ${type} signature URL available`);
        return { success: false, message: `No ${type} signature URL available` };
      }

      // Use Supabase to upsert the signature
      const { data, error } = await supabase
        .from('attendance_sheet_signatures')
        .upsert({
          training_id: training?.id,
          // CORRECTION LINTER: Use participant.id instead of non-existent training.participantId
          user_id: type === 'participant' ? participant.id : 'trainer', // Use 'trainer' identifier for trainer
          date,
          period,
          signature_url: signatureUrl,
          signature_type: type,
        });

      if (error) {
        console.error(`❌ [SIGN_CELL] Error upserting ${type} signature:`, error);
        return { success: false, message: error.message };
      }

      console.log(`✅ [SIGN_CELL] Successfully signed cell for ${date} ${period} as ${type}`);
      return { success: true, data };
    } catch (error: any) {
      console.error(`❌ [SIGN_CELL] Exception during signature:`, error);
      return { success: false, message: error.message };
    }
  };

  // Fonction qui construit le template du document
  const renderTemplate = ({ 
    participantSignature: partSig, 
    representativeSignature, 
    trainerSignature: trainerSig,
    companySeal,
    organizationSeal,
    // AJOUT: Prop pour indiquer le contexte de rendu (PDF ou web)
    isPdfGeneration = false 
  }: { 
    participantSignature: string | null; 
    representativeSignature: string | null; 
    trainerSignature: string | null;
    companySeal: string | null;
    organizationSeal: string | null;
    isPdfGeneration?: boolean; // Rendre optionnel pour compatibilité
  }) => {
    // >>> LOG DE DIAGNOSTIC AMÉLIORÉ <<<
    console.log('🔬 [RENDER_TEMPLATE] Rendu du template avec les données suivantes:');
    console.log('  Participant Signature Prop:', partSig ? partSig.substring(0, 30) + '...' : 'null');
    console.log('  Trainer Signature Prop:', trainerSig ? trainerSig.substring(0, 30) + '...' : 'null');
    console.log(`  Nombre de signatures participant par cellule: ${Object.keys(participantSignatures).length}`);
    console.log(`  Nombre de signatures formateur par cellule: ${Object.keys(trainerSignatures).length}`);
    console.log(`  Nombre de cellules signées (participant): ${signedCells.length}`);
    console.log(`  Contexte PDF: ${isPdfGeneration}`); // Log de la nouvelle prop

    // >>> NOUVEAU LOG CIBLÉ sur 2025-04-25 <<<
    const targetDate = '2025-04-25';
    console.log(`🎯 [RENDER_TEMPLATE_CHECK_${targetDate}] Vérification des données passées pour ${targetDate}:`);
    console.log(`   -> Clé matin dans participantSignatures ('${targetDate}_morning'):`, 
                 participantSignatures.hasOwnProperty(`${targetDate}_morning`), 
                 participantSignatures[`${targetDate}_morning`]?.substring(0, 30) + '...');
    console.log(`   -> Clé après-midi dans participantSignatures ('${targetDate}_afternoon'):`, 
                 participantSignatures.hasOwnProperty(`${targetDate}_afternoon`), 
                 participantSignatures[`${targetDate}_afternoon`]?.substring(0, 30) + '...');
    console.log(`   -> Objet matin dans signedCells ({date: '${targetDate}', period: 'morning'}):`, 
                 signedCells.some(cell => cell.date === targetDate && cell.period === 'morning'));
    console.log(`   -> Objet après-midi dans signedCells ({date: '${targetDate}', period: 'afternoon'}):`, 
                 signedCells.some(cell => cell.date === targetDate && cell.period === 'afternoon'));
    // >>> FIN NOUVEAU LOG CIBLÉ <<<

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
        isSigningEnabled={isSigningEnabled && !isSaving}
        onSignAll={handleSignAll}
        isSaving={isSaving}
        // Passer la prop au template
        isPdfGeneration={isPdfGeneration} 
      />
    );
  };

  return (
    <>
      {/* Diagnostic pour vérifier la valeur de participantSignature */}
      {(() => {
        console.log('DIAGNOSTIC GENERIC ATTENDANCE SHEET:', {
          participantSignatureExists: !!participantSignatureFromProps,
          participantSignatureValue: participantSignatureValue ? 'chargé' : 'non chargé',
          hasSomeSignatures: Object.keys(participantSignatures).length > 0
        });
        return null;
      })()}
      
      <DocumentWithSignatures
        documentType={DocumentType.ATTENDANCE_SHEET}
        trainingId={training.id}
        participantId={participant.id}
        participantName={participantName}
        viewContext={viewContext}
        onCancel={onCancel}
        onDocumentOpen={onDocumentOpen}
        onDocumentClose={onDocumentClose}
        renderTemplate={renderTemplate}
        documentTitle="Feuille d'émargement"
        hideSignButton={true}
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
                    handleSignatureCreated(dataURL);
                  }
                }}
                onCancel={() => {
                  setShowSignatureModal(false);
                  setCurrentSigningCell(null);
                }}
                signatureType={viewContext === 'crm' ? 'trainer' : 'participant'}
                initialName={viewContext === 'crm' ? training.trainer_name || 'Formateur' : `${participant.first_name} ${participant.last_name}`}
              />
              
              <div className="mt-4 flex items-center">
                <input
                  type="checkbox"
                  id="save-signature-globally"
                  checked={saveSignatureGlobally}
                  onChange={(e) => setSaveSignatureGlobally(e.target.checked)}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label htmlFor="save-signature-globally" className="ml-2 block text-sm text-gray-900">
                  Enregistrer comme signature par défaut
                </label>
              </div>

              <p className="text-xs text-gray-500 mt-3">
                Utilisez votre souris ou votre doigt pour dessiner votre signature.
                {saveSignatureGlobally && " Cette signature sera utilisée pour les prochaines cases."}
                {!saveSignatureGlobally && " Cette signature ne sera utilisée que pour cette case."}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}; 