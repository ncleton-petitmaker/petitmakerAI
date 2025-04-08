import { DocumentManager } from './DocumentManager';
import { supabase } from '../../lib/supabase';

/**
 * Types de documents pris en charge par l'application
 * Cette énumération définit tous les types de documents supportés.
 * Pour ajouter un nouveau type de document, il suffit de l'ajouter ici.
 */
export enum DocumentType {
  CONVENTION = 'convention',
  ATTESTATION = 'attestation',
  EMARGEMENT = 'emargement',
  DEVIS = 'devis',
  FACTURE = 'facture',
  PROGRAMME = 'programme',
  AUTRE = 'autre'
}

/**
 * Types de signatures disponibles dans l'application
 */
export type SignatureType = 'participant' | 'representative' | 'trainer' | 'companySeal' | 'organizationSeal';

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
 */
export const DOCUMENT_SIGNATURE_CONFIG: Record<string, SignatureRequirements> = {
  [DocumentType.CONVENTION]: {
    requiredSignatures: ['representative', 'participant'],
    optionalSignatures: ['companySeal', 'organizationSeal'],
    signatureOrder: ['representative', 'participant'],
    pendingSignatureMessage: 'En attente de la signature du formateur'
  },
  [DocumentType.ATTESTATION]: {
    requiredSignatures: ['representative'],
    pendingSignatureMessage: 'En attente de la signature du formateur'
  },
  [DocumentType.EMARGEMENT]: {
    requiredSignatures: ['trainer', 'participant'],
    pendingSignatureMessage: 'En attente de la signature du formateur'
  },
  [DocumentType.DEVIS]: {
    requiredSignatures: ['representative', 'participant'],
    signatureOrder: ['representative', 'participant']
  },
  [DocumentType.FACTURE]: {
    requiredSignatures: ['representative']
  },
  [DocumentType.PROGRAMME]: {
    requiredSignatures: ['representative']
  },
  [DocumentType.AUTRE]: {
    requiredSignatures: []
  }
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
  private participantName: string;
  private viewContext: 'crm' | 'student';
  private documentId: string = '';
  private signatures: {
    participant: string | null;
    representative: string | null;
    trainer: string | null;
    companySeal: string | null;
    organizationSeal: string | null;
  } = {
    participant: null,
    representative: null,
    trainer: null,
    companySeal: null,
    organizationSeal: null
  };
  private signaturesLoaded: boolean = false;
  private needStamp: boolean = false;
  private onSignatureChange: (type: SignatureType, signature: string | null) => void;
  public disableAutoLoad: boolean = false;

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
    
    // Initialiser needStamp à true si c'est une convention
    this.needStamp = documentType === DocumentType.CONVENTION;
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
    const config = DOCUMENT_SIGNATURE_CONFIG[this.documentType.toString()];
    if (!config) {
      return { canSign: false, message: "Type de document non reconnu" };
    }

    // Vérifier si le type de signature est requis pour ce document
    if (!config.requiredSignatures.includes(signerType)) {
      return { canSign: false, message: "Votre signature n'est pas requise pour ce document" };
    }

    // Si on est en CRM et que c'est une signature de formateur sur une convention, toujours autoriser
    if (this.viewContext === 'crm' && signerType === 'trainer' && 
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
          if (!this.signatures[signer]) {
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
    if (this.signatures[signerType] && !(this.viewContext === 'crm' && signerType === 'trainer')) {
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
      const isTrainerOrRepresentative = signerType === 'trainer' || signerType === 'representative';
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
      if (signerType === 'participant') {
        title = "Signature de l'apprenant";
      } else if (signerType === 'representative') {
        title = "Signature du représentant";
      } else if (signerType === 'trainer') {
        title = "Signature du formateur";
      } else if (signerType === 'companySeal') {
        title = "Tampon de l'entreprise";
      } else if (signerType === 'organizationSeal') {
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
          participant_name: this.participantName
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
    console.log('🚀 [LOAD_ALL] Début du chargement complet des signatures', {
      viewContext: this.viewContext,
      trainingId: this.trainingId,
      participantId: this.participantId,
      documentType: this.documentType
    });

    // Si le chargement automatique est désactivé, ne rien faire
    if (this.disableAutoLoad) {
      console.log('🚫 [LOAD_ALL] Chargement automatique désactivé');
      this.signaturesLoaded = true; // Marquer comme chargé pour éviter les boucles
      return;
    }

    this.signaturesLoaded = false;
    // Réinitialiser systématiquement avant de charger
    this.signatures = {
      participant: null,
      representative: null,
      trainer: null,
      companySeal: null,
      organizationSeal: null
    };

    try {
      // Préparer les paramètres communs pour getLastSignature
      const commonParams = {
        training_id: this.trainingId,
        type: this.documentType as 'convention' | 'attestation' | 'emargement',
      };

      // --- Chargement Conditionnel --- 
      // Les promesses seront résolues en parallèle
      const promises = [];

      // 1. Signature Participant (toujours liée à participantId)
      promises.push(
        DocumentManager.getLastSignature({
          ...commonParams,
          user_id: this.participantId,
          signature_type: 'participant'
        }).then(url => { if (url) this.signatures.participant = url; })
      );

      // 2. Signature Représentant (liée à participantId OU partagée via companyId - getLastSignature devrait gérer ça)
      // Note: getLastSignature devra être intelligent pour chercher aussi les partages
      promises.push(
        DocumentManager.getLastSignature({
          ...commonParams,
          user_id: this.participantId, // Fournir l'ID pour chercher la spécifique/partagée
          signature_type: 'representative'
        }).then(url => { if (url) this.signatures.representative = url; })
      );

      // 3. Signature Formateur (globale à la formation, user_id = null)
      promises.push(
        DocumentManager.getLastSignature({
          ...commonParams,
          // user_id: undefined, // Ne pas spécifier pour chercher la globale
          signature_type: 'trainer'
        }).then(url => { if (url) this.signatures.trainer = url; })
      );

      // 4. Tampon Entreprise (lié à participantId OU companyId - getLastSignature à adapter?)
      // Convention actuelle: getLastSignature cherche avec user_id pour companySeal
      if (this.documentType === DocumentType.CONVENTION) { // Seulement pour les conventions
        promises.push(
          DocumentManager.getLastSignature({
            ...commonParams,
            user_id: this.participantId, // Garder user_id pour l'instant
            signature_type: 'companySeal'
          }).then(url => { if (url) this.signatures.companySeal = url; })
        );
      }

      // 5. Tampon Organisme (global)
      promises.push(this.ensureOrganizationSealIsLoaded()); // Utilise la méthode dédiée qui cherche dans settings/storage

      // --- Exécution Parallèle --- 
      console.log(`🚀 [LOAD_ALL] Lancement de ${promises.length} chargements en parallèle...`);
      await Promise.allSettled(promises);
      console.log('✅ [LOAD_ALL] Tous les chargements parallèles terminés.');

      // Log final de l'état chargé
      console.log('📊 [LOAD_ALL] État final des signatures après chargement complet:', {
        participant: !!this.signatures.participant,
        representative: !!this.signatures.representative,
        trainer: !!this.signatures.trainer,
        companySeal: !!this.signatures.companySeal,
        organizationSeal: !!this.signatures.organizationSeal,
        viewContext: this.viewContext
      });

    } catch (error) {
      console.error('❌ [LOAD_ALL] Erreur majeure lors du chargement complet des signatures:', error);
      // Laisser les signatures partiellement chargées si une erreur survient
    } finally {
      this.signaturesLoaded = true;
      console.log('🏁 [LOAD_ALL] Chargement complet terminé (signaturesLoaded=true).');
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
      this.signatures.companySeal = null;
    }
    
    // Vérifier si le tampon de l'organisme contient une référence à une signature d'apprenant
    if (this.signatures.organizationSeal && 
        this.signatures.organizationSeal.includes('participant_convention')) {
      console.error('🔧 [CORRECTION] Tampon d\'organisme détecté comme signature de participant, correction...');
      this.signatures.organizationSeal = null;
    }
    
    // Vérifier si la signature du formateur contient une référence à une signature d'apprenant
    if (this.signatures.trainer && 
        this.signatures.trainer.includes('participant_convention')) {
      console.error('🔧 [CORRECTION] Signature de formateur détectée comme signature de participant, correction...');
      this.signatures.trainer = null;
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
    return this.signatures;
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

    return this.signatures;
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
    const requiredSignatures = DOCUMENT_SIGNATURE_CONFIG[this.documentType.toString()]?.requiredSignatures || [];
    return requiredSignatures.every(type => !!this.signatures[type]);
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

    // Déterminer quelle signature manque en fonction du contexte
    const config = DOCUMENT_SIGNATURE_CONFIG[this.documentType.toString()];
    
    if (this.viewContext === 'student') {
      if (!this.signatures.participant && this.canSign('participant').canSign) {
        return "Votre signature est requise";
      } else if (!this.signatures.representative || !this.signatures.trainer) {
        return config.pendingSignatureMessage || "En attente de la signature du formateur";
      }
    } else if (this.viewContext === 'crm') {
      if (!this.signatures.representative && this.canSign('representative').canSign) {
        return "Signature du représentant requise";
      } else if (!this.signatures.trainer && this.canSign('trainer').canSign) {
        return "Signature du formateur requise";
      } else if (!this.signatures.participant) {
        return "En attente de la signature de l'apprenant";
      }
    }

    return "Vérification des signatures...";
  }

  /**
   * Détermine quels boutons de signature doivent être affichés et leur état
   */
  getSignatureButtonState(): { show: boolean; enabled: boolean; text: string } {
    if (!this.signaturesLoaded) {
      return { show: false, enabled: false, text: "" };
    }

    // Pour l'interface étudiant
    if (this.viewContext === 'student') {
      const canSignResult = this.canSign('participant');
      return {
        show: canSignResult.canSign,
        enabled: canSignResult.canSign,
        text: "Signer le document"
      };
    } 
    // Pour l'interface CRM
    else {
      // Si on est en mode formateur pour une convention, toujours montrer le bouton
      if (this.documentType === DocumentType.CONVENTION) {
        // Pour les conventions, le formateur peut toujours signer/re-signer
        return {
          show: true,
          enabled: true,
          text: "Signer en tant que formateur"
        };
      }
      
      // Vérifier si le représentant peut signer
      const canRepSign = this.canSign('representative');
      if (canRepSign.canSign) {
        return {
          show: true,
          enabled: true,
          text: "Signer en tant que représentant"
        };
      }
      
      // Vérifier si le formateur peut signer
      const canTrainerSign = this.canSign('trainer');
      if (canTrainerSign.canSign) {
        return {
          show: true,
          enabled: true,
          text: "Signer en tant que formateur"
        };
      }
      
      // Si on a déjà signé en tant que formateur, proposer de re-signer
      if (this.signatures.trainer) {
        return {
          show: true,
          enabled: true,
          text: "Re-signer en tant que formateur"
        };
      }
      
      // Par défaut, ne pas montrer de bouton
      return { show: false, enabled: false, text: "" };
    }
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
    if (type === 'participant') {
      path += `_${this.participantId}`;
    }
    
    // Pour le tampon d'entreprise, utiliser un chemin spécifique
    if (type === 'companySeal') {
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
    
      // Récupérer le document existant
      const { data: documents, error } = await supabase
        .from('documents')
        .select('id, need_stamp, status')
        .eq('type', this.documentType)
        .eq('training_id', this.trainingId)
        .eq('user_id', this.participantId)
        .limit(1);
      
      if (error) {
        console.error('❌ [ERROR] Erreur lors du chargement du document:', error);
        throw error;
      }
      
      // Si un document existe déjà, utiliser ses données
      if (documents && documents.length > 0) {
        this.documentId = documents[0].id;
        
        // CORRECTION: S'assurer que need_stamp est correctement défini à partir de la base de données
        if (documents[0].need_stamp !== undefined && documents[0].need_stamp !== null) {
          this.needStamp = documents[0].need_stamp;
          
          // Forcer needStamp à true pour les conventions, même si la valeur en BD est false
          if (this.documentType === DocumentType.CONVENTION && !this.needStamp) {
            console.log('🔧 [CORRECTION] Forcer need_stamp à true pour convention (était false en BD)');
            this.needStamp = true;
            
            // Mettre à jour la BD également
            this.updateDocumentConfig().catch(err => {
              console.error('❌ [ERROR] Échec mise à jour automatique need_stamp:', err);
            });
          }
      } else {
          // Si non défini dans la base de données, utiliser la valeur par défaut pour les conventions
          this.needStamp = this.documentType === DocumentType.CONVENTION;
          console.log('🔧 [DIAGNOSTIC_TAMPON] needStamp non défini en BD, valeur par défaut:', this.needStamp);
        }
        
        console.log('🔍 [DEBUG] Document existant chargé:', {
          id: this.documentId,
          needStamp: this.needStamp,
          status: documents[0].status
        });
      }
      else {
        console.log('🔍 [DEBUG] Aucun document trouvé, création d\'un nouveau document');
        
        // CORRECTION: Par défaut, les conventions nécessitent TOUJOURS un tampon
        this.needStamp = this.documentType === DocumentType.CONVENTION;
        console.log('🔧 [DIAGNOSTIC_TAMPON] Nouveau document convention avec needStamp =', this.needStamp);
        
        // Créer un nouveau document
        const { data: newDocument, error: insertError } = await supabase
          .from('documents')
          .insert({
            type: this.documentType,
            training_id: this.trainingId,
            user_id: this.participantId,
            status: 'draft',
            need_stamp: this.needStamp
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
        console.log('🔍 [DEBUG] Nouveau document créé avec ID:', this.documentId, 'et need_stamp =', this.needStamp);
      }
    } catch (error) {
      console.error('❌ [ERROR] Exception lors du chargement du document:', error);
      throw error;
    }
  }

  /**
   * Vérifie si le document nécessite un tampon
   */
  needsStamp(): boolean {
    return this.needStamp;
  }

  /**
   * Définit si le document nécessite un tampon
   */
  setNeedsStamp(value: boolean): void {
    this.needStamp = value;
  }

  /**
   * Met à jour la configuration du document (need_stamp)
   */
  async updateDocumentConfig(): Promise<void> {
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
  }

  /**
   * Détermine les signatures requises en tenant compte de need_stamp
   */
  getRequiredSignatures(): SignatureType[] {
    const config = DOCUMENT_SIGNATURE_CONFIG[this.documentType.toString()];
    return config?.requiredSignatures || [];
  }

  /**
   * Détermine les signatures optionnelles en tenant compte de need_stamp
   */
  getOptionalSignatures(): SignatureType[] {
    const config = DOCUMENT_SIGNATURE_CONFIG[this.documentType.toString()];
    return config?.optionalSignatures || [];
  }

  /**
   * Détermine l'ordre des signatures en tenant compte de need_stamp
   */
  getSignatureOrder(): SignatureType[] {
    const config = DOCUMENT_SIGNATURE_CONFIG[this.documentType.toString()];
    return config?.signatureOrder || [];
  }

  /**
   * Obtient le message à afficher pour l'étape de signature actuelle
   */
  getPendingSignatureMessage(): string {
    const config = DOCUMENT_SIGNATURE_CONFIG[this.documentType.toString()];
    return config?.pendingSignatureMessage || "En attente d'autres signatures";
  }

  /**
   * Charge une signature spécifique depuis Supabase
   * 
   * @param type Type de signature à charger (participant, representative, trainer, companySeal, organizationSeal)
   * @returns URL de la signature ou null si non trouvée
   */
  public async loadSignature(type: SignatureType): Promise<string | null> {
    console.log(`🔄 [LOAD_SPECIFIC] Chargement explicite de: ${type}`);
    try {
      const commonParams = {
        training_id: this.trainingId,
        type: this.documentType as 'convention' | 'attestation' | 'emargement',
      };
      
      let userIdParam: string | undefined = undefined;
      if (type === 'participant' || type === 'representative' || type === 'companySeal') {
        userIdParam = this.participantId;
      }

      const url = await DocumentManager.getLastSignature({
        ...commonParams,
        user_id: userIdParam,
        signature_type: type
      });
      
      if (url) {
        // @ts-ignore // Permettre l'accès dynamique à la propriété
        this.signatures[type] = url;
        console.log(`✅ [LOAD_SPECIFIC] Signature ${type} chargée avec succès.`);
        return url;
      } else {
        console.log(`ℹ️ [LOAD_SPECIFIC] Signature ${type} non trouvée.`);
        return null;
      }
    } catch (error) {
      console.error(`❌ [LOAD_SPECIFIC] Erreur lors du chargement de la signature ${type}:`, error);
      return null;
    }
  }

  /**
   * Met à jour directement une signature dans le gestionnaire
   * Utile pour forcer une mise à jour sans passer par la sauvegarde complète
   * 
   * @param type Type de signature
   * @param url URL de la signature
   */
  updateSignature(type: SignatureType, url: string): void {
    console.log(`📝 [UPDATE_SIG] Mise à jour de la signature ${type}`);
    // @ts-ignore
    if (this.signatures.hasOwnProperty(type)) {
      // @ts-ignore
      this.signatures[type] = url;
      this.onSignatureChange(type, url);
    } else {
      console.warn(`⚠️ [UPDATE_SIG] Tentative de mise à jour d'un type de signature inconnu: ${type}`);
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
            this.onSignatureChange('participant', this.signatures.participant);
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
            this.onSignatureChange('trainer', this.signatures.trainer);
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
            this.onSignatureChange('representative', this.signatures.representative);
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
            this.onSignatureChange('companySeal', this.signatures.companySeal);
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