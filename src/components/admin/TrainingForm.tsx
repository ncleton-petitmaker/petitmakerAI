import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Copy, Calendar, Plus, Trash2, Clock, Wand2 } from 'lucide-react';
import DatePicker, { registerLocale } from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { fr } from 'date-fns/locale';
import OpenAI from 'openai';
import { differenceInDays, differenceInHours, differenceInMinutes, addDays, parseISO } from 'date-fns';
import { createClient } from '@supabase/supabase-js';

/**
 * IMPORTANT: Simplification de la structure de données des formations
 * 
 * Suite à la simplification de la base de données, les périodes et les créneaux horaires
 * ne sont plus stockés dans des tables séparées (training_periods et training_time_slots),
 * mais directement dans le champ 'metadata' de la table 'trainings'.
 * 
 * Le champ 'metadata' est un objet JSON qui contient:
 * - periods: tableau des périodes de formation
 * - timeSlots: tableau des créneaux horaires
 * - duration_details: informations détaillées sur la durée
 * - last_updated: date de dernière mise à jour
 * 
 * Cette approche simplifie la gestion des permissions RLS et évite les problèmes
 * d'accès aux tables liées.
 */

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// Enregistrer la locale française
registerLocale('fr', fr);

interface Company {
  id: string;
  name: string;
  siret?: string;
}

interface Training {
  id: string;
  title: string;
  company_id: string | null;
  target_audience: string;
  prerequisites: string;
  duration: string;
  dates: string;
  schedule: string;
  min_participants: number;
  max_participants: number;
  registration_deadline: string;
  location: string;
  price: number | null;
  objectives: string[];
  content: string;
  evaluation_methods: {
    profile_evaluation: boolean;
    skills_evaluation: boolean;
    knowledge_evaluation: boolean;
    satisfaction_survey: boolean;
  };
  tracking_methods: {
    attendance_sheet: boolean;
    completion_certificate: boolean;
  };
  pedagogical_methods: {
    needs_evaluation: boolean;
    theoretical_content: boolean;
    practical_exercises: boolean;
    case_studies: boolean;
    experience_sharing: boolean;
    digital_support: boolean;
  };
  material_elements: {
    computer_provided: boolean;
    pedagogical_material: boolean;
    digital_support_provided: boolean;
  };
  status: string;
  start_date?: string | null;
  end_date?: string | null;
  trainer_name?: string;
  trainer_id?: string;
}

interface Period {
  id: string;
  startDate: Date | null;
  endDate: Date | null;
}

interface TimeSlot {
  id: string;
  startTime: string;
  endTime: string;
}

interface Trainer {
  id: string;
  full_name: string;
  email: string;
}

interface TrainingFormProps {
  training: Training | null;
  companies: Company[];
  onSubmit: (trainingData: any) => void;
  onCancel: () => void;
  onDuplicate?: (trainingData: Training) => void;
}

