import { DocumentManager } from './DocumentManager';
import { supabase } from '../../lib/supabase';
import { DocumentType, SignatureType, SignatureMetadata, SignatureSet } from '../../types/SignatureTypes';
import { addCacheBuster, optimizeSealUrl } from '../../utils/SignatureUtils';
import { Session } from '@supabase/supabase-js';

/**
 * Interface définissant les exigences de signature pour un document
 */
export interface SignatureRequirements {
  // Types de signatures requises pour le document
  requiredSignatures: Array<SignatureType>;
  
  // Types de signatures optionnelles pour le document
  optionalSignatures?: Array<SignatureType>;
  
  // Ordre spécifique des signatures (ex: le formateur doit signer avant l'apprenant)
  signatureOrder?: Array<SignatureType>;
  
  // Message personnalisé affiché à l'utilisateur en attente de signature
  pendingSignatureMessage?: string;
}

/**
 * Configuration des signatures pour chaque type de document
 * Utilise les enums importés DocumentType et SignatureType
 */
export const DOCUMENT_SIGNATURE_CONFIG: Record<DocumentType, SignatureRequirements> = {
  [DocumentType.CONVENTION]: { requiredSignatures: [SignatureType.REPRESENTATIVE, SignatureType.TRAINER, SignatureType.ORGANIZATION_SEAL, SignatureType.COMPANY_SEAL], optionalSignatures: [] },
  [DocumentType.ATTESTATION]: { requiredSignatures: [SignatureType.TRAINER], optionalSignatures: [] }, // Attestation: Seulement formateur
  [DocumentType.ATTENDANCE_SHEET]: { requiredSignatures: [SignatureType.TRAINER, SignatureType.PARTICIPANT], optionalSignatures: [] }, // Feuille émargement: Formateur + Participant
  [DocumentType.COMPLETION_CERTIFICATE]: { requiredSignatures: [SignatureType.TRAINER, SignatureType.ORGANIZATION_SEAL], optionalSignatures: [] }, // Certificat Réalisation: Formateur + Tampon Orga
  [DocumentType.CERTIFICATE]: { requiredSignatures: [SignatureType.TRAINER, SignatureType.ORGANIZATION_SEAL], optionalSignatures: [] }, // Certificat Assiduité: Formateur + Tampon Orga
  [DocumentType.DEVIS]: { requiredSignatures: [SignatureType.REPRESENTATIVE], optionalSignatures: [SignatureType.PARTICIPANT], signatureOrder: [SignatureType.REPRESENTATIVE, SignatureType.PARTICIPANT] },
  [DocumentType.FACTURE]: { requiredSignatures: [], optionalSignatures: [SignatureType.ORGANIZATION_SEAL] },
  [DocumentType.PROGRAMME]: { requiredSignatures: [], optionalSignatures: [SignatureType.ORGANIZATION_SEAL] },
  [DocumentType.AUTRE]: { requiredSignatures: [], optionalSignatures: [SignatureType.ORGANIZATION_SEAL, SignatureType.COMPANY_SEAL, SignatureType.PARTICIPANT, SignatureType.REPRESENTATIVE, SignatureType.TRAINER] }
};

/**
 * Gestionnaire générique pour les signatures de documents
 * 
 * Cette classe fournit toutes les fonctionnalités nécessaires pour gérer les signatures
 * sur n'importe quel type de document, avec une logique cohérente pour tous.
 */
export class DocumentSignatureManager {
  private documentType: DocumentType;
  private trainingId: string;
  private participantId: string;
  private participantName?: string;
  private companyId?: string;
  private viewContext: 'crm' | 'student';
  private documentId: string = '';
  private signatures: SignatureSet = {
    participant: undefined,
    representative: undefined,
    trainer: undefined,
    companySeal: undefined,
    organizationSeal: undefined,
  };
  private signaturesLoaded: boolean = false;
  private isLoading: boolean = false;
  private disableAutoLoad: boolean = false;
  private needStamp: boolean = false;
  private onSignatureChange: (type: SignatureType, signature: string | null) => void;
  private id: string;

  /**
   * Constructeur du gestionnaire de signatures
   * 
   * @param documentType Type du document (convention, attestation, etc.)
   * @param trainingId ID de la formation
   * @param participantId ID de l'utilisateur (apprenant)
   * @param participantName Nom de l'utilisateur (apprenant) - optionnel
   * @param viewContext Contexte de vue ('crm' ou 'student')
   * @param onSignatureChange Callback appelé quand une signature change
   */
  constructor(
    documentType: DocumentType,
    trainingId: string,
    participantId: string,
    participantName: string = '',
    viewContext: 'crm' | 'student' = 'crm',
    onSignatureChange: (type: SignatureType, signature: string | null) => void = () => {}
  ) {
    this.documentType = documentType;
    this.trainingId = trainingId;
    this.participantId = participantId;
    this.participantName = participantName;
    this.viewContext = viewContext;
    this.onSignatureChange = onSignatureChange;
    this.disableAutoLoad = false;
    this.signatures = { participant: undefined, representative: undefined, trainer: undefined, companySeal: undefined, organizationSeal: undefined };
    this.id = `dsm-instance-${Math.random().toString(36).substring(2, 9)}`; // Donner un ID à l'instance
    
    // Ajouter l'écouteur d'événement
    document.addEventListener('save-signature', this.handleSaveEvent);
    console.log(`[DSM Constructor ${this.id}] Écouteur d'événement 'save-signature' ajouté.`);

    // Initialiser needStamp à true si c'est une convention
    this.needStamp = documentType === DocumentType.CONVENTION;
  }

  // Ajouter une méthode pour retirer l'écouteur
  public destroy(): void {
    document.removeEventListener('save-signature', this.handleSaveEvent);
    console.log(`[DSM Destroy ${this.id}] Écouteur d'événement 'save-signature' retiré.`);
  }

  // Ajouter la méthode pour gérer l'événement
  private handleSaveEvent = (event: Event): void => {
    // Vérifier si c'est bien un CustomEvent avec les bonnes données
    if (event instanceof CustomEvent && event.detail) {
      const { dataURL, signatureType } = event.detail;
      
      // Optionnel: Vérifier si l'événement est destiné à CETTE instance 
      // (si on avait passé this.id dans l'event detail, on pourrait filtrer ici)
      console.log(`[DSM Event Handler ${this.id}] Événement 'save-signature' reçu pour type: ${signatureType}`);

      if (dataURL && signatureType && Object.values(SignatureType).includes(signatureType)) {
        // Appeler la méthode de sauvegarde interne
        this.saveSignature(dataURL, signatureType)
          .then(url => {
            console.log(`[DSM Event Handler ${this.id}] Sauvegarde via événement réussie pour ${signatureType}. URL: ${url?.substring(0,30)}...`);
            // La mise à jour de l'état local se fait déjà dans saveSignature via onSignatureChange
          })
          .catch(err => {
            console.error(`[DSM Event Handler ${this.id}] Erreur lors de la sauvegarde via événement pour ${signatureType}:`, err);
            // Gérer l'erreur si nécessaire (ex: afficher un message)
          });
      } else {
        console.warn(`[DSM Event Handler ${this.id}] Événement 'save-signature' reçu avec données invalides ou type inconnu:`, event.detail);
      }
    } else {
       console.warn(`[DSM Event Handler ${this.id}] Événement reçu n'est pas un CustomEvent attendu:`, event);
    }
  }

