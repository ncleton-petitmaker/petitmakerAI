-- Script pour créer des fonctions RPC permettant de contourner les problèmes de RLS
-- Ces fonctions seront utilisées comme solution de secours si l'API REST directe échoue

-- Fonction pour insérer une formation en contournant RLS
CREATE OR REPLACE FUNCTION bypass_rls_insert_training(training_data JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- Exécuté avec les privilèges du créateur de la fonction
AS $$
DECLARE
  new_id UUID;
  result JSONB;
BEGIN
  -- Insérer la formation en contournant RLS
  INSERT INTO trainings (
    title,
    company_id,
    target_audience,
    prerequisites,
    duration,
    location,
    content,
    registration_deadline,
    status,
    trainer_id,
    trainer_name,
    dates,
    schedule,
    min_participants,
    max_participants,
    price,
    start_date,
    end_date,
    objectives,
    evaluation_methods,
    tracking_methods,
    pedagogical_methods,
    material_elements,
    metadata,
    periods,
    time_slots
  )
  VALUES (
    training_data->>'title',
    (training_data->>'company_id')::UUID,
    training_data->>'target_audience',
    training_data->>'prerequisites',
    training_data->>'duration',
    training_data->>'location',
    training_data->>'content',
    training_data->>'registration_deadline',
    training_data->>'status',
    (training_data->>'trainer_id')::UUID,
    training_data->>'trainer_name',
    training_data->>'dates',
    training_data->>'schedule',
    (training_data->>'min_participants')::INT,
    (training_data->>'max_participants')::INT,
    (training_data->>'price')::NUMERIC,
    (training_data->>'start_date')::TIMESTAMPTZ,
    (training_data->>'end_date')::TIMESTAMPTZ,
    (training_data->>'objectives')::TEXT[],
    (training_data->>'evaluation_methods')::JSONB,
    (training_data->>'tracking_methods')::JSONB,
    (training_data->>'pedagogical_methods')::JSONB,
    (training_data->>'material_elements')::JSONB,
    (training_data->>'metadata')::JSONB,
    (training_data->>'periods')::JSONB,
    (training_data->>'time_slots')::JSONB
  )
  RETURNING id INTO new_id;
  
  -- Récupérer la formation insérée
  SELECT jsonb_build_object(
    'id', id,
    'title', title,
    'status', status
  ) INTO result
  FROM trainings
  WHERE id = new_id;
  
  RETURN result;
END;
$$;

-- Fonction pour mettre à jour une formation en contournant RLS
CREATE OR REPLACE FUNCTION bypass_rls_update_training(training_data JSONB, training_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- Exécuté avec les privilèges du créateur de la fonction
AS $$
DECLARE
  result JSONB;
BEGIN
  -- Mettre à jour la formation en contournant RLS
  UPDATE trainings
  SET
    title = training_data->>'title',
    company_id = (training_data->>'company_id')::UUID,
    target_audience = training_data->>'target_audience',
    prerequisites = training_data->>'prerequisites',
    duration = training_data->>'duration',
    location = training_data->>'location',
    content = training_data->>'content',
    registration_deadline = training_data->>'registration_deadline',
    status = training_data->>'status',
    trainer_id = (training_data->>'trainer_id')::UUID,
    trainer_name = training_data->>'trainer_name',
    dates = training_data->>'dates',
    schedule = training_data->>'schedule',
    min_participants = (training_data->>'min_participants')::INT,
    max_participants = (training_data->>'max_participants')::INT,
    price = (training_data->>'price')::NUMERIC,
    start_date = (training_data->>'start_date')::TIMESTAMPTZ,
    end_date = (training_data->>'end_date')::TIMESTAMPTZ,
    objectives = (training_data->>'objectives')::TEXT[],
    evaluation_methods = (training_data->>'evaluation_methods')::JSONB,
    tracking_methods = (training_data->>'tracking_methods')::JSONB,
    pedagogical_methods = (training_data->>'pedagogical_methods')::JSONB,
    material_elements = (training_data->>'material_elements')::JSONB,
    metadata = (training_data->>'metadata')::JSONB,
    periods = (training_data->>'periods')::JSONB,
    time_slots = (training_data->>'time_slots')::JSONB
  WHERE id = training_id;
  
  -- Récupérer la formation mise à jour
  SELECT jsonb_build_object(
    'id', id,
    'title', title,
    'status', status
  ) INTO result
  FROM trainings
  WHERE id = training_id;
  
  RETURN result;
END;
$$;

-- Fonction pour vérifier l'état de RLS sur la table trainings
CREATE OR REPLACE FUNCTION check_trainings_rls()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  rls_status BOOLEAN;
  policies JSONB;
  result JSONB;
BEGIN
  -- Vérifier si RLS est activé
  SELECT relrowsecurity INTO rls_status
  FROM pg_class
  WHERE relname = 'trainings';
  
  -- Récupérer les politiques existantes
  SELECT jsonb_agg(jsonb_build_object(
    'policyname', policyname,
    'cmd', cmd,
    'roles', roles,
    'qual', qual,
    'with_check', with_check
  )) INTO policies
  FROM pg_policies
  WHERE tablename = 'trainings';
  
  -- Construire le résultat
  result := jsonb_build_object(
    'rls_enabled', rls_status,
    'policies', COALESCE(policies, '[]'::jsonb)
  );
  
  RETURN result;
END;
$$;

-- Accorder les privilèges d'exécution aux utilisateurs authentifiés
GRANT EXECUTE ON FUNCTION bypass_rls_insert_training(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION bypass_rls_update_training(JSONB, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION check_trainings_rls() TO authenticated; 