export const TrainingForm: React.FC<TrainingFormProps> = ({
  training,
  companies,
  onSubmit,
  onCancel,
  onDuplicate
}) => {
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});
  const [generatingContent, setGeneratingContent] = useState(false);
  const [generationStep, setGenerationStep] = useState(0);
  const [generationSubStep, setGenerationSubStep] = useState(0);
  const [loadingDots, setLoadingDots] = useState('');
  const [formData, setFormData] = useState<Partial<Training>>({
    title: '',
    company_id: null,
    target_audience: '',
    prerequisites: '',
    duration: '',
    dates: '',
    schedule: '',
    min_participants: 1,
    max_participants: 10,
    registration_deadline: '',
    location: '',
    price: null,
    objectives: [''],
    content: '',
    evaluation_methods: {
      profile_evaluation: false,
      skills_evaluation: false,
      knowledge_evaluation: false,
      satisfaction_survey: false
    },
    tracking_methods: {
      attendance_sheet: false,
      completion_certificate: false
    },
    pedagogical_methods: {
      needs_evaluation: false,
      theoretical_content: false,
      practical_exercises: false,
      case_studies: false,
      experience_sharing: false,
      digital_support: false
    },
    material_elements: {
      computer_provided: false,
      pedagogical_material: false,
      digital_support_provided: false
    },
    status: 'draft',
    trainer_name: '',
    trainer_id: ''
  });
  
  // Étapes détaillées du processus de génération du contenu
  const contentGenerationSteps = [
    { // Étape 0: Analyse
      title: "Analyse des objectifs et du contexte",
      subSteps: [
        "Analyse du titre de la formation",
        "Analyse des objectifs pédagogiques",
        "Identification du public cible",
        "Évaluation des prérequis",
        "Analyse de la durée de formation"
      ]
    },
    { // Étape 1: Structuration
      title: "Structuration du contenu",
      subSteps: [
        "Définition des modules principaux",
        "Répartition du temps par module",
        "Organisation des sous-sections",
        "Équilibrage du contenu théorique et pratique",
        "Adaptation au format de la formation"
      ]
    },
    { // Étape 2: Rédaction
      title: "Rédaction du contenu détaillé",
      subSteps: [
        "Rédaction des titres de modules",
        "Élaboration des sous-sections",
        "Définition des durées par section",
        "Ajout des points clés et exemples",
        "Finalisation de la structure du contenu"
      ]
    },
    { // Étape 3: Finalisation
      title: "Finalisation du programme",
      subSteps: [
        "Vérification de la cohérence globale",
        "Validation de la répartition du temps",
        "Alignement avec les objectifs pédagogiques",
        "Formatage du contenu",
        "Préparation du résultat final"
      ]
    }
  ];
  
  // Effet pour animer les points de chargement
  useEffect(() => {
    if (generatingContent) {
      const dotsInterval = setInterval(() => {
        setLoadingDots(prev => {
          if (prev.length >= 3) return '';
          return prev + '.';
        });
      }, 500);
      
      // Effet pour changer les sous-étapes
      const subStepInterval = setInterval(() => {
        const currentStepSubSteps = contentGenerationSteps[generationStep].subSteps;
        setGenerationSubStep(prev => {
          if (prev >= currentStepSubSteps.length - 1) return prev;
          return prev + 1;
        });
      }, 2000);
      
      // Effet pour changer les étapes principales
      const stepInterval = setInterval(() => {
        setGenerationStep(prev => {
          if (prev >= contentGenerationSteps.length - 1) return prev;
          return prev + 1;
        });
        setGenerationSubStep(0);
      }, 10000);
      
      return () => {
        clearInterval(dotsInterval);
        clearInterval(subStepInterval);
        clearInterval(stepInterval);
      };
    } else {
      setGenerationStep(0);
      setGenerationSubStep(0);
    }
  }, [generatingContent]);
  
  // Fonction pour extraire les métadonnées du training
  const extractMetadata = (training: any) => {
    let extractedPeriods = [];
    let extractedTimeSlots = [];
    
    // Extraire les métadonnées du champ metadata s'il existe
    if (training?.metadata) {
      try {
        // Si metadata est déjà un objet, l'utiliser directement
        const metadata = typeof training.metadata === 'string' 
          ? JSON.parse(training.metadata) 
          : training.metadata;
        
        if (metadata?.periods && Array.isArray(metadata.periods)) {
          extractedPeriods = metadata.periods;
        }
        if (metadata?.timeSlots && Array.isArray(metadata.timeSlots)) {
          extractedTimeSlots = metadata.timeSlots;
        }
      } catch (error) {
        console.warn('Erreur lors du parsing des métadonnées:', error);
      }
    }
    
    // Si aucune période n'a été trouvée dans metadata, essayer d'extraire des données du champ dates
    if (extractedPeriods.length === 0 && training?.dates) {
      try {
        // Rechercher un format JSON dans le champ dates
        const jsonMatch = training.dates.match(/\[JSON:(.*)\]/);
        if (jsonMatch && jsonMatch[1]) {
          const periodsData = JSON.parse(jsonMatch[1]);
          if (Array.isArray(periodsData)) {
            extractedPeriods = periodsData;
            console.log('Périodes extraites du champ dates:', extractedPeriods);
          }
        }
      } catch (error) {
        console.warn('Erreur lors de l\'extraction des périodes du champ dates:', error);
      }
    }
    
    // Si aucune période n'a été trouvée et qu'il y a des dates de début et de fin, créer une période par défaut
    if (extractedPeriods.length === 0 && training?.start_date && training?.end_date) {
      extractedPeriods = [{
        id: '1',
        start_date: training.start_date,
        end_date: training.end_date
      }];
    }
    
    // Si aucune tranche horaire n'a été trouvée dans metadata, essayer d'extraire des données du champ schedule
    if (extractedTimeSlots.length === 0 && training?.schedule) {
      try {
        // Rechercher un format JSON dans le champ schedule
        const jsonMatch = training.schedule.match(/\[JSON:(.*)\]/);
        if (jsonMatch && jsonMatch[1]) {
          const timeSlotsData = JSON.parse(jsonMatch[1]);
          if (Array.isArray(timeSlotsData)) {
            extractedTimeSlots = timeSlotsData;
            console.log('Tranches horaires extraites du champ schedule:', extractedTimeSlots);
          }
        } else {
          // Essayer d'extraire les tranches horaires du texte formaté
          const timeSlotRegex = /De (\d+)h(\d*) à (\d+)h(\d*)/g;
          let match;
          while ((match = timeSlotRegex.exec(training.schedule)) !== null) {
            const startHour = match[1].padStart(2, '0');
            const startMinute = match[2] || '00';
            const endHour = match[3].padStart(2, '0');
            const endMinute = match[4] || '00';
            
            extractedTimeSlots.push({
              id: extractedTimeSlots.length.toString(),
              startTime: `${startHour}:${startMinute}`,
              endTime: `${endHour}:${endMinute}`
            });
          }
        }
      } catch (error) {
        console.warn('Erreur lors de l\'extraction des tranches horaires du champ schedule:', error);
      }
    }
    
    // Si aucune tranche horaire n'a été trouvée, créer une tranche par défaut
    if (extractedTimeSlots.length === 0) {
      extractedTimeSlots = [{
        id: '1',
        startTime: '09:00',
        endTime: '17:30'
      }];
    }
    
    return { extractedPeriods, extractedTimeSlots };
  };
  
  const metadata = extractMetadata(training);
  
  // État pour les dates de début et de fin
  const [startDate, setStartDate] = useState<Date | null>(
    training?.start_date ? new Date(training.start_date) : null
  );
  const [endDate, setEndDate] = useState<Date | null>(
    training?.end_date ? new Date(training.end_date) : null
  );
  
  // État pour gérer plusieurs périodes
  const [periods, setPeriods] = useState<Period[]>(() => {
    // Si des périodes existent dans les métadonnées, les utiliser
    if (metadata && metadata.extractedPeriods && Array.isArray(metadata.extractedPeriods)) {
      return metadata.extractedPeriods.map((p: any, index: number) => ({
        id: index.toString(),
        startDate: p.start_date ? new Date(p.start_date) : null,
        endDate: p.end_date ? new Date(p.end_date) : null
      }));
    }
    // Sinon, créer une période par défaut
    return [{ 
      id: '1', 
      startDate: training?.start_date ? new Date(training.start_date) : null,
      endDate: training?.end_date ? new Date(training.end_date) : null
    }];
  });
  
  // État pour gérer plusieurs tranches horaires
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>(() => {
    // Si des tranches horaires existent dans les métadonnées, les utiliser
    if (metadata && metadata.extractedTimeSlots && Array.isArray(metadata.extractedTimeSlots)) {
      return metadata.extractedTimeSlots.map((slot: any, index: number) => ({
        id: index.toString(),
        startTime: slot.startTime || '09:00',
        endTime: slot.endTime || '17:30'
      }));
    }
    
    // Sinon, extraire les horaires du champ schedule si possible
    if (training?.schedule) {
      const scheduleMatch = training.schedule.match(/De (\d{1,2}[h:]\d{0,2}) à (\d{1,2}[h:]\d{0,2})/i);
      if (scheduleMatch && scheduleMatch.length >= 3) {
        let startTime = scheduleMatch[1].replace('h', ':');
        let endTime = scheduleMatch[2].replace('h', ':');
        
        // S'assurer que les heures sont au format HH:MM
        if (startTime.indexOf(':') === -1) startTime += ':00';
        if (endTime.indexOf(':') === -1) endTime += ':00';
        
        // Assurer que les heures sont bien formatées avec deux chiffres
        startTime = startTime.replace(/^(\d):/, '0$1:');
        endTime = endTime.replace(/^(\d):/, '0$1:');
        
        return [{ id: '1', startTime, endTime }];
      }
      
      // Vérifier s'il y a plusieurs tranches (avec "et")
      const multipleSlotsMatch = training.schedule.split(' et ');
      if (multipleSlotsMatch.length > 1) {
        return multipleSlotsMatch.map((slotText, index) => {
          const match = slotText.match(/De (\d{1,2}[h:]\d{0,2}) à (\d{1,2}[h:]\d{0,2})/i);
          if (match && match.length >= 3) {
            let startTime = match[1].replace('h', ':');
            let endTime = match[2].replace('h', ':');
            
            // S'assurer que les heures sont au format HH:MM
            if (startTime.indexOf(':') === -1) startTime += ':00';
            if (endTime.indexOf(':') === -1) endTime += ':00';
            
            // Assurer que les heures sont bien formatées avec deux chiffres
            startTime = startTime.replace(/^(\d):/, '0$1:');
            endTime = endTime.replace(/^(\d):/, '0$1:');
            
            return { id: index.toString(), startTime, endTime };
          }
          return { id: index.toString(), startTime: '09:00', endTime: '17:30' };
        });
      }
    }
    
    // Par défaut, créer une tranche horaire standard
    return [{ 
      id: '1', 
      startTime: '09:00',
      endTime: '17:30'
    }];
  });
  
  // Mettre à jour les dates et horaires dans formData lorsque les périodes et tranches changent
  useEffect(() => {
    if (periods.length > 0) {
      const formatDate = (date: Date | null) => {
        if (!date) return '';
        return date.toLocaleDateString('fr-FR');
      };
      
      // Trouver les dates de début et de fin globales
      let firstStartDate: Date | null = null;
      let lastEndDate: Date | null = null;
      
      periods.forEach(period => {
        if (period.startDate && (!firstStartDate || period.startDate < firstStartDate)) {
          firstStartDate = period.startDate;
        }
        if (period.endDate && (!lastEndDate || period.endDate > lastEndDate)) {
          lastEndDate = period.endDate;
        }
      });
      
      // Formater le texte des dates
      let datesText = '';
      if (periods.length === 1) {
        const period = periods[0];
        if (period.startDate && period.endDate) {
          if (formatDate(period.startDate) === formatDate(period.endDate)) {
            datesText = `Le ${formatDate(period.startDate)}`;
          } else {
            datesText = `Du ${formatDate(period.startDate)} au ${formatDate(period.endDate)}`;
          }
        } else if (period.startDate) {
          datesText = `Le ${formatDate(period.startDate)}`;
        }
      } else {
        // Pour plusieurs périodes, créer une liste
        datesText = periods
          .filter(p => p.startDate)
          .map(p => {
            if (p.startDate && p.endDate) {
              if (formatDate(p.startDate) === formatDate(p.endDate)) {
                return `Le ${formatDate(p.startDate)}`;
              } else {
                return `Du ${formatDate(p.startDate)} au ${formatDate(p.endDate)}`;
              }
            } else if (p.startDate) {
              return `Le ${formatDate(p.startDate)}`;
            }
            return '';
          })
          .filter(text => text !== '')
          .join(' ; ');
      }
      
      setFormData(prev => ({
        ...prev,
        dates: datesText,
        start_date: firstStartDate ? firstStartDate.toISOString() : null,
        end_date: lastEndDate ? lastEndDate.toISOString() : null
      }));
      
      // Mettre à jour également startDate et endDate pour la compatibilité
      setStartDate(firstStartDate);
      setEndDate(lastEndDate);
    }
  }, [periods]);
  
  useEffect(() => {
    if (timeSlots.length > 0) {
      // Formater le texte des horaires
      let scheduleText = '';
      if (timeSlots.length === 1) {
        const slot = timeSlots[0];
        scheduleText = `De ${slot.startTime} à ${slot.endTime}`;
      } else {
        // Pour plusieurs tranches, créer une liste
        scheduleText = timeSlots
          .map(slot => `De ${slot.startTime} à ${slot.endTime}`)
          .join(' et ');
      }
      
      setFormData(prev => ({
        ...prev,
        schedule: scheduleText
      }));
    }
  }, [timeSlots]);
  
  // Fonction pour calculer la durée en fonction des dates et horaires
  const calculateDuration = () => {
    if (periods.length === 0 || timeSlots.length === 0) {
      return "À définir";
    }
    
    // Filtrer les périodes valides (avec dates de début et de fin)
    const validPeriods = periods.filter(p => p.startDate && p.endDate);
    if (validPeriods.length === 0) {
      return "À définir";
    }
    
    // Calculer le nombre total de jours de formation
    let totalDays = 0;
    validPeriods.forEach(period => {
      if (period.startDate && period.endDate) {
        // Ajouter 1 pour inclure le jour de fin
        const days = differenceInDays(period.endDate, period.startDate) + 1;
        totalDays += days;
      }
    });
    
    // Calculer la durée quotidienne en heures
    let dailyHours = 0;
    timeSlots.forEach(slot => {
      if (slot.startTime && slot.endTime) {
        // Convertir les heures au format Date pour calculer la différence
        const [startHour, startMinute] = slot.startTime.split(':').map(Number);
        const [endHour, endMinute] = slot.endTime.split(':').map(Number);
        
        const startDate = new Date();
        startDate.setHours(startHour, startMinute, 0);
        
        const endDate = new Date();
        endDate.setHours(endHour, endMinute, 0);
        
        // Si l'heure de fin est avant l'heure de début, on suppose que c'est le jour suivant
        if (endDate < startDate) {
          endDate.setDate(endDate.getDate() + 1);
        }
        
        const diffMinutes = differenceInMinutes(endDate, startDate);
        dailyHours += diffMinutes / 60;
      }
    });
    
    // Calculer le nombre total d'heures de formation
    const totalHours = totalDays * dailyHours;
    
    // Formater la durée
    if (totalDays === 1) {
      return `1 jour soit ${totalHours}h`;
    } else {
      return `${totalDays} jours soit ${totalHours}h`;
    }
  };
  
  // Mettre à jour la durée lorsque les dates ou horaires changent
  useEffect(() => {
    const calculatedDuration = calculateDuration();
    setFormData(prev => ({
      ...prev,
      duration: calculatedDuration
    }));
  }, [periods, timeSlots]);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    // Cas spécial pour le formateur : mettre à jour à la fois trainer_name et trainer_id
    if (name === 'trainer_id') {
      const selectedTrainer = trainers.find(t => t.id === value);
      setFormData(prev => ({
        ...prev,
        trainer_id: value,
        trainer_name: selectedTrainer ? selectedTrainer.full_name : ''
      }));
    } else {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    }
    
    // Clear validation error for this field
    if (validationErrors[name]) {
      setValidationErrors({
        ...validationErrors,
        [name]: ''
      });
    }
  };
  
  const handleObjectiveChange = (index: number, value: string) => {
    // S'assurer que objectives est un tableau avant de le modifier
    const currentObjectives = Array.isArray(formData.objectives) ? [...formData.objectives] : [];
    currentObjectives[index] = value;
    setFormData(prev => ({
      ...prev,
      objectives: currentObjectives
    }));
  };
  
  const addObjective = () => {
    const currentObjectives = Array.isArray(formData.objectives) ? [...formData.objectives] : [];
    setFormData(prev => ({
      ...prev,
      objectives: [...currentObjectives, '']
    }));
  };
  
  const removeObjective = (index: number) => {
    setFormData(prev => ({
      ...prev,
      objectives: Array.isArray(prev.objectives) 
        ? prev.objectives.filter((_, i) => i !== index)
        : []
    }));
  };
  
  const handleCheckboxChange = (category: keyof Training, field: string) => {
    const categoryValue = formData[category] as Record<string, boolean>;
    if (categoryValue && typeof categoryValue === 'object') {
      setFormData(prev => ({
        ...prev,
        [category]: {
          ...categoryValue,
          [field]: !categoryValue[field]
        }
      }));
    }
  };
  
  // Fonction pour ajouter une nouvelle période
  const addPeriod = () => {
    setPeriods([...periods, { id: Date.now().toString(), startDate: null, endDate: null }]);
  };
  
  // Fonction pour supprimer une période
  const removePeriod = (id: string) => {
    if (periods.length > 1) {
      setPeriods(periods.filter(p => p.id !== id));
    }
  };
  
  // Fonction pour mettre à jour une période
  const updatePeriod = (id: string, startDate: Date | null, endDate: Date | null) => {
    const updatedPeriods = periods.map(p => 
      p.id === id ? { ...p, startDate, endDate } : p
    );
    setPeriods(updatedPeriods);
    
    // Mettre à jour le champ dates
    const formattedDates = formatDatesFromPeriods(updatedPeriods);
    setFormData(prev => ({
      ...prev,
      dates: formattedDates
    }));
  };
  
  // Fonction pour ajouter une nouvelle tranche horaire
  const addTimeSlot = () => {
    setTimeSlots([...timeSlots, { 
      id: Date.now().toString(), 
      startTime: '09:00',
      endTime: '17:30'
    }]);
  };
  
  // Fonction pour supprimer une tranche horaire
  const removeTimeSlot = (id: string) => {
    if (timeSlots.length > 1) {
      setTimeSlots(timeSlots.filter(slot => slot.id !== id));
    }
  };
  
  // Fonction pour mettre à jour une tranche horaire
  const updateTimeSlot = (id: string, field: 'startTime' | 'endTime', value: string) => {
    const updatedTimeSlots = timeSlots.map(slot => 
      slot.id === id ? { ...slot, [field]: value } : slot
    );
    setTimeSlots(updatedTimeSlots);
    
    // Mettre à jour le champ schedule
    const formattedSchedule = formatScheduleFromTimeSlots(updatedTimeSlots);
    setFormData(prev => ({
      ...prev,
      schedule: formattedSchedule
    }));
  };
  
  // Fonction pour formater les dates à partir des périodes
  const formatDatesFromPeriods = (periodsArray: Period[]) => {
    const validPeriods = periodsArray.filter(p => p.startDate && p.endDate);
    if (validPeriods.length === 0) return "À définir";
    
    const formatDate = (date: Date | null) => {
      if (!date) return "";
      return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };
    
    if (validPeriods.length === 1) {
      const period = validPeriods[0];
      if (period.startDate && period.endDate) {
        if (period.startDate.getTime() === period.endDate.getTime()) {
          return `Le ${formatDate(period.startDate)}`;
        } else {
          return `Du ${formatDate(period.startDate)} au ${formatDate(period.endDate)}`;
        }
      }
    }
    
    return validPeriods
      .map(p => {
        if (p.startDate && p.endDate) {
          if (p.startDate.getTime() === p.endDate.getTime()) {
            return `Le ${formatDate(p.startDate)}`;
          } else {
            return `Du ${formatDate(p.startDate)} au ${formatDate(p.endDate)}`;
          }
        }
        return "";
      })
      .filter(text => text)
      .join(', ');
  };
  
  // Fonction pour formater les horaires à partir des tranches horaires
  const formatScheduleFromTimeSlots = (timeSlotsArray: TimeSlot[]) => {
    if (timeSlotsArray.length === 0) return "À définir";
    
    const formatTime = (time: string) => {
      return time.replace(':', 'h');
    };
    
    if (timeSlotsArray.length === 1) {
      const slot = timeSlotsArray[0];
      return `De ${formatTime(slot.startTime)} à ${formatTime(slot.endTime)}`;
    }
    
    return timeSlotsArray
      .map(slot => `De ${formatTime(slot.startTime)} à ${formatTime(slot.endTime)}`)
      .join(' et ');
  };
  
  // Fonction pour générer le contenu de la formation
  const generateTrainingContent = async () => {
    // Vérifier si objectives est un tableau et s'il a au moins un élément
    const hasObjectives = Array.isArray(formData.objectives) && formData.objectives.length > 0;
    
    if (!formData.title || !hasObjectives) {
      setValidationErrors({
        ...validationErrors,
        title: !formData.title ? 'Le titre est requis pour générer le contenu' : '',
        objectives: !hasObjectives ? 'Au moins un objectif est requis pour générer le contenu' : ''
      });
      return;
    }
    
    try {
      setGeneratingContent(true);
      setGenerationStep(0);
      setGenerationSubStep(0);
      
      // Calculer la durée totale en heures à partir de la durée calculée
      let totalHours = 7; // Valeur par défaut (1 jour = 7h)
      
      // Utiliser la durée calculée automatiquement
      const calculatedDuration = calculateDuration();
      const durationMatch = calculatedDuration.match(/soit\s+(\d+(?:\.\d+)?)h/i);
      if (durationMatch) {
        totalHours = parseFloat(durationMatch[1]);
      } else {
        // Fallback: essayer de calculer à partir des périodes et tranches horaires
        const validPeriods = periods.filter(p => p.startDate && p.endDate);
        let totalDays = 0;
        
        validPeriods.forEach(period => {
          if (period.startDate && period.endDate) {
            const days = differenceInDays(period.endDate, period.startDate) + 1;
            totalDays += days;
          }
        });
        
        let dailyHours = 0;
        timeSlots.forEach(slot => {
          if (slot.startTime && slot.endTime) {
            const [startHour, startMinute] = slot.startTime.split(':').map(Number);
            const [endHour, endMinute] = slot.endTime.split(':').map(Number);
            
            const startDate = new Date();
            startDate.setHours(startHour, startMinute, 0);
            
            const endDate = new Date();
            endDate.setHours(endHour, endMinute, 0);
            
            if (endDate < startDate) {
              endDate.setDate(endDate.getDate() + 1);
            }
            
            const diffMinutes = differenceInMinutes(endDate, startDate);
            dailyHours += diffMinutes / 60;
          }
        });
        
        totalHours = totalDays * dailyHours;
      }
      
      // Arrondir à une décimale pour plus de clarté
      totalHours = Math.round(totalHours * 10) / 10;
      
      // Obtenir les détails des périodes et tranches horaires pour le prompt
      const periodsDetails = periods
        .filter(p => p.startDate && p.endDate)
        .map(p => {
          const formatDate = (date: Date | null) => {
            if (!date) return "";
            return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
          };
          
          return `${formatDate(p.startDate)} au ${formatDate(p.endDate)}`;
        })
        .join(', ');
      
      const timeSlotsDetails = timeSlots
        .map(slot => {
          const formatTime = (time: string) => time.replace(':', 'h');
          return `${formatTime(slot.startTime)} à ${formatTime(slot.endTime)}`;
        })
        .join(', ');
      
      // Initialiser l'API OpenAI
      const openai = new OpenAI({
        apiKey: import.meta.env.VITE_OPENAI_API_KEY,
        dangerouslyAllowBrowser: true
      });
      
      // Construire le prompt
      const prompt = `
Je suis un expert en ingénierie pédagogique et je dois créer un programme de formation détaillé.

<titre_formation>
${formData.title}
</titre_formation>

<objectifs_formation>
${Array.isArray(formData.objectives) ? formData.objectives.map((obj, index) => `${index + 1}. ${obj}`).join('\n') : ''}
</objectifs_formation>

<public_cible>
${formData.target_audience}
</public_cible>

<prerequis>
${formData.prerequisites}
</prerequis>

<duree_totale>
${totalHours} heures
</duree_totale>

<periodes_formation>
${periodsDetails || "Non spécifié"}
</periodes_formation>

<horaires_formation>
${timeSlotsDetails || "Non spécifié"}
</horaires_formation>

Veuillez créer un programme de formation structuré avec les caractéristiques suivantes :

1. Divisez la formation en 3-4 modules principaux, chacun avec un titre clair commençant par "MODULE X – " et suivi de la durée totale du module entre parenthèses.
2. Pour chaque module, créez des sections et sous-sections avec des durées spécifiques entre parenthèses.
3. Utilisez le format suivant :
   - Utilisez "📌" au début de chaque titre de module
   - Utilisez "•" pour les sections principales
   - Utilisez "o" pour les sous-sections
   - Indiquez la durée de chaque section principale entre parenthèses
   - IMPORTANT : Exprimez TOUTES les durées en HEURES uniquement (jamais en minutes). Utilisez des décimales si nécessaire (ex: 1.5h au lieu de 1h30min)
4. IMPORTANT : La somme des durées de tous les modules DOIT être EXACTEMENT égale à la durée totale de la formation (${totalHours} heures).
5. IMPORTANT : La somme des durées des sections de chaque module DOIT être égale à la durée du module.
6. IMPORTANT : Pour chaque section principale, si elle contient des sous-sections, la durée de la section doit être égale à la somme des durées implicites des sous-sections.
7. Adaptez le contenu au public cible et aux prérequis spécifiés.
8. Alignez chaque module avec les objectifs pédagogiques.
9. Incluez une variété d'activités : présentations théoriques, exercices pratiques, discussions, études de cas, etc.
10. Utilisez des émojis pertinents (comme 💡) pour mettre en évidence des points importants ou des conseils.

<verification_coherence>
Avant de finaliser le programme, vérifiez attentivement les points suivants :
1. La somme des durées de tous les modules est-elle exactement égale à ${totalHours} heures ?
2. Pour chaque module, la somme des durées des sections est-elle égale à la durée du module ?
3. Toutes les durées sont-elles exprimées en heures uniquement (jamais en minutes) ?
4. Pour chaque section principale avec des sous-sections, la durée de la section est-elle cohérente avec le contenu des sous-sections ?
5. Les durées sont-elles réalistes pour le contenu proposé ?
6. Chaque objectif pédagogique est-il couvert par au moins une section ?
7. Le programme est-il adapté au public cible et aux prérequis ?
8. Les activités sont-elles variées et pertinentes ?
9. Le format est-il respecté (📌, •, o, durées entre parenthèses) ?

Si l'une de ces vérifications échoue, ajustez le programme en conséquence avant de le finaliser.
</verification_coherence>

Voici un exemple de format attendu :

📌 MODULE 1 – Titre du module (Xh)
• Section principale 1 (Xh) 
o Sous-section 1
o Sous-section 2
• Section principale 2 (Xh)
o Sous-section 1
o Sous-section 2

Retournez uniquement le contenu formaté, sans introduction ni conclusion supplémentaire.`;

      // Simuler un délai pour les étapes d'animation
      await new Promise(resolve => setTimeout(resolve, 5000)); // Étape 0: Analyse
      setGenerationStep(1);
      setGenerationSubStep(0);
      
      await new Promise(resolve => setTimeout(resolve, 5000)); // Étape 1: Structuration
      setGenerationStep(2);
      setGenerationSubStep(0);
      
      // Appeler l'API OpenAI
      const response = await openai.chat.completions.create({
        model: "o3-mini",
        messages: [
          {
            role: "system",
            content: `Vous êtes un expert en ingénierie pédagogique spécialisé dans la création de programmes de formation professionnelle. 
Vous créez des programmes détaillés, bien structurés et adaptés aux objectifs pédagogiques.
Vous êtes particulièrement attentif à la cohérence des durées : 
1. La somme des durées des modules doit être exactement égale à la durée totale de la formation
2. Pour chaque module, la somme des durées des sections doit être égale à la durée du module
3. Toutes les durées doivent être exprimées en heures uniquement (jamais en minutes)
4. Pour chaque section avec des sous-sections, la durée de la section doit être cohérente avec le contenu des sous-sections

Vous vérifiez systématiquement la cohérence mathématique des durées avant de finaliser le programme.`
          },
          {
            role: "user",
            content: prompt
          }
        ]
      });
      
      const generatedContent = response.choices[0].message.content;
      
      // Étape 3: Finalisation
      setGenerationStep(3);
      setGenerationSubStep(0);
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Mettre à jour le formulaire avec le contenu généré
      setFormData({
        ...formData,
        content: generatedContent || ''
      });
      
      setGeneratingContent(false);
    } catch (error) {
      console.error('Erreur lors de la génération du contenu:', error);
      setValidationErrors({
        ...validationErrors,
        content: 'Une erreur est survenue lors de la génération du contenu'
      });
      setGeneratingContent(false);
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log("🔍 [DEBUG] Début de la soumission du formulaire");
    
    // Validation du formulaire
    const errors: Record<string, string> = {};
    
    console.log("🔍 [DEBUG] Validation du formulaire en cours...");
    
    if (!formData.title) {
      errors.title = 'Le titre est requis';
    }
    
    if (!formData.company_id) {
      errors.company_id = 'Le nom de l\'entreprise est requis';
    }
    
    if (!formData.target_audience) {
      errors.target_audience = 'Le public cible est requis';
    }
    
    if (!formData.prerequisites) {
      errors.prerequisites = 'Les prérequis sont requis';
    }
    
    // S'assurer que objectives est un tableau avant de vérifier sa longueur
    if (!formData.objectives || !Array.isArray(formData.objectives) || formData.objectives.length === 0 || !formData.objectives[0]) {
      errors.objectives = 'Au moins un objectif est requis';
    }
    
    if (formData.min_participants !== undefined && formData.min_participants < 1) {
      errors.min_participants = 'Le nombre minimum de participants doit être au moins 1';
    }
    
    if (formData.max_participants !== undefined && formData.min_participants !== undefined && 
        formData.max_participants < formData.min_participants) {
      errors.max_participants = 'Le nombre maximum de participants doit être au moins égal au nombre minimum de participants';
    }
    
    if (formData.price && formData.price < 0) {
      errors.price = 'Le prix doit être positif';
    }
    
    // Vérifier si trainer_id est défini
    if (!formData.trainer_id || formData.trainer_id === '') {
      errors.trainer_id = 'Veuillez sélectionner un formateur';
    }
    
    if (Object.keys(errors).length > 0) {
      console.log("❌ [ERROR] Validation échouée:", errors);
      setValidationErrors(errors);
      return;
    }
    
    console.log("✅ [DEBUG] Validation réussie");
    
    // Réinitialiser les erreurs de validation
    setValidationErrors({});
    
    try {
      console.log("🔍 [DEBUG] Préparation des données pour la soumission...");
      
      // Préparer les dates
      const startDate = periods.length > 0 && periods[0].startDate ? periods[0].startDate.toISOString() : null;
      const endDate = periods.length > 0 && periods[0].endDate ? periods[0].endDate.toISOString() : null;
      
      console.log("🔍 [DEBUG] Dates avant formatage:", {
        startDate: startDate,
        endDate: endDate,
        periodsRaw: periods
      });
      
      // S'assurer que objectives est un tableau
      const safeObjectives = Array.isArray(formData.objectives) ? formData.objectives : [];
      
      // Créer un objet metadata complet avec toutes les informations nécessaires
      const metadata = {
        periods: periods.map(p => ({
          id: p.id,
          start_date: p.startDate ? p.startDate.toISOString() : null,
          end_date: p.endDate ? p.endDate.toISOString() : null
        })),
        timeSlots: timeSlots.map(ts => ({
          id: ts.id,
          startTime: ts.startTime,
          endTime: ts.endTime
        })),
        // Ajouter des informations supplémentaires qui pourraient être utiles
        duration_details: {
          total_days: periods.filter(p => p.startDate && p.endDate).reduce((total, p) => {
            if (!p.startDate || !p.endDate) return total;
            const diffTime = Math.abs(p.endDate.getTime() - p.startDate.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 pour inclure le jour de début
            return total + diffDays;
          }, 0),
          total_hours: timeSlots.reduce((total, ts) => {
            const startParts = ts.startTime.split(':').map(Number);
            const endParts = ts.endTime.split(':').map(Number);
            const startMinutes = startParts[0] * 60 + startParts[1];
            const endMinutes = endParts[0] * 60 + endParts[1];
            return total + (endMinutes - startMinutes) / 60;
          }, 0)
        },
        last_updated: new Date().toISOString()
      };
      
      // Préparer les données pour la soumission
      const submissionData = {
        // Propriétés de base de la formation
        id: formData.id,
        title: formData.title,
        company_id: formData.company_id,
        target_audience: formData.target_audience,
        prerequisites: formData.prerequisites,
        duration: formData.duration || calculateDuration(), // Utiliser la durée calculée si non définie
        location: formData.location,
        content: formData.content,
        registration_deadline: formData.registration_deadline,
        status: formData.status || 'draft',
        trainer_id: formData.trainer_id,
        
        // S'assurer que trainer_name est défini si trainer_id l'est
        trainer_name: formData.trainer_id ? 
          (trainers.find(t => t.id === formData.trainer_id)?.full_name || formData.trainer_name) : 
          formData.trainer_name,
        
        // Ajouter les dates formatées
        dates: formatDatesFromPeriods(periods),
        schedule: formatScheduleFromTimeSlots(timeSlots),
        
        // Convertir les nombres
        min_participants: Number(formData.min_participants),
        max_participants: Number(formData.max_participants),
        price: formData.price ? Number(formData.price) : null,
        
        // Ajouter les dates de début et de fin
        start_date: startDate,
        end_date: endDate,
        
        // S'assurer que objectives est un tableau
        objectives: safeObjectives,
        
        // Copier les méthodes d'évaluation, de suivi, pédagogiques et éléments matériels
        evaluation_methods: formData.evaluation_methods || {
          profile_evaluation: false,
          skills_evaluation: false,
          knowledge_evaluation: false,
          satisfaction_survey: false
        },
        tracking_methods: formData.tracking_methods || {
          attendance_sheet: false,
          completion_certificate: false
        },
        pedagogical_methods: formData.pedagogical_methods || {
          needs_evaluation: false,
          theoretical_content: false,
          practical_exercises: false,
          case_studies: false,
          experience_sharing: false,
          digital_support: false
        },
        material_elements: formData.material_elements || {
          computer_provided: false,
          pedagogical_material: false,
          digital_support_provided: false
        },
        
        // Stocker les métadonnées pour les périodes et les tranches horaires
        metadata: JSON.stringify(metadata),
        
        // Ajouter les champs periods et time_slots pour compatibilité
        periods: JSON.stringify(metadata.periods),
        time_slots: JSON.stringify(metadata.timeSlots)
      };
      
      console.log("🔍 [DEBUG] Données formatées pour la soumission:", submissionData);
      
      // SOLUTION SIMPLIFIÉE: Utiliser directement l'API REST
      if (training && training.id) {
        // Mise à jour d'une formation existante
        console.log("🔍 [DEBUG] Mise à jour de la formation existante avec ID:", training.id);
        
        try {
          // Obtenir le token d'accès
          const { data: sessionData } = await supabase.auth.getSession();
          const accessToken = sessionData?.session?.access_token;
          
          if (!accessToken) {
            console.error("❌ [ERROR] Impossible d'obtenir le token d'accès - utilisation de l'API standard");
            
            // Fallback: Utiliser l'API standard
        const { data, error } = await supabase
          .from('trainings')
          .update(submissionData)
          .eq('id', training.id)
          .select();
        
        if (error) {
              console.error("❌ [ERROR] Erreur lors de la mise à jour via API standard:", error);
              throw new Error(`Erreur lors de la mise à jour: ${error.message}`);
            }
            
            console.log("✅ [DEBUG] Mise à jour réussie via API standard:", data);
            onSubmit(submissionData);
          return;
        }
        
          // Utiliser l'API REST directe
          console.log("🔍 [DEBUG] Tentative de mise à jour via API REST directe...");
          const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/trainings?id=eq.${training.id}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${accessToken}`,
              'Prefer': 'return=representation'
            },
            body: JSON.stringify(submissionData)
          });
          
          if (!response.ok) {
            console.error("❌ [ERROR] Erreur lors de la mise à jour via API REST:", response.status);
            
            // Fallback: Utiliser l'API standard
            const { data, error } = await supabase
              .from('trainings')
              .update(submissionData)
              .eq('id', training.id)
              .select();
            
            if (error) {
              console.error("❌ [ERROR] Erreur lors de la mise à jour via API standard:", error);
              throw new Error(`Erreur lors de la mise à jour: ${error.message}`);
            }
            
            console.log("✅ [DEBUG] Mise à jour réussie via API standard:", data);
            onSubmit(submissionData);
          } else {
            const responseData = await response.json();
            console.log("✅ [DEBUG] Mise à jour réussie via API REST:", responseData);
            onSubmit(submissionData);
          }
        } catch (error) {
          console.error("❌ [ERROR] Exception lors de la mise à jour:", error);
          
          // Dernière tentative: Utiliser l'API standard
          try {
            console.log("🔍 [DEBUG] Dernière tentative: mise à jour via API standard...");
            const { data, error } = await supabase
              .from('trainings')
              .update(submissionData)
              .eq('id', training.id)
              .select();
            
            if (error) {
              console.error("❌ [ERROR] Erreur lors de la mise à jour via API standard:", error);
              throw new Error(`Erreur lors de la mise à jour: ${error.message}`);
            }
            
            console.log("✅ [DEBUG] Mise à jour réussie via API standard:", data);
            onSubmit(submissionData);
          } catch (finalError) {
            console.error("❌ [ERROR] Toutes les tentatives ont échoué:", finalError);
            alert(`Erreur lors de la mise à jour de la formation: ${error instanceof Error ? error.message : String(error)}`);
            return;
          }
        }
      } else {
        // Création d'une nouvelle formation
        console.log("🔍 [DEBUG] Création d'une nouvelle formation");
        
        try {
          // Obtenir le token d'accès
          const { data: sessionData } = await supabase.auth.getSession();
          const accessToken = sessionData?.session?.access_token;
          
          if (!accessToken) {
            console.error("❌ [ERROR] Impossible d'obtenir le token d'accès - utilisation de l'API standard");
            
            // Fallback: Utiliser l'API standard
        const { data, error } = await supabase
          .from('trainings')
          .insert(submissionData)
          .select();
        
        if (error) {
              console.error("❌ [ERROR] Erreur lors de la création via API standard:", error);
              throw new Error(`Erreur lors de la création: ${error.message}`);
            }
            
            console.log("✅ [DEBUG] Création réussie via API standard:", data);
            onSubmit(submissionData);
          return;
        }
        
          // Utiliser l'API REST directe
          console.log("🔍 [DEBUG] Tentative de création via API REST directe...");
          const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/trainings`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${accessToken}`,
              'Prefer': 'return=representation'
            },
            body: JSON.stringify(submissionData)
          });
          
          if (!response.ok) {
            console.error("❌ [ERROR] Erreur lors de la création via API REST:", response.status);
            
            // Fallback: Utiliser l'API standard
            const { data, error } = await supabase
              .from('trainings')
              .insert(submissionData)
              .select();
            
            if (error) {
              console.error("❌ [ERROR] Erreur lors de la création via API standard:", error);
              throw new Error(`Erreur lors de la création: ${error.message}`);
            }
            
            console.log("✅ [DEBUG] Création réussie via API standard:", data);
            onSubmit(submissionData);
          } else {
            const responseData = await response.json();
            console.log("✅ [DEBUG] Création réussie via API REST:", responseData);
            onSubmit(submissionData);
          }
        } catch (error) {
          console.error("❌ [ERROR] Exception lors de la création:", error);
          
          // Dernière tentative: Utiliser l'API standard
          try {
            console.log("🔍 [DEBUG] Dernière tentative: création via API standard...");
            const { data, error } = await supabase
              .from('trainings')
              .insert(submissionData)
              .select();
            
            if (error) {
              console.error("❌ [ERROR] Erreur lors de la création via API standard:", error);
              throw new Error(`Erreur lors de la création: ${error.message}`);
            }
            
            console.log("✅ [DEBUG] Création réussie via API standard:", data);
      onSubmit(submissionData);
          } catch (finalError) {
            console.error("❌ [ERROR] Toutes les tentatives ont échoué:", finalError);
            alert(`Erreur lors de la création de la formation: ${error instanceof Error ? error.message : String(error)}`);
            return;
          }
        }
      }
    } catch (error) {
      console.error("❌ [ERROR] Exception lors de la soumission du formulaire:", error);
      if (error instanceof Error) {
        alert(`Erreur lors de la soumission du formulaire: ${error.message}`);
      } else {
        alert(`Erreur lors de la soumission du formulaire: ${String(error)}`);
      }
    }
  };
  
  const handleDuplicate = () => {
    if (onDuplicate && training) {
      // Extraire les métadonnées du formData de manière sécurisée
      const { objectives, evaluation_methods, tracking_methods, pedagogical_methods, material_elements, ...formDataWithoutMetadata } = formData;
      
      const duplicatedTraining: Training = {
        ...training, // Utiliser le training original comme base
        ...formDataWithoutMetadata,
        // Ajouter les propriétés obligatoires pour satisfaire le type Training
        id: training.id, // Garder l'ID original pour référence
        title: formData.title || training.title,
        company_id: formData.company_id || training.company_id,
        target_audience: formData.target_audience || training.target_audience,
        prerequisites: formData.prerequisites || training.prerequisites,
        duration: formData.duration || training.duration,
        dates: formData.dates || training.dates,
        schedule: formData.schedule || training.schedule,
        min_participants: formData.min_participants || training.min_participants,
        max_participants: formData.max_participants || training.max_participants,
        registration_deadline: formData.registration_deadline || training.registration_deadline,
        location: formData.location || training.location,
        price: formData.price || training.price,
        objectives: Array.isArray(formData.objectives) ? formData.objectives : training.objectives,
        content: formData.content || training.content,
        evaluation_methods: formData.evaluation_methods || training.evaluation_methods,
        tracking_methods: formData.tracking_methods || training.tracking_methods,
        pedagogical_methods: formData.pedagogical_methods || training.pedagogical_methods,
        material_elements: formData.material_elements || training.material_elements,
        status: 'draft'
      };
      onDuplicate(duplicatedTraining);
    }
  };
  
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [isLoadingTrainers, setIsLoadingTrainers] = useState(false);
  
  useEffect(() => {
    fetchTrainers();
  }, []);
  
  const fetchTrainers = async () => {
    try {
      console.log("Chargement des formateurs via RPC...");
      setIsLoadingTrainers(true);
      
      // Vérifier si supabase est disponible
      if (!supabase) {
        console.error('Erreur: Client Supabase non disponible');
        setIsLoadingTrainers(false);
        return;
      }
      
      // Utiliser la fonction RPC au lieu de la requête directe
      const { data, error } = await supabase.rpc('get_all_trainers');
      
      if (error) {
        console.error('Erreur lors du chargement des formateurs via RPC:', error);
        console.error('Code d\'erreur:', error.code);
        console.error('Message d\'erreur:', error.message);
        console.error('Détails:', error.details);
        
        // Vérifier si l'erreur est liée à une fonction manquante
        if (error.code === '42883' || error.message.includes('function get_all_trainers() does not exist')) {
          console.error('La fonction RPC get_all_trainers n\'existe pas. Veuillez exécuter le script create_trainers_rpc.sql');
        }
        
        setIsLoadingTrainers(false);
        return;
      }
      
      console.log("Formateurs chargés avec succès via RPC:", data);
      console.log("Nombre de formateurs récupérés:", data ? data.length : 0);
      
      if (data && data.length > 0) {
        // Afficher les premiers formateurs pour le débogage
        console.log("Premier formateur:", data[0]);
        setTrainers(data);
      } else {
        console.warn("Aucun formateur trouvé dans la base de données");
      }
    } catch (error) {
      console.error('Exception lors du chargement des formateurs:', error);
      if (error instanceof Error) {
        console.error('Message d\'erreur:', error.message);
        console.error('Stack trace:', error.stack);
      }
    } finally {
      setIsLoadingTrainers(false);
    }
  };
  
  useEffect(() => {
    if (training) {
      // Extraire les métadonnées de la formation
      const metadata = extractMetadata(training);
      
      setFormData({
        ...training,
        ...metadata,
        trainer_name: training?.trainer_name || '',
        trainer_id: training?.trainer_id || ''
      });
      
      // Initialiser les périodes et les tranches horaires de manière sécurisée
      if (metadata && metadata.extractedPeriods) {
        setPeriods(metadata.extractedPeriods);
      }
      
      if (metadata && metadata.extractedTimeSlots) {
        setTimeSlots(metadata.extractedTimeSlots);
      }
    }
    
    fetchTrainers();
  }, [training]);
  
  // Fonction pour sauvegarder les périodes et horaires dans des tables séparées
  const savePeriodsAndTimeSlots = async (trainingId: string, periodsToSave: Period[], timeSlotsToSave: TimeSlot[]) => {
    try {
      console.log("Sauvegarde des périodes et tranches horaires pour la formation:", trainingId);
      
      // Nous stockons maintenant toutes les données dans le champ metadata JSON
      // Cette fonction est conservée pour la compatibilité, mais ne fait plus rien de complexe
      console.log("Les périodes et tranches horaires sont maintenant stockées dans le champ metadata JSON");
      
      return true;
    } catch (error) {
      console.error("Exception lors de la sauvegarde des périodes et tranches horaires:", error);
      return false;
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-100 flex items-center justify-center z-[100] overflow-hidden p-0 sm:p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl my-0 sm:my-8 mx-0 sm:mx-4 flex flex-col max-h-[100vh] sm:max-h-[90vh]">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-10">
          <h3 className="text-lg font-medium text-gray-900">
            {training ? 'Modifier la formation' : 'Ajouter une formation'}
          </h3>
          <div className="flex items-center">
            {training && onDuplicate && (
              <button
                onClick={handleDuplicate}
                className="mr-2 sm:mr-4 text-blue-600 hover:text-blue-800 flex items-center"
                title="Dupliquer cette formation"
              >
                <Copy className="h-5 w-5 mr-1" />
                <span className="hidden sm:inline">Dupliquer</span>
              </button>
            )}
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-500"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>
      
        <div className="overflow-y-auto flex-grow">
          <form onSubmit={handleSubmit} className="p-4 sm:p-6 flex flex-col h-full">
            <div className="space-y-6 sm:space-y-8 flex-grow">
              {/* Informations générales */}
              <section className="bg-white rounded-lg p-3 sm:p-4 shadow-sm border border-gray-100">
                <h4 className="text-base sm:text-lg font-medium text-gray-900 mb-3 sm:mb-4">Informations générales</h4>
                <div className="grid grid-cols-1 gap-4 sm:gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Intitulé de la formation *</label>
                    <input
                      type="text"
                      name="title"
                      value={formData.title}
                      onChange={handleChange}
                      className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                        validationErrors.title ? 'border-red-300' : ''
                      }`}
                    />
                    {validationErrors.title && (
                      <p className="mt-1 text-sm text-red-600">{validationErrors.title}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Entreprise</label>
                    <select
                      name="company_id"
                      value={formData.company_id || ''}
                      onChange={handleChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    >
                      <option value="">Sélectionner une entreprise</option>
                      {companies.map((company) => (
                        <option key={company.id} value={company.id}>
                          {company.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Formateur</label>
                    <div className="mt-1 relative">
                      <select
                        name="trainer_id"
                        value={formData.trainer_id || ''}
                        onChange={(e) => {
                          const selectedTrainerId = e.target.value;
                          const selectedTrainer = trainers.find(t => t.id === selectedTrainerId);
                          
                          // Mettre à jour à la fois trainer_id et trainer_name
                          setFormData(prev => ({
                            ...prev,
                            trainer_id: selectedTrainerId,
                            trainer_name: selectedTrainer ? selectedTrainer.full_name : ''
                          }));
                          
                          // Effacer les erreurs de validation
                          if (validationErrors.trainer_name) {
                            setValidationErrors({
                              ...validationErrors,
                              trainer_name: ''
                            });
                          }
                        }}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      >
                        <option value="">Sélectionner un formateur</option>
                        {trainers.map(trainer => (
                          <option key={trainer.id} value={trainer.id}>
                            {trainer.full_name}
                          </option>
                        ))}
                      </select>
                      {isLoadingTrainers && (
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                          <svg className="animate-spin h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        </div>
                      )}
                    </div>
                    {trainers.length === 0 && !isLoadingTrainers && (
                      <p className="mt-1 text-sm text-gray-500">
                        Aucun formateur disponible. <a href="#" onClick={(e) => { e.preventDefault(); window.open('/admin?view=trainers', '_blank'); }} className="text-blue-600 hover:text-blue-800">Ajouter des formateurs</a>
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Public visé</label>
                    <textarea
                      name="target_audience"
                      value={formData.target_audience}
                      onChange={handleChange}
                      rows={3}
                      className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                        validationErrors.target_audience ? 'border-red-300' : ''
                      }`}
                    />
                    {validationErrors.target_audience && (
                      <p className="mt-1 text-sm text-red-600">{validationErrors.target_audience}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Prérequis</label>
                    <input
                      type="text"
                      name="prerequisites"
                      value={formData.prerequisites}
                      onChange={handleChange}
                      className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                        validationErrors.prerequisites ? 'border-red-300' : ''
                      }`}
                    />
                    {validationErrors.prerequisites && (
                      <p className="mt-1 text-sm text-red-600">{validationErrors.prerequisites}</p>
                    )}
                  </div>
                </div>
              </section>

              {/* Organisation */}
              <section className="bg-white rounded-lg p-3 sm:p-4 shadow-sm border border-gray-100">
                <h4 className="text-base sm:text-lg font-medium text-gray-900 mb-3 sm:mb-4">Organisation</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Dates</label>
                    <div className="mt-1 flex items-center">
                      <div className="relative w-full">
                    <input
                      type="text"
                      name="dates"
                      value={formData.dates}
                      onChange={handleChange}
                          className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                        validationErrors.dates ? 'border-red-300' : ''
                      }`}
                          readOnly
                        />
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                          <Calendar className="h-5 w-5 text-gray-400" />
                        </div>
                      </div>
                    </div>
                    
                    {periods.map((period) => (
                      <div key={`period-${period.id}`} className="mt-2 border border-gray-200 rounded-md p-2">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium text-gray-700">
                            {period.startDate && period.endDate
                              ? `${period.startDate.toLocaleDateString('fr-FR')} - ${period.endDate.toLocaleDateString('fr-FR')}`
                              : 'Nouvelle période'}
                          </span>
                          {periods.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removePeriod(period.id)}
                              className="text-red-500 hover:text-red-700"
                              title="Supprimer cette période"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                        <DatePicker
                          selected={period.startDate}
                          onChange={(dates) => {
                            const [start, end] = dates as [Date, Date];
                            updatePeriod(period.id, start, end);
                          }}
                          startDate={period.startDate}
                          endDate={period.endDate}
                          selectsRange
                          inline
                          monthsShown={1}
                          locale="fr"
                          dateFormat="dd/MM/yyyy"
                          className="w-full"
                        />
                      </div>
                    ))}
                    
                    <div className="mt-2 flex justify-end">
                      <button
                        type="button"
                        onClick={addPeriod}
                        className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
                        title="Ajouter une période"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Ajouter une période
                      </button>
                    </div>
                    
                    {validationErrors.dates && (
                      <p className="mt-1 text-sm text-red-600">{validationErrors.dates}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Horaires</label>
                    <div className="mt-1 flex items-center">
                      <div className="relative w-full">
                    <input
                      type="text"
                      name="schedule"
                      value={formData.schedule}
                      onChange={handleChange}
                          className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                        validationErrors.schedule ? 'border-red-300' : ''
                      }`}
                          readOnly
                        />
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                          <Clock className="h-5 w-5 text-gray-400" />
                        </div>
                      </div>
                    </div>
                    
                    {timeSlots.map((slot, index) => (
                      <div key={`timeslot-${slot.id}`} className="mt-2 border border-gray-200 rounded-md p-2">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium text-gray-700">Tranche horaire {index + 1}</span>
                          {timeSlots.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeTimeSlot(slot.id)}
                              className="text-red-500 hover:text-red-700"
                              title="Supprimer cette tranche horaire"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Début</label>
                            <input
                              type="time"
                              value={slot.startTime}
                              onChange={(e) => updateTimeSlot(slot.id, 'startTime', e.target.value)}
                              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Fin</label>
                            <input
                              type="time"
                              value={slot.endTime}
                              onChange={(e) => updateTimeSlot(slot.id, 'endTime', e.target.value)}
                              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    <div className="mt-2 flex justify-end">
                      <button
                        type="button"
                        onClick={addTimeSlot}
                        className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
                        title="Ajouter une tranche horaire"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Ajouter une tranche horaire
                      </button>
                    </div>
                    
                    {validationErrors.schedule && (
                      <p className="mt-1 text-sm text-red-600">{validationErrors.schedule}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Durée (calculée automatiquement)</label>
                    <input
                      type="text"
                      name="duration"
                      value={formData.duration}
                      className={`mt-1 block w-full rounded-md border-gray-300 bg-gray-50 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                        validationErrors.duration ? 'border-red-300' : ''
                      }`}
                      readOnly
                    />
                    {validationErrors.duration && (
                      <p className="mt-1 text-sm text-red-600">{validationErrors.duration}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Lieu</label>
                    <input
                      type="text"
                      name="location"
                      value={formData.location}
                      onChange={handleChange}
                      className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                        validationErrors.location ? 'border-red-300' : ''
                      }`}
                    />
                    {validationErrors.location && (
                      <p className="mt-1 text-sm text-red-600">{validationErrors.location}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Nombre minimum de participants</label>
                    <input
                      type="number"
                      name="min_participants"
                      value={formData.min_participants}
                      onChange={handleChange}
                      className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                        validationErrors.min_participants ? 'border-red-300' : ''
                      }`}
                    />
                    {validationErrors.min_participants && (
                      <p className="mt-1 text-sm text-red-600">{validationErrors.min_participants}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Nombre maximum de participants</label>
                    <input
                      type="number"
                      name="max_participants"
                      value={formData.max_participants}
                      onChange={handleChange}
                      className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                        validationErrors.max_participants ? 'border-red-300' : ''
                      }`}
                    />
                    {validationErrors.max_participants && (
                      <p className="mt-1 text-sm text-red-600">{validationErrors.max_participants}</p>
                    )}
                  </div>
                </div>
              </section>

              {/* Objectifs et contenu */}
              <section className="bg-white rounded-lg p-3 sm:p-4 shadow-sm border border-gray-100">
                <h4 className="text-base sm:text-lg font-medium text-gray-900 mb-3 sm:mb-4">Objectifs et contenu</h4>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Objectifs de la formation</label>
                    {Array.isArray(formData.objectives) && formData.objectives.map((objective, index) => (
                      <div key={`objective-${index}`} className="flex mt-2">
                        <input
                          type="text"
                          value={objective}
                          onChange={(e) => handleObjectiveChange(index, e.target.value)}
                          className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          placeholder="Objectif..."
                        />
                        <button
                          type="button"
                          onClick={() => removeObjective(index)}
                          className="ml-2 px-2 py-1 text-red-600 hover:text-red-800"
                        >
                          Supprimer
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={addObjective}
                      className="mt-2 px-4 py-2 text-sm text-blue-600 hover:text-blue-800"
                    >
                      + Ajouter un objectif
                    </button>
                  </div>

                  <div>
                    <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium text-gray-700">Contenu de la formation</label>
                      <button
                        type="button"
                        onClick={generateTrainingContent}
                        disabled={generatingContent}
                        className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {generatingContent ? (
                          <span className="flex items-center">
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Génération en cours...
                          </span>
                        ) : (
                          <>
                            <Wand2 className="h-4 w-4 mr-1.5" />
                            Générer avec l'IA
                          </>
                        )}
                      </button>
                    </div>
                    
                    {generatingContent ? (
                      <div className="mt-2 p-4 border border-gray-200 rounded-md bg-gray-50">
                        <div className="flex flex-col items-center">
                          <div className="relative w-12 h-12 mb-3">
                            {/* Robot animation */}
                            <div className="relative w-12 h-12">
                              {/* Robot head */}
                              <div className="absolute top-0 left-2 w-8 h-6 bg-gray-300 rounded-md">
                                {/* Robot eyes */}
                                <div className="absolute top-1.5 left-1.5 w-1 h-1 bg-blue-500 rounded-full"></div>
                                <div className="absolute top-1.5 right-1.5 w-1 h-1 bg-blue-500 rounded-full"></div>
                                {/* Robot antenna */}
                                <div className="absolute -top-1.5 left-3.5 w-0.5 h-1.5 bg-gray-400"></div>
                                <div className="absolute -top-2 left-3.5 w-1 h-0.5 bg-red-500 rounded-full animate-pulse"></div>
                              </div>
                              {/* Robot arms */}
                              <div className="absolute top-3 left-0 w-2 h-0.5 bg-gray-400 origin-right animate-[spin_2s_linear_infinite]"></div>
                              <div className="absolute top-3 right-0 w-2 h-0.5 bg-gray-400 origin-left animate-[spin_2s_linear_infinite]"></div>
                              {/* Robot legs */}
                              <div className="absolute top-6 left-3 w-1.5 h-2 bg-gray-400 animate-bounce"></div>
                              <div className="absolute top-6 right-3 w-1.5 h-2 bg-gray-400 animate-bounce delay-150"></div>
                              {/* Work surface with sparkles */}
                              <div className="absolute top-9 left-2 w-8 h-0.5 bg-gray-200">
                                <div className="absolute -top-1 left-1 w-0.5 h-0.5 bg-yellow-300 animate-ping"></div>
                                <div className="absolute -top-1 left-4 w-0.5 h-0.5 bg-yellow-300 animate-ping delay-300"></div>
                                <div className="absolute -top-1 left-7 w-0.5 h-0.5 bg-yellow-300 animate-ping delay-700"></div>
                              </div>
                            </div>
                          </div>
                          
                          <h4 className="text-base font-medium text-gray-900 mb-1">
                            {contentGenerationSteps[generationStep].title}
                          </h4>
                          
                          <p className="text-xs text-gray-500 mb-2 animate-pulse">
                            Étape {generationStep + 1}/{contentGenerationSteps.length}{loadingDots}
                          </p>
                          
                          <div className="text-xs text-purple-600 mb-3 text-center min-h-[1rem]">
                            {contentGenerationSteps[generationStep].subSteps[generationSubStep]}
                          </div>
                          
                          <div className="w-full bg-gray-200 rounded-full h-1.5 mb-2">
                            <div 
                              className="bg-purple-600 h-1.5 rounded-full transition-all duration-500" 
                              style={{ width: `${(generationStep / (contentGenerationSteps.length - 1)) * 100}%` }}
                            ></div>
                          </div>
                          
                          <p className="text-xs text-gray-600">
                            Création du programme de formation en cours...
                          </p>
                        </div>
                      </div>
                    ) : (
                    <textarea
                      name="content"
                      value={formData.content}
                      onChange={handleChange}
                      rows={6}
                      className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                        validationErrors.content ? 'border-red-300' : ''
                      }`}
                    />
                    )}
                    {validationErrors.content && (
                      <p className="mt-1 text-sm text-red-600">{validationErrors.content}</p>
                    )}
                  </div>
                </div>
              </section>

              {/* Méthodes d'évaluation */}
              <section className="bg-white rounded-lg p-3 sm:p-4 shadow-sm border border-gray-100">
                <h4 className="text-base sm:text-lg font-medium text-gray-900 mb-3 sm:mb-4">Méthodes d'évaluation</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="profile_evaluation"
                      checked={formData.evaluation_methods?.profile_evaluation || false}
                      onChange={() => handleCheckboxChange('evaluation_methods', 'profile_evaluation')}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="profile_evaluation" className="ml-2 text-sm text-gray-700">
                      Evaluation individuelle du profil, des attentes et des besoins
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="skills_evaluation"
                      checked={formData.evaluation_methods?.skills_evaluation || false}
                      onChange={() => handleCheckboxChange('evaluation_methods', 'skills_evaluation')}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="skills_evaluation" className="ml-2 text-sm text-gray-700">
                      Evaluation des compétences en début et fin de formation
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="knowledge_evaluation"
                      checked={formData.evaluation_methods?.knowledge_evaluation || false}
                      onChange={() => handleCheckboxChange('evaluation_methods', 'knowledge_evaluation')}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="knowledge_evaluation" className="ml-2 text-sm text-gray-700">
                      Évaluation des connaissances à chaque étape
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="satisfaction_survey"
                      checked={formData.evaluation_methods?.satisfaction_survey || false}
                      onChange={() => handleCheckboxChange('evaluation_methods', 'satisfaction_survey')}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="satisfaction_survey" className="ml-2 text-sm text-gray-700">
                      Questionnaire d'évaluation de la satisfaction
                    </label>
                  </div>
                </div>
              </section>

              {/* Méthodes de suivi */}
              <section className="bg-white rounded-lg p-3 sm:p-4 shadow-sm border border-gray-100">
                <h4 className="text-base sm:text-lg font-medium text-gray-900 mb-3 sm:mb-4">Méthodes de suivi</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="attendance_sheet"
                      checked={formData.tracking_methods?.attendance_sheet || false}
                      onChange={() => handleCheckboxChange('tracking_methods', 'attendance_sheet')}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="attendance_sheet" className="ml-2 text-sm text-gray-700">
                      Feuille d'émargement
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="completion_certificate"
                      checked={formData.tracking_methods?.completion_certificate || false}
                      onChange={() => handleCheckboxChange('tracking_methods', 'completion_certificate')}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="completion_certificate" className="ml-2 text-sm text-gray-700">
                      Attestation de fin de formation
                    </label>
                  </div>
                </div>
              </section>

              {/* Moyens pédagogiques */}
              <section className="bg-white rounded-lg p-3 sm:p-4 shadow-sm border border-gray-100">
                <h4 className="text-base sm:text-lg font-medium text-gray-900 mb-3 sm:mb-4">Moyens pédagogiques</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="needs_evaluation"
                      checked={formData.pedagogical_methods?.needs_evaluation || false}
                      onChange={() => handleCheckboxChange('pedagogical_methods', 'needs_evaluation')}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="needs_evaluation" className="ml-2 text-sm text-gray-700">
                      Évaluation des besoins et du profil du participant
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="theoretical_content"
                      checked={formData.pedagogical_methods?.theoretical_content || false}
                      onChange={() => handleCheckboxChange('pedagogical_methods', 'theoretical_content')}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="theoretical_content" className="ml-2 text-sm text-gray-700">
                      Apport théorique et méthodologique
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="practical_exercises"
                      checked={formData.pedagogical_methods?.practical_exercises || false}
                      onChange={() => handleCheckboxChange('pedagogical_methods', 'practical_exercises')}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="practical_exercises" className="ml-2 text-sm text-gray-700">
                      Questionnaires et exercices pratiques
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="case_studies"
                      checked={formData.pedagogical_methods?.case_studies || false}
                      onChange={() => handleCheckboxChange('pedagogical_methods', 'case_studies')}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="case_studies" className="ml-2 text-sm text-gray-700">
                      Études de cas
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="experience_sharing"
                      checked={formData.pedagogical_methods?.experience_sharing || false}
                      onChange={() => handleCheckboxChange('pedagogical_methods', 'experience_sharing')}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="experience_sharing" className="ml-2 text-sm text-gray-700">
                      Retours d'expériences
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="digital_support"
                      checked={formData.pedagogical_methods?.digital_support || false}
                      onChange={() => handleCheckboxChange('pedagogical_methods', 'digital_support')}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="digital_support" className="ml-2 text-sm text-gray-700">
                      Support de cours numérique
                    </label>
                  </div>
                </div>
              </section>

              {/* Éléments matériels */}
              <section className="bg-white rounded-lg p-3 sm:p-4 shadow-sm border border-gray-100">
                <h4 className="text-base sm:text-lg font-medium text-gray-900 mb-3 sm:mb-4">Éléments matériels</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="computer_provided"
                      checked={formData.material_elements?.computer_provided || false}
                      onChange={() => handleCheckboxChange('material_elements', 'computer_provided')}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="computer_provided" className="ml-2 text-sm text-gray-700">
                      Mise à disposition du matériel informatique
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="pedagogical_material"
                      checked={formData.material_elements?.pedagogical_material || false}
                      onChange={() => handleCheckboxChange('material_elements', 'pedagogical_material')}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="pedagogical_material" className="ml-2 text-sm text-gray-700">
                      Mise à disposition du matériel pédagogique
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="digital_support_provided"
                      checked={formData.material_elements?.digital_support_provided || false}
                      onChange={() => handleCheckboxChange('material_elements', 'digital_support_provided')}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="digital_support_provided" className="ml-2 text-sm text-gray-700">
                      Support de cours au format numérique
                    </label>
                  </div>
                </div>
              </section>

              {/* Prix */}
              <section className="bg-white rounded-lg p-3 sm:p-4 shadow-sm border border-gray-100">
                <h4 className="text-base sm:text-lg font-medium text-gray-900 mb-3 sm:mb-4">Tarif</h4>
                <div className="max-w-md">
                  <label className="block text-sm font-medium text-gray-700">Prix (€ HT)</label>
                  <input
                    type="number"
                    name="price"
                    value={formData.price || ''}
                    onChange={handleChange}
                    className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                      validationErrors.price ? 'border-red-300' : ''
                    }`}
                  />
                  {validationErrors.price && (
                    <p className="mt-1 text-sm text-red-600">{validationErrors.price}</p>
                  )}
                </div>
              </section>
            </div>

            <div className="px-4 sm:px-6 py-4 border-t border-gray-200 sticky bottom-0 bg-white z-10">
              <div className="flex flex-col sm:flex-row sm:justify-end gap-3 sm:space-x-3">
                <button
                  type="button"
                  onClick={onCancel}
                  className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="w-full sm:w-auto px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  {training ? 'Enregistrer les modifications' : 'Créer la formation'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}; 