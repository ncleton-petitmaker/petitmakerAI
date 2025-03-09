# Guide Complet d'Utilisation de Supabase avec React

## Table des matières
1. [Configuration initiale](#configuration-initiale)
2. [Structure des fichiers](#structure-des-fichiers)
3. [Migrations de base de données](#migrations-de-base-de-données)
4. [Types TypeScript](#types-typescript)
5. [Hooks React](#hooks-react)
6. [Sécurité et RLS](#sécurité-et-rls)
7. [Exemples pratiques](#exemples-pratiques)

## Configuration initiale

1. Installer les dépendances :
```bash
npm install @supabase/supabase-js
```

2. Créer les variables d'environnement (.env) :
```env
VITE_SUPABASE_URL=votre_url_supabase
VITE_SUPABASE_ANON_KEY=votre_clé_anon
```

3. Initialiser le client Supabase (src/lib/supabase.ts) :
```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

## Structure des fichiers

```
project/
├── src/
│   ├── lib/
│   │   └── supabase.ts      # Client Supabase
│   ├── types/
│   │   └── database.types.ts # Types de la base de données
│   ├── hooks/
│   │   └── useSupabase.ts   # Hooks personnalisés
│   └── components/          # Composants React
└── supabase/
    └── migrations/          # Fichiers de migration
```

## Migrations de base de données

1. Créer un nouveau fichier de migration dans `supabase/migrations/` :
```sql
/*
  # Titre de la migration

  1. Nouvelles Tables
    - Description des nouvelles tables
  2. Sécurité
    - Description des politiques
*/

-- Création de table
CREATE TABLE IF NOT EXISTS table_name (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now()
);

-- Activation RLS
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;

-- Politiques de sécurité
CREATE POLICY "policy_name"
  ON table_name
  FOR SELECT
  TO authenticated
  USING (condition);
```

## Types TypeScript

1. Définir les types dans `database.types.ts` :
```typescript
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      table_name: {
        Row: {
          id: string
          created_at: string
        }
        Insert: {
          id?: string
          created_at?: string
        }
        Update: {
          id?: string
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
```

## Hooks React

1. Créer des hooks génériques dans `useSupabase.ts` :
```typescript
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Database } from '../types/database.types';

type Tables = Database['public']['Tables'];

// Hook générique pour les requêtes
export function useQuery<T extends keyof Tables, R = Tables[T]['Row'][]>(
  tableName: T,
  query: () => Promise<{ data: R | null; error: Error | null }>
) {
  const [data, setData] = useState<R | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const { data, error } = await query();
        if (error) throw error;
        setData(data);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  return { data, error, loading };
}

// Hooks spécifiques
export function useTable<T extends keyof Tables>(
  tableName: T,
  options: {
    select?: string;
    order?: { column: string; ascending?: boolean };
    filter?: Record<string, unknown>;
  } = {}
) {
  return useQuery(tableName, () => {
    let query = supabase.from(tableName).select(options.select || '*');

    if (options.filter) {
      Object.entries(options.filter).forEach(([key, value]) => {
        query = query.eq(key, value);
      });
    }

    if (options.order) {
      query = query.order(options.order.column, {
        ascending: options.order.ascending
      });
    }

    return query;
  });
}
```

## Sécurité et RLS

1. Toujours activer RLS sur les nouvelles tables :
```sql
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;
```

2. Créer des politiques appropriées :
```sql
-- Lecture
CREATE POLICY "read_policy"
  ON table_name
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Création
CREATE POLICY "insert_policy"
  ON table_name
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Modification
CREATE POLICY "update_policy"
  ON table_name
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Suppression
CREATE POLICY "delete_policy"
  ON table_name
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
```

## Exemples pratiques

1. Utilisation dans un composant React :
```typescript
import React from 'react';
import { useTable } from '../hooks/useSupabase';

function UserList() {
  const { data: users, loading, error } = useTable('users', {
    select: 'id, email, created_at',
    order: { column: 'created_at', ascending: false }
  });

  if (loading) return <div>Chargement...</div>;
  if (error) return <div>Erreur: {error.message}</div>;

  return (
    <div>
      {users?.map(user => (
        <div key={user.id}>{user.email}</div>
      ))}
    </div>
  );
}
```

2. Opérations CRUD :
```typescript
// Création
const { data, error } = await supabase
  .from('table_name')
  .insert([{ column: 'value' }])
  .select();

// Lecture
const { data, error } = await supabase
  .from('table_name')
  .select('*')
  .eq('column', 'value');

// Modification
const { data, error } = await supabase
  .from('table_name')
  .update({ column: 'new_value' })
  .eq('id', 'record_id')
  .select();

// Suppression
const { error } = await supabase
  .from('table_name')
  .delete()
  .eq('id', 'record_id');
```