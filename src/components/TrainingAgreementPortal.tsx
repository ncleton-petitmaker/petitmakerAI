import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { StudentTrainingAgreement } from './StudentTrainingAgreement';
import { supabase } from '../lib/supabase';

interface TrainingAgreementPortalProps {
  training: {
    id: string;
    title: string;
    duration: string;
    trainer_name: string;
    location: string;
    start_date: string | null;
    end_date: string | null;
  };
  userId: string;
  onCancel: () => void;
  onDocumentOpen?: () => void;
  onDocumentClose?: () => void;
}

/**
 * Composant gérant proprement l'affichage de la convention de formation dans un portail
 * Évite les problèmes de createRoot multiples
 */
export const TrainingAgreementPortal: React.FC<TrainingAgreementPortalProps> = ({
  training,
  userId,
  onCancel,
  onDocumentOpen,
  onDocumentClose
}) => {
  const [participant, setParticipant] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [portalElement, setPortalElement] = useState<HTMLElement | null>(null);
  
  // Créer l'élément de portail une seule fois
  useEffect(() => {
    // Vérifier si l'élément de portail existe déjà
    let portal = document.getElementById('training-agreement-portal');
    
    // S'il n'existe pas, le créer
    if (!portal) {
      portal = document.createElement('div');
      portal.id = 'training-agreement-portal';
      document.body.appendChild(portal);
    }
    
    setPortalElement(portal);
    
    // Nettoyer lors du démontage
    return () => {
      // Ne pas supprimer l'élément, juste le vider
      if (portal) {
        portal.innerHTML = '';
      }
    };
  }, []);
  
  // Charger les données du participant
  useEffect(() => {
    const fetchParticipantData = async () => {
      setIsLoading(true);
      try {
        console.log('🔍 [DEBUG] TrainingAgreementPortal - Chargement des données du participant:', userId);
        
        // Récupérer les données du participant
        const { data, error } = await supabase
          .from('user_profiles')
          .select('first_name, last_name, job_position, company, has_signed_agreement')
          .eq('id', userId)
          .single();
          
        if (error) {
          console.error('🔍 [DEBUG] TrainingAgreementPortal - Erreur lors de la récupération des données du participant:', error);
          throw error;
        }
        
        if (data) {
          console.log('🔍 [DEBUG] TrainingAgreementPortal - Données du participant récupérées:', data);
          setParticipant({
            id: userId,
            first_name: data.first_name,
            last_name: data.last_name,
            job_position: data.job_position || '',
            company: data.company || '',
            has_signed_agreement: data.has_signed_agreement || false
          });
        }
      } catch (error) {
        console.error('Erreur lors de la récupération des données du participant:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchParticipantData();
  }, [userId]);
  
  // Informer le parent que le document a été ouvert
  useEffect(() => {
    if (onDocumentOpen) {
      onDocumentOpen();
    }
    
    // Nettoyer lors du démontage
    return () => {
      if (onDocumentClose) {
        onDocumentClose();
      }
    };
  }, [onDocumentOpen, onDocumentClose]);
  
  // Ne rien afficher si le portail n'est pas prêt ou si les données ne sont pas chargées
  if (!portalElement || isLoading || !participant) {
    return null;
  }
  
  // Créer le portail avec le contenu
  return createPortal(
    <StudentTrainingAgreement
      training={training}
      participant={participant}
      onCancel={onCancel}
      onDocumentOpen={onDocumentOpen}
      onDocumentClose={onDocumentClose}
    />,
    portalElement
  );
}; 