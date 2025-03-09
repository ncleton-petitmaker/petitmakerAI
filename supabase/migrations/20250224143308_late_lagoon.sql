/*
  # Création des tables pour les ressources pédagogiques

  1. Nouvelles Tables
    - `resource_categories`
      - `id` (uuid, primary key)
      - `name` (text, unique)
      - `description` (text)
      - `created_at` (timestamp)
    
    - `resources`
      - `id` (uuid, primary key)
      - `title` (text)
      - `description` (text)
      - `type` (text)
      - `url` (text)
      - `category` (uuid, foreign key)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to read data
*/

-- Create resource categories table
CREATE TABLE IF NOT EXISTS resource_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

-- Create resources table
CREATE TABLE IF NOT EXISTS resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  type text NOT NULL CHECK (type IN ('document', 'video', 'exercise')),
  url text NOT NULL,
  category uuid REFERENCES resource_categories(id),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE resource_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;

-- Create policies for resource_categories
CREATE POLICY "Allow authenticated users to read categories"
  ON resource_categories
  FOR SELECT
  TO authenticated
  USING (true);

-- Create policies for resources
CREATE POLICY "Allow authenticated users to read resources"
  ON resources
  FOR SELECT
  TO authenticated
  USING (true);

-- Insert some initial categories
INSERT INTO resource_categories (name, description) VALUES
  ('Fondamentaux', 'Les bases de l''IA générative'),
  ('Prompt Engineering', 'Techniques avancées de prompting'),
  ('Cas pratiques', 'Exemples concrets d''utilisation'),
  ('Outils', 'Guides et tutoriels des outils'),
  ('Ressources complémentaires', 'Lectures et vidéos recommandées');

-- Insert some sample resources
INSERT INTO resources (title, description, type, url, category) VALUES
  (
    'Guide du Prompt Engineering',
    'Les meilleures pratiques pour créer des prompts efficaces',
    'document',
    'https://efgirjtbuzljtzpuwsue.supabase.co/storage/v1/object/public/resources/guide-prompt-engineering.pdf',
    (SELECT id FROM resource_categories WHERE name = 'Prompt Engineering')
  ),
  (
    'Introduction aux LLMs',
    'Comprendre le fonctionnement des grands modèles de langage',
    'video',
    'https://efgirjtbuzljtzpuwsue.supabase.co/storage/v1/object/public/resources/intro-llm.mp4',
    (SELECT id FROM resource_categories WHERE name = 'Fondamentaux')
  ),
  (
    'Exercice : Optimisation de prompts',
    'Série d''exercices pour améliorer vos prompts',
    'exercise',
    'https://efgirjtbuzljtzpuwsue.supabase.co/storage/v1/object/public/resources/exercices-prompts.pdf',
    (SELECT id FROM resource_categories WHERE name = 'Prompt Engineering')
  );