  /**
   * Initialise le gestionnaire en chargeant les signatures existantes
   */
  async initialize(): Promise<void> {
    await this.loadExistingSignatures();
  }

  /**
   * Vérifie si un document peut être signé par un utilisateur spécifique
   * 
   * @param signerType Type de signataire (participant, representative, trainer)
   * @returns Un objet indiquant si l'utilisateur peut signer et pourquoi
   */
  canSign(signerType: SignatureType): { canSign: boolean; message?: string } {
    // S'assurer que les signatures sont chargées
    if (!this.signaturesLoaded) {
      return { canSign: false, message: "Chargement des signatures en cours..." };
    }

    // Récupérer la configuration pour ce type de document
    const config = DOCUMENT_SIGNATURE_CONFIG[this.documentType];
    if (!config) {
      return { canSign: false, message: "Type de document non reconnu" };
    }

    // Vérifier si le type de signature est requis pour ce document
    if (!config.requiredSignatures.includes(signerType)) {
      return { canSign: false, message: "Votre signature n'est pas requise pour ce document" };
    }

    // Si on est en CRM et que c'est une signature de formateur sur une convention, toujours autoriser
    if (this.viewContext === 'crm' && signerType === SignatureType.TRAINER && 
        this.documentType === DocumentType.CONVENTION) {
      return { canSign: true };
    }

    // Si un ordre de signature est spécifié, vérifier qu'il est respecté
    if (config.signatureOrder) {
      const currentIndex = config.signatureOrder.indexOf(signerType);
      
      // Si nous ne sommes pas le premier à signer, vérifier que les précédents ont signé
      if (currentIndex > 0) {
        const previousSigners = config.signatureOrder.slice(0, currentIndex);
        
        for (const signer of previousSigners) {
          if (this.signatures[signer as SignatureType] === undefined) {
            return { 
              canSign: false, 
              message: config.pendingSignatureMessage || "En attente d'autres signatures"
            };
          }
        }
      }
    }

    // Vérifier si cette personne a déjà signé
    // Exception pour le formateur qui peut toujours re-signer
    if (this.signatures[signerType] !== undefined && !(this.viewContext === 'crm' && signerType === SignatureType.TRAINER)) {
      return { canSign: false, message: "Vous avez déjà signé ce document" };
    }

    return { canSign: true };
  }

  /**
   * Sauvegarde une signature ou un tampon
   * 
   * @param signature - L'image de la signature/tampon en format dataURL
   * @param signerType - Le type de signature/tampon
   * @returns URL de la signature/tampon enregistrée
   */
  async saveSignature(signature: string, signerType: SignatureType): Promise<string> {
    try {
      console.log(`🔍 [DEBUG_SUPABASE] Début de saveSignature dans DocumentSignatureManager pour: ${signerType}`);
      
      // Vérifier que l'utilisateur est connecté
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.log(`❌ [DEBUG_SUPABASE] Utilisateur non authentifié lors de saveSignature`);
        throw new Error("Non authentifié");
      }

      // Vérifier que la signature existe
      if (!signature) {
        throw new Error("La signature est vide");
      }

      console.log(`🔍 [DEBUG_SUPABASE] Taille de la signature: ${signature.length} caractères`);
      
      // Extraction de la partie données du format base64
      let base64Data = signature;
      if (signature.includes('base64,')) {
        base64Data = signature.split('base64,')[1];
        console.log(`🔍 [DEBUG_SUPABASE] Extraction de la partie base64 (${base64Data.length} caractères)`);
      }
      
      // Convertir base64 en Blob
      const byteCharacters = atob(base64Data);
      const byteArrays = [];
      for (let offset = 0; offset < byteCharacters.length; offset += 512) {
        const slice = byteCharacters.slice(offset, offset + 512);
        const byteNumbers = new Array(slice.length);
        for (let i = 0; i < slice.length; i++) {
          byteNumbers[i] = slice.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        byteArrays.push(byteArray);
      }
      const blob = new Blob(byteArrays, { type: 'image/png' });
      
      // Calculer un nom de fichier unique
      const filename = `${signerType}_${this.documentType}_${Date.now()}.png`;
      
      // Préparer le chemin du fichier
      const filePath = `${filename}`;
      console.log(`🔍 [DEBUG_SUPABASE] Nom de fichier généré: ${filePath}`);
      
      // Upload vers le bucket de signatures
      console.log(`🔍 [DEBUG_SUPABASE] Début du chargement vers le bucket 'signatures'`);
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('signatures')
        .upload(filePath, blob, { contentType: 'image/png', upsert: true });
      
      if (uploadError) {
        console.error('❌ [DEBUG_SUPABASE] Erreur lors de l\'upload:', uploadError);
        throw new Error(`Erreur lors de l'upload: ${uploadError.message}`);
      }
      
      console.log(`✅ [DEBUG_SUPABASE] Chargement terminé:`, uploadData);
      
      // Générer l'URL publique
      const { data: urlData } = await supabase.storage
        .from('signatures')
        .getPublicUrl(filePath);
      
      const publicUrl = urlData?.publicUrl || '';
      console.log(`🔍 [DEBUG_SUPABASE] URL publique générée:`, publicUrl);
      
      // FIXE CRITIQUE: Pour les formateurs et représentants, ne pas associer à un utilisateur spécifique
      // mais plutôt au niveau de la formation
      const isTrainerOrRepresentative = signerType === SignatureType.TRAINER || signerType === SignatureType.REPRESENTATIVE;
      const userId = isTrainerOrRepresentative ? undefined : this.participantId;
      
      console.log(`🔍 [DEBUG_SUPABASE] Enregistrement dans la base de données:`, {
        url: publicUrl,
        documentType: this.documentType,
        training_id: this.trainingId,
        user_id: userId, // Undefined pour formateur/représentant
        created_by: session.user.id,
        type: signerType,
        isTrainerOrRepresentative
      });
      
      // Déterminer le titre en fonction du type de signature
      let title = "";
      if (signerType === SignatureType.PARTICIPANT) {
        title = "Signature de l'apprenant";
      } else if (signerType === SignatureType.REPRESENTATIVE) {
        title = "Signature du représentant";
      } else if (signerType === SignatureType.TRAINER) {
        title = "Signature du formateur";
      } else if (signerType === SignatureType.COMPANY_SEAL) {
        title = "Tampon de l'entreprise";
      } else if (signerType === SignatureType.ORGANIZATION_SEAL) {
        title = "Tampon de l'organisme de formation";
      } else {
        title = "Signature";
      }
      
      console.log('🔍 [DEBUG_SUPABASE] Insertion directe dans la base de données:', title);
      
      // Convertir le type de document pour la base de données si nécessaire
      let dbDocumentType = this.documentType as 'convention' | 'attestation' | 'emargement';
      if (dbDocumentType === 'emargement') {
        dbDocumentType = 'attestation'; // Conversion pour respecter la contrainte documents_type_check
      }
      
      // @ts-ignore
      const { data: insertData, error: insertError } = await supabase
        .from('documents')
        .insert([
          {
            training_id: this.trainingId,
            user_id: userId,
            file_url: publicUrl,
            type: dbDocumentType,
            title: title,
            created_by: session.user.id
          }
        ]);
        
      if (insertError) {
        console.error('❌ [DEBUG_SUPABASE] Erreur lors de l\'insertion directe:', insertError);
        throw new Error(`Erreur lors de l'insertion: ${insertError.message}`);
      }
      
      console.log('✅ [DEBUG_SUPABASE] Document inséré avec succès directement dans la base');
      console.log(`✅ [DEBUG_SUPABASE] Fin de saveSignature - Succès pour ${signerType}:`, publicUrl);
      
      // Met à jour l'état local SI la signature correspond à ce manager
      if (signerType === SignatureType.PARTICIPANT && this.participantId === session.user.id) {
        this.signatures.participant = publicUrl;
      } else if (signerType === SignatureType.REPRESENTATIVE) {
        // Devra être rechargé via loadExistingSignatures pour affecter le bon manager
      } else if (signerType === SignatureType.TRAINER) {
        this.signatures.trainer = publicUrl;
      } else if (signerType === SignatureType.COMPANY_SEAL) {
        // Devra être rechargé
      } else if (signerType === SignatureType.ORGANIZATION_SEAL) {
        this.signatures.organizationSeal = publicUrl;
      }
      
      return publicUrl;
    } catch (error) {
      console.error(`❌ [DEBUG_SUPABASE] Erreur dans saveSignature:`, error);
      throw error;
    }
  }

