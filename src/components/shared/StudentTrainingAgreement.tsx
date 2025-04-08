import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

// Constantes pour la gestion du cache
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes en millisecondes
const CACHE_PREFIX = 'signature_cache_';

const StudentTrainingAgreement: React.FC = () => {
  const [training, setTraining] = useState({ id: '' });
  const [participant, setParticipant] = useState({ id: '' });
  const [signatures, setSignatures] = useState({
    participantSignature: null,
    trainerSignature: null,
    companySeal: null,
    organizationSeal: null
  });

  // Fonction optimisée pour charger les signatures
  const loadSignatures = async () => {
    try {
      const cacheKey = `${CACHE_PREFIX}${training.id}_${participant.id}`;
      const cachedData = localStorage.getItem(cacheKey);
      
      if (cachedData) {
        const { data, timestamp } = JSON.parse(cachedData);
        const isExpired = Date.now() - timestamp > CACHE_DURATION;
        
        if (!isExpired) {
          console.log("✅ [CACHE] Utilisation des signatures en cache");
          setSignatures(data);
          return;
        }
      }

      console.log("🔄 [DB] Chargement des signatures depuis la base de données");
      
      // Chargement optimisé avec une seule requête
      const { data: documents, error } = await supabase
        .from('documents')
        .select('*')
        .in('type', ['attestation', 'convention'])
        .eq('training_id', training.id)
        .or(`user_id.eq.${participant.id},title.ilike.%formateur%,title.ilike.%tampon%`)
        .order('created_at', { ascending: false });

      if (error) {
        console.error("❌ [DB] Erreur lors du chargement des signatures:", error);
        return;
      }

      // Traitement optimisé des résultats
      const newSignatures = {
        participantSignature: documents.find(d => d.user_id === participant.id)?.file_url || null,
        trainerSignature: documents.find(d => d.title?.toLowerCase().includes('formateur'))?.file_url || null,
        companySeal: documents.find(d => d.title?.toLowerCase().includes('tampon') && d.title?.toLowerCase().includes('entreprise'))?.file_url || null,
        organizationSeal: documents.find(d => d.title?.toLowerCase().includes('tampon') && d.title?.toLowerCase().includes('organisme'))?.file_url || null
      };

      // Mise en cache des résultats
      localStorage.setItem(cacheKey, JSON.stringify({
        data: newSignatures,
        timestamp: Date.now()
      }));

      console.log("✅ [DB] Signatures chargées et mises en cache");
      setSignatures(newSignatures);
      
    } catch (error) {
      console.error("❌ [DB] Exception lors du chargement des signatures:", error);
    }
  };

  // Optimisation du useEffect pour le chargement initial
  useEffect(() => {
    if (training.id && participant.id) {
      loadSignatures();
    }
  }, [training.id, participant.id]);

  // Optimisation de la fonction de mise à jour des signatures
  const updateSignature = async (type: 'participant' | 'trainer' | 'companySeal' | 'organizationSeal', url: string) => {
    const cacheKey = `${CACHE_PREFIX}${training.id}_${participant.id}`;
    const cachedData = localStorage.getItem(cacheKey);
    
    if (cachedData) {
      const { data } = JSON.parse(cachedData);
      const newData = { ...data, [type]: url };
      
      localStorage.setItem(cacheKey, JSON.stringify({
        data: newData,
        timestamp: Date.now()
      }));
    }
    
    setSignatures(prev => ({ ...prev, [type]: url }));
  };

  return (
    <div>
      {/* Render your component content here */}
    </div>
  );
};

export default StudentTrainingAgreement; 