  /**
   * Sauvegarde le document PDF final avec toutes les signatures
   * 
   * @param pdfBlob Blob du document PDF généré
   * @returns URL du document sauvegardé
   */
  async saveDocument(pdfBlob: Blob): Promise<string> {
    try {
      // Vérifier si l'utilisateur est authentifié
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Vous devez être connecté pour enregistrer le document");
      }

      // Convertir le type de document pour la base de données si nécessaire
      let dbDocumentType = this.documentType as 'convention' | 'attestation' | 'emargement';
      if (dbDocumentType === 'emargement') {
        dbDocumentType = 'attestation'; // Conversion pour respecter la contrainte documents_type_check
      }

      // Sauvegarder le document via DocumentManager
      const documentUrl = await DocumentManager.saveDocument(
        pdfBlob,
        {
          training_id: this.trainingId,
          user_id: this.participantId,
          created_by: session.user.id,
          type: dbDocumentType,
          participant_name: this.participantName || ''
        }
      );

      return documentUrl;
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du document:', error);
      throw error;
    }
  }

  /**
   * Charge TOUTES les signatures existantes pertinentes depuis la base de données
   * en fonction du contexte (CRM/Student) et du type de document.
   */
  async loadExistingSignatures(): Promise<void> {
    // Si les signatures sont déjà chargées, ne rien faire
    if (this.signaturesLoaded || this.disableAutoLoad) {
      console.log('🔄 [DSM_LOAD] Chargement ignoré (déjà chargé ou désactivé).');
      return;
    }

    console.log(`⏳ [DSM_LOAD] Début chargement signatures pour doc: ${this.documentType}, training: ${this.trainingId}, user: ${this.participantId}, context: ${this.viewContext}`);
    this.isLoading = true;

    try {
      // 1. Charger les signatures requises et optionnelles définies dans la config
      const config = DOCUMENT_SIGNATURE_CONFIG[this.documentType];
      const allSignatureTypes = [
        ...(config?.requiredSignatures || []),
        ...(config?.optionalSignatures || [])
      ];
      
      // Filtrer les doublons
      const uniqueSignatureTypes = [...new Set(allSignatureTypes)];
      
      console.log(`🔍 [DSM_LOAD] Types de signatures à charger: ${uniqueSignatureTypes.join(', ')}`);

      // 2. Charger chaque type de signature
      for (const type of uniqueSignatureTypes) {
        // Sauter le tampon organisme, il sera chargé séparément
        if (type === SignatureType.ORGANIZATION_SEAL) continue;
        
        console.log(`  -> [DSM_LOAD] Chargement type: ${type}`);
        const signatureUrl = await this.loadSignature(type);
        console.log(`  <- [DSM_LOAD] Résultat pour ${type}: ${signatureUrl ? 'Trouvé' : 'Non trouvé'}`);
        if (signatureUrl) {
          this.signatures[type] = signatureUrl; // Mettre à jour l'état interne
          this.onSignatureChange(type, signatureUrl); // Notifier le changement
        }
      }

      // 3. Charger spécifiquement le tampon d'organisme (s'il est requis ou optionnel)
      if (uniqueSignatureTypes.includes(SignatureType.ORGANIZATION_SEAL)) {
         console.log(`  -> [DSM_LOAD] Chargement spécifique du tampon organisme...`);
         await this.ensureOrganizationSealIsLoaded();
         console.log(`  <- [DSM_LOAD] Résultat tampon organisme: ${this.signatures.organizationSeal ? 'Trouvé' : 'Non trouvé'}`);
      }
      
      // 4. Marquer comme chargé
      this.signaturesLoaded = true;
      console.log(`✅ [DSM_LOAD] Chargement terminé. Signatures trouvées:`, {
        participant: !!this.signatures.participant,
        representative: !!this.signatures.representative,
        trainer: !!this.signatures.trainer,
        companySeal: !!this.signatures.companySeal,
        organizationSeal: !!this.signatures.organizationSeal
      });
      
      // >>> LOG AJOUTÉ ICI <<<
      console.log(`    🏁 [DSM_LOAD_FINAL_STATE] État signature participant après chargement: ${this.signatures.participant ? this.signatures.participant.substring(0,30)+'...' : 'undefined'}`);
      
      // Vérifier si needStamp doit être mis à jour après chargement
      await this.loadDocument(); // Assure que documentId et needStamp sont à jour

    } catch (error) {
      console.error('❌ [DSM_LOAD] Erreur lors du chargement des signatures:', error);
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Méthode pour s'assurer que toutes les signatures sont chargées,
   * quelle que soit la vue (apprenant ou formateur)
   */
  private async ensureAllSignaturesAreLoaded(): Promise<void> {
    console.log('🧩 [DIAGNOSTIC] Vérification finale pour s\'assurer que toutes les signatures sont chargées');
    
    // 1. Vérifier la signature du participant
    if (!this.signatures.participant) {
      console.log('🧩 [DIAGNOSTIC] Tentative supplémentaire de chargement de la signature participant');
      try {
        // Rechercher globalement pour cet utilisateur
        const { data, error } = await supabase
          .from('documents')
          .select('file_url')
          .eq('user_id', this.participantId)
          .eq('title', 'Signature du participant')
          .eq('type', this.documentType)
          .order('created_at', { ascending: false })
          .limit(1);
          
        if (!error && data && data.length > 0 && data[0].file_url) {
          this.signatures.participant = data[0].file_url;
          console.log('🧩 [DIAGNOSTIC] Signature du participant trouvée lors de la vérification finale:', this.signatures.participant);
        }
      } catch (error) {
        console.error('🧩 [DIAGNOSTIC] Erreur lors de la vérification finale de la signature participant:', error);
      }
    }
    
    // 2. Vérifier la signature du formateur
    if (!this.signatures.trainer) {
      console.log('🧩 [DIAGNOSTIC] Tentative supplémentaire de chargement de la signature formateur');
      try {
        // Rechercher globalement
        const { data, error } = await supabase
          .from('documents')
          .select('file_url')
          .eq('title', 'Signature du formateur')
          .eq('type', this.documentType)
          .order('created_at', { ascending: false })
          .limit(1);
          
        if (!error && data && data.length > 0 && data[0].file_url) {
          this.signatures.trainer = data[0].file_url;
          console.log('🧩 [DIAGNOSTIC] Signature du formateur trouvée lors de la vérification finale:', this.signatures.trainer);
        }
      } catch (error) {
        console.error('🧩 [DIAGNOSTIC] Erreur lors de la vérification finale de la signature formateur:', error);
      }
    }
    
    // 3. Vérifier la signature du représentant
    if (!this.signatures.representative) {
      console.log('🧩 [DIAGNOSTIC] Tentative supplémentaire de chargement de la signature représentant');
      try {
        // Rechercher globalement
        const { data, error } = await supabase
          .from('documents')
          .select('file_url')
          .eq('title', 'Signature du représentant')
          .eq('type', this.documentType)
          .order('created_at', { ascending: false })
          .limit(1);
          
        if (!error && data && data.length > 0 && data[0].file_url) {
          this.signatures.representative = data[0].file_url;
          console.log('🧩 [DIAGNOSTIC] Signature du représentant trouvée lors de la vérification finale:', this.signatures.representative);
        }
      } catch (error) {
        console.error('🧩 [DIAGNOSTIC] Erreur lors de la vérification finale de la signature représentant:', error);
      }
    }
    
    // 4. Vérifier le tampon d'organisation si nécessaire
    if (!this.signatures.organizationSeal && this.needStamp && this.documentType === DocumentType.CONVENTION) {
      console.log('🧩 [DIAGNOSTIC] Tentative supplémentaire de chargement du tampon d\'organisation');
      await this.ensureOrganizationSealIsLoaded();
    }
  }

  /**
   * Vérifie et corrige les signatures pour éviter les confusions entre types
   */
  private verifySignatures(): void {
    console.log('🔧 [CORRECTION] Vérification des signatures pour éviter les confusions');
    
    // Vérifier si le tampon de l'entreprise contient une référence à une signature d'apprenant
    if (this.signatures.companySeal && 
        this.signatures.companySeal.includes('participant_convention')) {
      console.error('🔧 [CORRECTION] Tampon d\'entreprise détecté comme signature de participant, correction...');
      this.signatures.companySeal = undefined;
    }
    
    // Vérifier si le tampon de l'organisme contient une référence à une signature d'apprenant
    if (this.signatures.organizationSeal && 
        this.signatures.organizationSeal.includes('participant_convention')) {
      console.error('🔧 [CORRECTION] Tampon d\'organisme détecté comme signature de participant, correction...');
      this.signatures.organizationSeal = undefined;
    }
    
    // Vérifier si la signature du formateur contient une référence à une signature d'apprenant
    if (this.signatures.trainer && 
        this.signatures.trainer.includes('participant_convention')) {
      console.error('🔧 [CORRECTION] Signature de formateur détectée comme signature de participant, correction...');
      this.signatures.trainer = undefined;
    }
  }

  /**
   * Force le rechargement des signatures depuis la base de données
   * et notifie les composants de l'interface utilisateur
   */
  async forceRefreshSignatures(): Promise<{
    participant: string | null;
    representative: string | null;
    trainer: string | null;
    companySeal: string | null;
    organizationSeal: string | null;
  }> {
    console.log('🔄 [REFRESH] Forçage du rafraîchissement via loadExistingSignatures...');
    await this.loadExistingSignatures(); // Appelle la nouvelle logique complète
    return this.getSignatures(); // Return the correctly typed object
  }

  /**
   * S'assure que le tampon d'organisation est chargé correctement
   * Tente plusieurs méthodes pour récupérer le tampon
   */
  private async ensureOrganizationSealIsLoaded(): Promise<void> {
    console.log('🚨 [URGENT] Vérification du tampon d\'organisation');
    
    // Si déjà chargé, ne rien faire
    if (this.signatures.organizationSeal) {
      console.log('🚨 [URGENT] Tampon d\'organisation déjà chargé:', this.signatures.organizationSeal);
      return;
    }
    
    try {
      // Méthode 1: Récupérer depuis les paramètres
      try {
        const { data: settings, error } = await supabase
          .from('settings')
          .select('organization_seal_url, organization_seal_path')
          .single();
          
        if (error) {
          console.error('🚨 [URGENT] Erreur lors de la récupération des paramètres:', error);
        } else if (settings) {
          // Priorité à l'URL si elle existe
          if (settings.organization_seal_url) {
            this.signatures.organizationSeal = settings.organization_seal_url;
            console.log('🚨 [URGENT] Tampon d\'organisation récupéré depuis l\'URL des paramètres:', settings.organization_seal_url);
          } 
          // Sinon, chercher avec le chemin
          else if (settings.organization_seal_path) {
            try {
              const { data } = await supabase.storage
                .from('organization-seals')
                .getPublicUrl(settings.organization_seal_path);
                
              if (data && data.publicUrl) {
                this.signatures.organizationSeal = data.publicUrl;
                console.log('🚨 [URGENT] Tampon d\'organisation généré depuis le chemin:', data.publicUrl);
              }
            } catch (pathError) {
              console.error('🚨 [URGENT] Erreur lors de la génération de l\'URL depuis le chemin:', pathError);
            }
          }
        }
      } catch (settingsError) {
        console.error('🚨 [URGENT] Exception lors de la récupération des paramètres:', settingsError);
      }
      
      // Méthode 2: Rechercher directement dans le stockage
      try {
        console.log('🚨 [URGENT] Recherche du tampon d\'organisation dans le stockage');
        
        // Rechercher dans le bucket signatures
        const { data: filesData, error: filesError } = await supabase.storage
          .from('signatures')
          .list('', {
            limit: 20,
            search: 'organization_seal'
          });
        
        if (filesError) {
          console.error('🚨 [URGENT] Erreur lors de la recherche des tampons dans "signatures":', filesError);
        } else if (filesData && filesData.length > 0) {
          // Trouver le fichier le plus récent basé sur le nom (généralement avec timestamp)
          const latestFile = filesData
            .filter(file => file.name.includes('organization_seal'))
            .sort((a, b) => b.name.localeCompare(a.name))[0];
          
          if (latestFile) {
            const { data: sealData } = await supabase.storage
              .from('signatures')
              .getPublicUrl(latestFile.name);
            
            if (sealData && sealData.publicUrl) {
              this.signatures.organizationSeal = sealData.publicUrl;
              console.log('🚨 [URGENT] Tampon organisme trouvé dans le bucket "signatures":', latestFile.name);
            }
          }
        }
        
        // Rechercher dans le bucket organization-seals
        const { data: orgSealsData, error: orgSealsError } = await supabase.storage
          .from('organization-seals')
          .list('', {
            limit: 10
          });
        
        if (orgSealsError) {
          console.error('🚨 [URGENT] Erreur lors de la recherche des tampons dans "organization-seals":', orgSealsError);
        } else if (orgSealsData && orgSealsData.length > 0) {
          // Prendre le premier fichier (il ne devrait y en avoir qu'un seul normalement)
          const sealFile = orgSealsData[0];
          
          const { data: sealData } = await supabase.storage
            .from('organization-seals')
            .getPublicUrl(sealFile.name);
          
          if (sealData && sealData.publicUrl) {
            this.signatures.organizationSeal = sealData.publicUrl;
            console.log('🚨 [URGENT] Tampon d\'organisation trouvé dans le bucket "organization-seals":', sealFile.name);
          }
        }
      } catch (storageError) {
        console.error('🚨 [URGENT] Exception lors de la recherche dans le stockage:', storageError);
      }
      
      console.log('🚨 [URGENT] Aucun tampon d\'organisation trouvé après toutes les tentatives');

      // Ensure we notify if the seal is definitively not found (null)
      if (!this.signatures.organizationSeal) {
          this.onSignatureChange(SignatureType.ORGANIZATION_SEAL, null);
      }
    } catch (error) {
      console.error('🚨 [URGENT] Exception critique lors de la recherche du tampon d\'organisation:', error);
    }
  }
  
  /**
   * Retourne l'état actuel des signatures
   */
  getSignatures(): {
    participant: string | null;
    representative: string | null;
    trainer: string | null;
    companySeal: string | null;
    organizationSeal: string | null;
  } {
    console.log('🔍 [SIGNATURES] Récupération des signatures');
    
    // Si le chargement automatique est désactivé, retourner toutes les signatures à null
    if (this.disableAutoLoad) {
      console.log('🚫 [SIGNATURES] Retour signatures nulles (auto-load désactivé)');
      return {
        participant: null,
        representative: null,
        trainer: null,
        companySeal: null,
        organizationSeal: null
      };
    }
    
    // Convert undefined to null for external use
    return {
        participant: this.signatures.participant || null,
        representative: this.signatures.representative || null,
        trainer: this.signatures.trainer || null,
        companySeal: this.signatures.companySeal || null,
        organizationSeal: this.signatures.organizationSeal || null,
    };
  }

  /**
   * Vérifie si une signature spécifique est présente
   * 
   * @param type Type de signature à vérifier
   */
  hasSignature(type: SignatureType): boolean {
    return !!this.signatures[type];
  }

  /**
   * Vérifie si toutes les signatures requises sont présentes
   */
  isFullySigned(): boolean {
    const requiredSignatures = DOCUMENT_SIGNATURE_CONFIG[this.documentType].requiredSignatures || [];
    return requiredSignatures.every((type: SignatureType) => !!this.signatures[type]);
  }

  /**
   * Obtient le message à afficher pour l'étape de signature actuelle
   */
  getSignatureStatusMessage(): string {
    if (!this.signaturesLoaded) {
      return "Chargement des signatures...";
    }

    if (this.isFullySigned()) {
      return "Document entièrement signé";
    }

    // Déterminer si la signature est possible pour l'utilisateur actuel
    const currentSignerType = this.viewContext === 'student' ? SignatureType.PARTICIPANT : SignatureType.TRAINER; // Simplification pour CRM : on suppose que c'est le formateur
    const canSignResult = this.canSign(currentSignerType);

    if (canSignResult.canSign) {
        return "Signature requise"; // Message générique si la signature est possible
    }

    // Si la signature n'est pas possible mais le document n'est pas complet
    const config = DOCUMENT_SIGNATURE_CONFIG[this.documentType];
    return config.pendingSignatureMessage || "En attente de signatures..."; // Message générique d'attente
  }

  /**
   * Détermine quels boutons de signature doivent être affichés et leur état
   */
  getSignatureButtonState(): { show: boolean; enabled: boolean; text: string } {
    if (!this.signaturesLoaded) {
      return { show: false, enabled: false, text: "" };
    }

    // Logique unifiée : déterminer si l'acteur actuel peut signer
    const currentSignerType = this.viewContext === 'student' ? SignatureType.PARTICIPANT : SignatureType.TRAINER; // Simplification CRM
    const canSignResult = this.canSign(currentSignerType);

    // Afficher le bouton uniquement si l'utilisateur actuel peut signer
    return {
      show: canSignResult.canSign,
      enabled: canSignResult.canSign,
      text: "Signer le document" // Texte générique
    };
  }

  /**
   * Met à jour le statut du document
   * @param field Champ à mettre à jour
   * @param value Valeur à définir
   */
  private async updateDocumentStatus(field: string, value: boolean): Promise<void> {
    try {
      if (!this.documentId) {
        console.error('ID du document non défini, impossible de mettre à jour le statut');
        return;
      }
      
      // Mettre à jour le statut du document
      const { error } = await supabase
        .from('documents')
        .update({ [field]: value })
        .eq('id', this.documentId);
        
      if (error) {
        console.error(`Erreur lors de la mise à jour du statut ${field}:`, error);
        } else {
        console.log(`Statut ${field} mis à jour avec succès:`, value);
        }
    } catch (error) {
      console.error(`Exception lors de la mise à jour du statut ${field}:`, error);
    }
  }

  /**
   * Convertit une chaîne base64 en Blob
   */
  private base64ToBlob(base64: string, contentType: string): Blob {
    const byteCharacters = atob(base64);
    const byteArrays = [];
    
    for (let offset = 0; offset < byteCharacters.length; offset += 1024) {
      const slice = byteCharacters.slice(offset, offset + 1024);
      
      const byteNumbers = new Array(slice.length);
      for (let i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i);
      }
      
      const byteArray = new Uint8Array(byteNumbers);
      byteArrays.push(byteArray);
    }
    
    return new Blob(byteArrays, { type: contentType });
  }

  /**
   * Génère le chemin de stockage pour une signature
   * 
   * @param type Type de signature (participant, representative, trainer, companySeal)
   * @returns Chemin de stockage
   */
  private getSignaturePath(type: SignatureType): string {
    // Chemin principal basé sur le type de document, la formation et l'utilisateur
    let path = `${type}_${this.documentType}_${this.trainingId}`;
    
    // Pour les signatures du participant, inclure l'ID de l'utilisateur
    if (type === SignatureType.PARTICIPANT) {
      path += `_${this.participantId}`;
    }
    
    // Pour le tampon d'entreprise, utiliser un chemin spécifique
    if (type === SignatureType.COMPANY_SEAL) {
      path = `companySeal_${this.documentType}_${this.trainingId}`;
    }
    
    return `${path}.png`;
  }

  /**
   * Callback appelé lorsqu'une signature est sauvegardée
   * Méthode destinée à être surchargée par les sous-classes
   * 
   * @param type Type de signature sauvegardée
   * @param url URL de la signature
   */
  protected onSignatureSaved(type: SignatureType, url: string): void {
    // À surcharger dans les sous-classes si nécessaire
  }

  /**
   * Charge le document depuis la base de données
   */
  async loadDocument(): Promise<void> {
    try {
      console.log('🔍 [DEBUG] Chargement du document:', {
        documentType: this.documentType,
        trainingId: this.trainingId,
        participantId: this.participantId
      });
    
      // Récupérer le document existant - SUPPRIMER 'status' du select
      const { data: documents, error } = await supabase
        .from('documents')
        .select('id') // <- Correction ici
        .eq('type', this.documentType)
        .eq('training_id', this.trainingId)
        .eq('user_id', this.participantId)
        .limit(1);
      
      if (error) {
        // Vérifier si l'erreur est due à une colonne manquante comme 'status' ou 'need_stamp'
        if (error.message.includes('column') && error.message.includes('does not exist')) {
            console.warn('⚠️ [WARN] Erreur de colonne ignorée (colonne obsolète?):', error.message);
            // Tenter de recharger sans la colonne problématique (ici on sélectionne juste 'id')
             const { data: retryData, error: retryError } = await supabase
                .from('documents')
                .select('id') // <- Correction ici aussi
                .eq('type', this.documentType)
                .eq('training_id', this.trainingId)
                .eq('user_id', this.participantId)
                .limit(1);
            if (retryError) {
                 console.error('❌ [ERROR] Erreur lors de la nouvelle tentative de chargement du document (select id):', retryError);
                throw retryError; // Relancer l'erreur de la nouvelle tentative
            } 
             if (retryData && retryData.length > 0) {
                this.documentId = retryData[0].id;
                console.log('✅ [RETRY_SUCCESS] Document existant chargé (select id):', { id: this.documentId });
            } else {
                 console.log('🔍 [DEBUG] Aucun document trouvé même après nouvelle tentative.');
                // Continuer pour créer un nouveau document
            }
        } else {
             console.error('❌ [ERROR] Erreur lors du chargement du document:', error);
             throw error;
        }
      } else if (documents && documents.length > 0) {
        this.documentId = documents[0].id;
        console.log('🔍 [DEBUG] Document existant chargé:', {
          id: this.documentId,
          // status: documents[0].status // <- Commenté car status n'est plus sélectionné
        });
      }
       // La logique pour définir this.needStamp ne dépend plus de la DB
       this.needStamp = this.documentType === DocumentType.CONVENTION;
      
      // Si aucun document n'a été trouvé ou chargé après la nouvelle tentative
      if (!this.documentId) {
        console.log("🔍 [DEBUG] Aucun document trouvé, création d'un nouveau document.");
        this.needStamp = this.documentType === DocumentType.CONVENTION;
        console.log('🔧 [DIAGNOSTIC_TAMPON] Nouveau document avec needStamp =', this.needStamp);
        
        // Créer un nouveau document - AJOUTER title
        let documentTitle = `Document (${this.documentType})`;
        if (this.participantName) {
          documentTitle += ` - ${this.participantName}`;
        } else if (this.participantId) {
           documentTitle += ` - User ${this.participantId.substring(0, 8)}...`; // Fallback avec ID
        }

        const { data: newDocument, error: insertError } = await supabase
          .from('documents')
          .insert({
            type: this.documentType,
            training_id: this.trainingId,
            user_id: this.participantId,
            title: documentTitle, // <-- Ajout du titre ici
          })
          .select('id');
        
        if (insertError) {
          console.error('❌ [ERROR] Erreur lors de la création du nouveau document:', insertError);
          throw insertError;
        }
        
        if (!newDocument || newDocument.length === 0) {
          throw new Error('Impossible de créer un nouveau document');
        }
        
        this.documentId = newDocument[0].id;
        console.log('🔍 [DEBUG] Nouveau document créé avec ID:', this.documentId);
      }
    } catch (error) {
      console.error('❌ [ERROR] Exception lors du chargement du document:', error);
      throw error;
    }
  }

  /**
   * Vérifie si le document nécessite un tampon (basé uniquement sur le type)
   */
  needsStamp(): boolean {
    // La nécessité du tampon dépend maintenant uniquement du type de document
    this.needStamp = this.documentType === DocumentType.CONVENTION;
    return this.needStamp;
  }

  /**
   * Définit si le document nécessite un tampon (fonction conservée mais potentiellement obsolète)
   */
  setNeedsStamp(value: boolean): void {
    // Attention: cette valeur pourrait être écrasée par la logique de needsStamp()
    console.warn("⚠️ [WARN] setNeedsStamp est appelé, mais la valeur pourrait être ignorée car elle dépend maintenant du type de document.")
    this.needStamp = value;
  }

  /**
   * Met à jour la configuration du document (need_stamp) - Fonction désactivée
   */
  async updateDocumentConfig(): Promise<void> {
    console.log("ℹ️ [INFO] La mise à jour de need_stamp via updateDocumentConfig est désactivée car elle dépend maintenant du type.");
    return; // Ne rien faire, car need_stamp ne doit pas être en BD
    /* Code original désactivé
    if (!this.documentId) {
      console.error('❌ [ERROR] Impossible de mettre à jour la configuration du document: ID manquant');
      return;
    }
    try {
      const { error } = await supabase
        .from('documents')
        .update({ need_stamp: this.needStamp })
        .eq('id', this.documentId);

      if (error) {
        console.error('❌ [ERROR] Erreur lors de la mise à jour de need_stamp:', error);
      } else {
        console.log('✅ [SUCCESS] Configuration du document mise à jour: need_stamp =', this.needStamp);
      }
    } catch (error) {
      console.error('❌ [ERROR] Exception lors de la mise à jour de la configuration du document:', error);
    }
    */
  }

  /**
   * Détermine les signatures requises en tenant compte de need_stamp
   */
  getRequiredSignatures(): SignatureType[] {
    const config = DOCUMENT_SIGNATURE_CONFIG[this.documentType];
    return config?.requiredSignatures || [];
  }

  /**
   * Détermine les signatures optionnelles en tenant compte de need_stamp
   */
  getOptionalSignatures(): SignatureType[] {
    const config = DOCUMENT_SIGNATURE_CONFIG[this.documentType];
    return config?.optionalSignatures || [];
  }

  /**
   * Détermine l'ordre des signatures en tenant compte de need_stamp
   */
  getSignatureOrder(): SignatureType[] {
    const config = DOCUMENT_SIGNATURE_CONFIG[this.documentType];
    return config?.signatureOrder || [];
  }

  /**
   * Obtient le message à afficher pour l'étape de signature actuelle
   */
  getPendingSignatureMessage(): string {
    const config = DOCUMENT_SIGNATURE_CONFIG[this.documentType];
    return config?.pendingSignatureMessage || "En attente d'autres signatures";
  }

  /**
   * Charge une signature globale spécifique depuis la table DOCUMENTS
   * 
   * @param type Type de signature à charger (participant, representative, trainer, companySeal, organizationSeal)
   * @returns URL de la signature ou null si non trouvée
   */
  public async loadSignature(type: SignatureType): Promise<string | null> {
    console.log(`    🔎 [DSM_LOAD_SIG] Appel loadSignature pour type: ${type}`);
    try {
      // Utiliser la table 'documents' au lieu de 'signatures'
      let query = supabase
        .from('documents') // <- Changement de table ici
        .select('file_url') // <- Utiliser file_url
        .eq('training_id', this.trainingId);

      // Filtrage basé sur le type de signature:
      let titleFilter = '';
      let userIdFilter: string | null = null;

      switch (type) {
        case SignatureType.PARTICIPANT:
          titleFilter = "Signature de l'apprenant";
          userIdFilter = this.participantId;
          query = query.eq('user_id', userIdFilter);
          break;
        case SignatureType.REPRESENTATIVE:
          titleFilter = '%signature%representant%';
          // La signature du représentant est liée à l'entreprise, pas à l'utilisateur direct?
          // Si companyId existe, on pourrait chercher un document lié à la compagnie?
           query = query.eq('type', DocumentType.CONVENTION); // Lié à la convention
          // Comment identifier le bon document 'représentant' sans user_id ou company_id direct?
          // Peut-être chercher le document de convention du participant et voir s'il a une signature?
           console.warn("⚠️ [WARN] Chargement signature REPRESENTATIVE: Logique de filtrage à affiner.");
          break;
        case SignatureType.TRAINER:
          titleFilter = '%signature%formateur%';
           query = query.eq('type', DocumentType.ATTESTATION); // Souvent lié à l'attestation
          // Pas de filtre user_id ici, signature globale pour la formation
          break;
        case SignatureType.COMPANY_SEAL:
          titleFilter = '%tampon%entreprise%';
           query = query.eq('type', DocumentType.CONVENTION); // Lié à la convention
          // Ici aussi, comment lier au bon tampon sans companyId direct dans la requête?
          // Si on a this.companyId, on pourrait chercher les users de cette company?
           console.warn("⚠️ [WARN] Chargement signature COMPANY_SEAL: Logique de filtrage à affiner.");
          break;
        case SignatureType.ORGANIZATION_SEAL:
           // Le tampon de l'OF est global, souvent stocké dans settings ou un doc dédié
           console.log("ℹ️ [INFO] Chargement ORGANISATION_SEAL géré séparément par ensureOrganizationSealIsLoaded.");
           return this.signatures.organizationSeal || null;
      }

      if (titleFilter) {
        query = query.eq('title', titleFilter);
      }

      // Log des paramètres de la requête
      console.log(`      [DSM_LOAD_SIG] Paramètres requête DOCUMENTS: training_id=${this.trainingId}, type=${type}, title LIKE ${titleFilter}, user_id=${userIdFilter || 'N/A'}`);

      // Trier par date de création pour obtenir la plus récente
      query = query.order('created_at', { ascending: false }).limit(1);

      console.log(`    ⏳ [DSM_LOAD_SIG] Exécution requête Supabase (table documents) pour ${type}...`);
      const { data, error } = await query.maybeSingle();
      
      // >>> LOG AJOUTÉ ICI <<<
      if (type === SignatureType.PARTICIPANT) {
          console.log(`    📊 [DSM_LOAD_SIG_RESULT] Résultat requête PARTICIPANT: data=${JSON.stringify(data)}, error=${JSON.stringify(error)}`);
      }

      if (error) {
        // Vérifier si l'erreur est due à la table 'signatures'
         if (error.message.includes('relation \"public.signatures\" does not exist')) {
             console.warn(`    ⚠️ [WARN] Erreur ignorée (table 'signatures' obsolète pour ${type}): ${error.message}`);
             return null; // Continuer sans cette signature si la table n'existe pas
         } else {
            console.error(`    ❌ [DSM_LOAD_SIG] Erreur Supabase (table documents) pour ${type}:`, error);
             return null;
         }
      }

      if (data && data.file_url) {
        const url = addCacheBuster(data.file_url);
        console.log(`    ✅ [DSM_LOAD_SIG] Signature trouvée pour ${type} via table 'documents': ${url.substring(0, 60)}...`);
        return url;
      } else {
        console.log(`    ℹ️ [DSM_LOAD_SIG] Aucune signature trouvée pour ${type} dans la table 'documents'.`);
        return null;
      }
    } catch (e) {
      console.error(`    💥 [DSM_LOAD_SIG] Exception pour ${type}:`, e);
      return null;
    }
  }

  /**
   * Met à jour directement une signature dans le gestionnaire
   * Utile pour forcer une mise à jour sans passer par la sauvegarde complète
   * 
   * @param type Type de signature
   * @param url URL de la signature (doit être une chaîne valide)
   */
  updateSignature(type: SignatureType, url: string): void {
    // Assurer que l'URL est une chaîne valide avant de l'utiliser
    const validUrl = url || null; // Convertir chaîne vide en null si nécessaire
    console.log(`📝 [UPDATE_SIG] Mise à jour de la signature ${type} avec URL: ${validUrl ? validUrl.substring(0,30)+'...' : 'null'}`);
    
    // Vérifier si le type de signature est valide
    if (Object.values(SignatureType).includes(type)) {
      // Mettre à jour la signature dans l'objet this.signatures
      // @ts-ignore - On sait que type est une clé valide de SignatureSet ici
      this.signatures[type] = validUrl;
      
      // Notifier le changement
      this.onSignatureChange(type, validUrl);
    } else {
      console.warn(`⚠️ [UPDATE_SIG] Tentative de mise à jour d'un type de signature inconnu ou invalide: ${type}`);
    }
  }

  /**
   * Rafraîchit les signatures en rechargeant depuis le serveur
   */
  async refreshSignatures(): Promise<void> {
    console.log('🔄 [REFRESH_MGR] Rafraîchissement demandé via DocumentSignatureManager');
    await this.loadExistingSignatures();
  }

  /**
   * Crée manuellement une signature du représentant à partir de la signature du formateur
   * (solution temporaire pour résoudre le problème des signatures manquantes)
   */
  async createRepresentativeSignature(): Promise<string | null> {
    // Logique pour créer/assigner une signature de représentant si nécessaire
    // Pourrait impliquer de chercher une signature existante ou d'en générer une
    console.warn('Méthode createRepresentativeSignature non implémentée');
    return null;
  }

  /**
   * Force le chargement croisé des signatures entre formateur et apprenant
   * Cette méthode garantit que toutes les signatures sont visibles quel que soit le contexte
   */
  public async enforceCrossSignatureVisibility(): Promise<void> {
    try {
      console.log('🔄 [CROSS_VIZ] Début du forçage de visibilité croisée des signatures');
      
      // 1. Récupérer toutes les signatures de type 'participant' pour cette formation
      if (!this.signatures.participant) {
        console.log('🔄 [CROSS_VIZ] Recherche de signature participant pour training_id:', this.trainingId);
        const { data: participantDocs, error: participantError } = await supabase
          .from('documents')
          .select('file_url')
          .eq('training_id', this.trainingId)
          .eq('title', "Signature de l'apprenant")
          .eq('type', this.documentType)
          .order('created_at', { ascending: false })
          .limit(1);
        
        if (!participantError && participantDocs && participantDocs.length > 0) {
          this.signatures.participant = participantDocs[0].file_url;
          console.log('🔄 [CROSS_VIZ] Signature participant trouvée:', this.signatures.participant);
          
          // Notifier du changement
          if (this.onSignatureChange) {
            this.onSignatureChange(SignatureType.PARTICIPANT, this.signatures.participant || null);
          }
        }
      }
      
      // 2. Récupérer toutes les signatures de type 'trainer' pour cette formation
      if (!this.signatures.trainer) {
        console.log('🔄 [CROSS_VIZ] Recherche de signature formateur pour training_id:', this.trainingId);
        const { data: trainerDocs, error: trainerError } = await supabase
          .from('documents')
          .select('file_url')
          .eq('training_id', this.trainingId)
          .eq('title', "Signature du formateur")
          .eq('type', this.documentType)
          .order('created_at', { ascending: false })
          .limit(1);
        
        if (!trainerError && trainerDocs && trainerDocs.length > 0) {
          this.signatures.trainer = trainerDocs[0].file_url;
          console.log('🔄 [CROSS_VIZ] Signature formateur trouvée:', this.signatures.trainer);
          
          // Notifier du changement
          if (this.onSignatureChange) {
            this.onSignatureChange(SignatureType.TRAINER, this.signatures.trainer || null);
          }
        }
      }
      
      // 3. Récupérer toutes les signatures de type 'representative' pour cette formation
      if (!this.signatures.representative) {
        console.log('🔄 [CROSS_VIZ] Recherche de signature représentant pour training_id:', this.trainingId);
        const { data: repDocs, error: repError } = await supabase
          .from('documents')
          .select('file_url')
          .eq('training_id', this.trainingId)
          .eq('title', "Signature du représentant")
          .eq('type', this.documentType)
          .order('created_at', { ascending: false })
          .limit(1);
        
        if (!repError && repDocs && repDocs.length > 0) {
          this.signatures.representative = repDocs[0].file_url;
          console.log('🔄 [CROSS_VIZ] Signature représentant trouvée:', this.signatures.representative);
          
          // Notifier du changement
          if (this.onSignatureChange) {
            this.onSignatureChange(SignatureType.REPRESENTATIVE, this.signatures.representative || null);
          }
        }
      }
      
      // 4. Récupérer le tampon de l'entreprise (companySeal) si nécessaire
      if (this.needStamp && !this.signatures.companySeal) {
        console.log('🔄 [CROSS_VIZ] Recherche de tampon entreprise pour user_id:', this.participantId);
        const { data: companySealDocs, error: companySealError } = await supabase
          .from('documents')
          .select('file_url')
          .eq('user_id', this.participantId)
          .eq('title', "Tampon de l'entreprise")
          .eq('type', this.documentType)
          .order('created_at', { ascending: false })
          .limit(1);
        
        if (!companySealError && companySealDocs && companySealDocs.length > 0) {
          this.signatures.companySeal = companySealDocs[0].file_url;
          console.log('🔄 [CROSS_VIZ] Tampon entreprise trouvé:', this.signatures.companySeal);
          
          // Notifier du changement
          if (this.onSignatureChange) {
            this.onSignatureChange(SignatureType.COMPANY_SEAL, this.signatures.companySeal || null);
          }
        }
      }
      
      console.log('🔄 [CROSS_VIZ] Visibilité croisée des signatures terminée:', {
        participant: this.signatures.participant ? 'présente' : 'absente',
        trainer: this.signatures.trainer ? 'présente' : 'absente',
        representative: this.signatures.representative ? 'présente' : 'absente',
        companySeal: this.signatures.companySeal ? 'présent' : 'absent',
        organizationSeal: this.signatures.organizationSeal ? 'présent' : 'absent'
      });
    } catch (error) {
      console.error('❌ [CROSS_VIZ] Erreur lors du forçage de visibilité croisée:', error);
    }
  }
} 