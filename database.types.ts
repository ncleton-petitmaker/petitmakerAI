export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      account_deletion_requests: {
        Row: {
          created_at: string | null
          id: string
          processed: boolean | null
          processed_at: string | null
          reason: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          processed?: boolean | null
          processed_at?: string | null
          reason?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          processed?: boolean | null
          processed_at?: string | null
          reason?: string | null
          user_id?: string
        }
        Relationships: []
      }
      announcements: {
        Row: {
          content: string
          created_at: string | null
          date: string | null
          id: string
          priority: string | null
          title: string
        }
        Insert: {
          content: string
          created_at?: string | null
          date?: string | null
          id?: string
          priority?: string | null
          title: string
        }
        Update: {
          content?: string
          created_at?: string | null
          date?: string | null
          id?: string
          priority?: string | null
          title?: string
        }
        Relationships: []
      }
      companies: {
        Row: {
          address: string | null
          city: string | null
          country: string | null
          created_at: string | null
          email: string | null
          id: string
          industry: string | null
          name: string
          notes: string | null
          phone: string | null
          postal_code: string | null
          siret: string | null
          size: string | null
          status: string | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          industry?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          siret?: string | null
          size?: string | null
          status?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          industry?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          siret?: string | null
          size?: string | null
          status?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: []
      }
      documents: {
        Row: {
          company_id: string | null
          created_at: string | null
          created_by: string | null
          file_url: string | null
          id: string
          title: string
          training_id: string | null
          type: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          file_url?: string | null
          id?: string
          title: string
          training_id?: string | null
          type?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          file_url?: string | null
          id?: string
          title?: string
          training_id?: string | null
          type?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_training_id_fkey"
            columns: ["training_id"]
            isOneToOne: false
            referencedRelation: "trainings"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluation_responses: {
        Row: {
          created_at: string | null
          id: string
          responses: Json
          score: number | null
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          responses: Json
          score?: number | null
          type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          responses?: Json
          score?: number | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          title: string
          type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      questionnaire_questions: {
        Row: {
          correct_answer: string | null
          created_at: string
          id: string
          is_required: boolean
          options: Json | null
          order_index: number
          question_text: string
          question_type: Database["public"]["Enums"]["question_type"]
          template_id: string | null
          updated_at: string
        }
        Insert: {
          correct_answer?: string | null
          created_at?: string
          id?: string
          is_required?: boolean
          options?: Json | null
          order_index: number
          question_text: string
          question_type?: Database["public"]["Enums"]["question_type"]
          template_id?: string | null
          updated_at?: string
        }
        Update: {
          correct_answer?: string | null
          created_at?: string
          id?: string
          is_required?: boolean
          options?: Json | null
          order_index?: number
          question_text?: string
          question_type?: Database["public"]["Enums"]["question_type"]
          template_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "questionnaire_questions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "questionnaire_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      questionnaire_responses: {
        Row: {
          created_at: string
          id: string
          responses: Json
          score: number | null
          sous_type:
            | Database["public"]["Enums"]["questionnaire_sous_type"]
            | null
          template_id: string | null
          type: Database["public"]["Enums"]["questionnaire_type"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          responses?: Json
          score?: number | null
          sous_type?:
            | Database["public"]["Enums"]["questionnaire_sous_type"]
            | null
          template_id?: string | null
          type?: Database["public"]["Enums"]["questionnaire_type"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          responses?: Json
          score?: number | null
          sous_type?:
            | Database["public"]["Enums"]["questionnaire_sous_type"]
            | null
          template_id?: string | null
          type?: Database["public"]["Enums"]["questionnaire_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "questionnaire_responses_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "questionnaire_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      questionnaire_templates: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          title: string | null
          training_id: string | null
          type: Database["public"]["Enums"]["questionnaire_type"]
          updated_at: string
          version: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          title?: string | null
          training_id?: string | null
          type?: Database["public"]["Enums"]["questionnaire_type"]
          updated_at?: string
          version?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          title?: string | null
          training_id?: string | null
          type?: Database["public"]["Enums"]["questionnaire_type"]
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "questionnaire_templates_training_id_fkey"
            columns: ["training_id"]
            isOneToOne: false
            referencedRelation: "trainings"
            referencedColumns: ["id"]
          },
        ]
      }
      resource_categories: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      resources: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          id: string
          title: string
          type: string | null
          url: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          title: string
          type?: string | null
          url: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          title?: string
          type?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "resources_category_fkey"
            columns: ["category"]
            isOneToOne: false
            referencedRelation: "resource_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      satisfaction_responses: {
        Row: {
          created_at: string | null
          id: string
          responses: Json
          template_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          responses: Json
          template_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          responses?: Json
          template_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "satisfaction_responses_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "questionnaire_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          address: string | null
          city: string | null
          company_name: string
          country: string | null
          created_at: string | null
          email: string | null
          id: number
          internal_rules_path: string | null
          logo_path: string | null
          phone: string | null
          postal_code: string | null
          signature_path: string | null
          siret: string | null
          training_number: string | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          company_name: string
          country?: string | null
          created_at?: string | null
          email?: string | null
          id?: number
          internal_rules_path?: string | null
          logo_path?: string | null
          phone?: string | null
          postal_code?: string | null
          signature_path?: string | null
          siret?: string | null
          training_number?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          company_name?: string
          country?: string | null
          created_at?: string | null
          email?: string | null
          id?: number
          internal_rules_path?: string | null
          logo_path?: string | null
          phone?: string | null
          postal_code?: string | null
          signature_path?: string | null
          siret?: string | null
          training_number?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: []
      }
      storage_deletion_queue: {
        Row: {
          bucket_name: string
          created_at: string | null
          file_url: string
          id: string
        }
        Insert: {
          bucket_name: string
          created_at?: string | null
          file_url: string
          id?: string
        }
        Update: {
          bucket_name?: string
          created_at?: string | null
          file_url?: string
          id?: string
        }
        Relationships: []
      }
      trainers: {
        Row: {
          adaptation_capacity: string | null
          continuous_improvement: string | null
          created_at: string | null
          cv_url: string | null
          digital_tools_mastery: string | null
          email: string
          evaluation_skills: string | null
          full_name: string
          id: string
          is_public: boolean | null
          pedagogical_skills: string
          phone: string | null
          professional_experience: string
          profile_picture_url: string | null
          qualifications: string
          technical_skills: string
          updated_at: string | null
        }
        Insert: {
          adaptation_capacity?: string | null
          continuous_improvement?: string | null
          created_at?: string | null
          cv_url?: string | null
          digital_tools_mastery?: string | null
          email: string
          evaluation_skills?: string | null
          full_name: string
          id?: string
          is_public?: boolean | null
          pedagogical_skills: string
          phone?: string | null
          professional_experience: string
          profile_picture_url?: string | null
          qualifications: string
          technical_skills: string
          updated_at?: string | null
        }
        Update: {
          adaptation_capacity?: string | null
          continuous_improvement?: string | null
          created_at?: string | null
          cv_url?: string | null
          digital_tools_mastery?: string | null
          email?: string
          evaluation_skills?: string | null
          full_name?: string
          id?: string
          is_public?: boolean | null
          pedagogical_skills?: string
          phone?: string | null
          professional_experience?: string
          profile_picture_url?: string | null
          qualifications?: string
          technical_skills?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      trainings: {
        Row: {
          accessibility_info: string | null
          agreement_template_url: string | null
          attendance_template_url: string | null
          company_id: string | null
          company_name: string | null
          completion_template_url: string | null
          content: string | null
          created_at: string | null
          dates: string | null
          description: string | null
          duration: string | null
          end_date: string | null
          evaluation_methods: Json | null
          id: string
          location: string | null
          material_elements: Json | null
          max_participants: number | null
          metadata: string | null
          min_participants: number | null
          objectives: Json | null
          pedagogical_methods: Json | null
          periods: Json | null
          prerequisites: string | null
          price: number | null
          registration_deadline: string | null
          schedule: string | null
          start_date: string | null
          status: string | null
          target_audience: string | null
          time_slots: Json | null
          title: string
          tracking_methods: Json | null
          trainer_id: string | null
          trainer_name: string | null
          updated_at: string | null
        }
        Insert: {
          accessibility_info?: string | null
          agreement_template_url?: string | null
          attendance_template_url?: string | null
          company_id?: string | null
          company_name?: string | null
          completion_template_url?: string | null
          content?: string | null
          created_at?: string | null
          dates?: string | null
          description?: string | null
          duration?: string | null
          end_date?: string | null
          evaluation_methods?: Json | null
          id?: string
          location?: string | null
          material_elements?: Json | null
          max_participants?: number | null
          metadata?: string | null
          min_participants?: number | null
          objectives?: Json | null
          pedagogical_methods?: Json | null
          periods?: Json | null
          prerequisites?: string | null
          price?: number | null
          registration_deadline?: string | null
          schedule?: string | null
          start_date?: string | null
          status?: string | null
          target_audience?: string | null
          time_slots?: Json | null
          title: string
          tracking_methods?: Json | null
          trainer_id?: string | null
          trainer_name?: string | null
          updated_at?: string | null
        }
        Update: {
          accessibility_info?: string | null
          agreement_template_url?: string | null
          attendance_template_url?: string | null
          company_id?: string | null
          company_name?: string | null
          completion_template_url?: string | null
          content?: string | null
          created_at?: string | null
          dates?: string | null
          description?: string | null
          duration?: string | null
          end_date?: string | null
          evaluation_methods?: Json | null
          id?: string
          location?: string | null
          material_elements?: Json | null
          max_participants?: number | null
          metadata?: string | null
          min_participants?: number | null
          objectives?: Json | null
          pedagogical_methods?: Json | null
          periods?: Json | null
          prerequisites?: string | null
          price?: number | null
          registration_deadline?: string | null
          schedule?: string | null
          start_date?: string | null
          status?: string | null
          target_audience?: string | null
          time_slots?: Json | null
          title?: string
          tracking_methods?: Json | null
          trainer_id?: string | null
          trainer_name?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trainings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trainings_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "trainers"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          agreement_signature_date: string | null
          agreement_signature_url: string | null
          attendance_signature_date: string | null
          attendance_signature_url: string | null
          certificate_signature_date: string | null
          certificate_signature_url: string | null
          company: string
          company_id: string | null
          created_at: string | null
          final_evaluation_completed: boolean | null
          final_evaluation_score: number | null
          first_name: string
          google_photo_url: string | null
          has_signed_agreement: boolean
          has_signed_attendance: boolean
          has_signed_certificate: boolean | null
          id: string
          initial_evaluation_completed: boolean | null
          initial_evaluation_score: number | null
          internal_rules_acknowledged: boolean
          is_admin: boolean | null
          job_position: string | null
          last_login: string | null
          last_name: string
          photo_url: string | null
          progress: number | null
          questionnaire_completed: boolean | null
          satisfaction_completed: boolean | null
          status: string | null
          training_id: string | null
          training_status: string | null
          updated_at: string | null
        }
        Insert: {
          agreement_signature_date?: string | null
          agreement_signature_url?: string | null
          attendance_signature_date?: string | null
          attendance_signature_url?: string | null
          certificate_signature_date?: string | null
          certificate_signature_url?: string | null
          company?: string
          company_id?: string | null
          created_at?: string | null
          final_evaluation_completed?: boolean | null
          final_evaluation_score?: number | null
          first_name?: string
          google_photo_url?: string | null
          has_signed_agreement?: boolean
          has_signed_attendance?: boolean
          has_signed_certificate?: boolean | null
          id: string
          initial_evaluation_completed?: boolean | null
          initial_evaluation_score?: number | null
          internal_rules_acknowledged?: boolean
          is_admin?: boolean | null
          job_position?: string | null
          last_login?: string | null
          last_name?: string
          photo_url?: string | null
          progress?: number | null
          questionnaire_completed?: boolean | null
          satisfaction_completed?: boolean | null
          status?: string | null
          training_id?: string | null
          training_status?: string | null
          updated_at?: string | null
        }
        Update: {
          agreement_signature_date?: string | null
          agreement_signature_url?: string | null
          attendance_signature_date?: string | null
          attendance_signature_url?: string | null
          certificate_signature_date?: string | null
          certificate_signature_url?: string | null
          company?: string
          company_id?: string | null
          created_at?: string | null
          final_evaluation_completed?: boolean | null
          final_evaluation_score?: number | null
          first_name?: string
          google_photo_url?: string | null
          has_signed_agreement?: boolean
          has_signed_attendance?: boolean
          has_signed_certificate?: boolean | null
          id?: string
          initial_evaluation_completed?: boolean | null
          initial_evaluation_score?: number | null
          internal_rules_acknowledged?: boolean
          is_admin?: boolean | null
          job_position?: string | null
          last_login?: string | null
          last_name?: string
          photo_url?: string | null
          progress?: number | null
          questionnaire_completed?: boolean | null
          satisfaction_completed?: boolean | null
          status?: string | null
          training_id?: string | null
          training_status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_profiles_training_id_fkey"
            columns: ["training_id"]
            isOneToOne: false
            referencedRelation: "trainings"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      auth_check_user_exists: {
        Args: {
          user_id: string
        }
        Returns: boolean
      }
      auth_get_user_email: {
        Args: {
          user_id: string
        }
        Returns: string
      }
      check_admin_status_safe: {
        Args: {
          user_uuid: string
        }
        Returns: boolean
      }
      check_admin_status_safe_v2: {
        Args: {
          user_uuid: string
        }
        Returns: boolean
      }
      check_admin_status_with_retries: {
        Args: {
          user_uuid: string
        }
        Returns: boolean
      }
      check_connection: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      check_connection_safe: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      check_connection_safe_v2: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      check_database_connection: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      check_database_connection_with_retries: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      check_database_health: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      check_function_exists: {
        Args: {
          function_name: string
        }
        Returns: boolean
      }
      check_is_admin: {
        Args: {
          user_uuid: string
        }
        Returns: boolean
      }
      check_tables_exist: {
        Args: {
          table_names: string[]
        }
        Returns: string[]
      }
      check_user_is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      create_bucket_if_not_exists: {
        Args: {
          bucket_name: string
          is_public: boolean
        }
        Returns: undefined
      }
      create_companies_table_if_not_exists: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      create_documents_table_if_not_exists: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      create_learners_table_if_not_exists: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      create_notifications_table_if_not_exists: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      create_storage_policies: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      create_training_periods_tables: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      create_trainings_table_if_not_exists: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      create_user_profiles_table_if_not_exists: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      execute_sql: {
        Args: {
          sql: string
        }
        Returns: undefined
      }
      fix_training_periods_policies: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_all_learners: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          first_name: string
          last_name: string
          company: string
          company_id: string
          job_position: string
          status: string
          last_login: string
          created_at: string
        }[]
      }
      get_all_trainers: {
        Args: Record<PropertyKey, never>
        Returns: {
          adaptation_capacity: string | null
          continuous_improvement: string | null
          created_at: string | null
          cv_url: string | null
          digital_tools_mastery: string | null
          email: string
          evaluation_skills: string | null
          full_name: string
          id: string
          is_public: boolean | null
          pedagogical_skills: string
          phone: string | null
          professional_experience: string
          profile_picture_url: string | null
          qualifications: string
          technical_skills: string
          updated_at: string | null
        }[]
      }
      get_auth_user_email: {
        Args: {
          user_id: string
        }
        Returns: string
      }
      get_auth_users_email: {
        Args: {
          user_id: string
        }
        Returns: string
      }
      get_auth_users_email_with_retries: {
        Args: {
          user_id: string
        }
        Returns: string
      }
      get_columns: {
        Args: {
          table_name: string
        }
        Returns: {
          column_name: string
          data_type: string
          is_nullable: string
        }[]
      }
      get_connection_status: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_document_url: {
        Args: {
          document_id: string
        }
        Returns: string
      }
      get_evaluation_responses: {
        Args: {
          user_uuid: string
          eval_type: string
        }
        Returns: {
          id: string
          user_id: string
          type: string
          responses: Json
          score: number
          created_at: string
        }[]
      }
      get_questionnaire_responses: {
        Args: {
          user_uuid: string
        }
        Returns: {
          id: string
          user_id: string
          responses: Json
          created_at: string
        }[]
      }
      get_questionnaire_status: {
        Args: {
          user_uuid: string
        }
        Returns: {
          user_id: string
          first_name: string
          last_name: string
          company: string
          positioning_completed: boolean
          initial_evaluation_completed: boolean
          final_evaluation_completed: boolean
          satisfaction_completed: boolean
          last_response_at: string
        }[]
      }
      get_satisfaction_responses: {
        Args: {
          user_uuid: string
        }
        Returns: {
          id: string
          user_id: string
          responses: Json
          created_at: string
        }[]
      }
      get_server_timestamp: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_tables: {
        Args: Record<PropertyKey, never>
        Returns: {
          tablename: string
        }[]
      }
      get_user_email: {
        Args: {
          user_id: string
        }
        Returns: string
      }
      get_user_profile_safe: {
        Args: {
          user_uuid: string
        }
        Returns: {
          id: string
          is_admin: boolean
          first_name: string
          last_name: string
          company_id: string
          created_at: string
          updated_at: string
        }[]
      }
      get_user_profile_safe_v2: {
        Args: {
          user_uuid: string
        }
        Returns: {
          id: string
          is_admin: boolean
          first_name: string
          last_name: string
          company_id: string
          created_at: string
          updated_at: string
        }[]
      }
      get_user_profile_with_retries: {
        Args: {
          user_uuid: string
        }
        Returns: {
          id: string
          is_admin: boolean
          first_name: string
          last_name: string
          company_id: string
          created_at: string
          updated_at: string
        }[]
      }
      get_user_profile_with_timeout: {
        Args: {
          user_uuid: string
        }
        Returns: {
          id: string
          is_admin: boolean
          first_name: string
          last_name: string
          company_id: string
          created_at: string
          updated_at: string
        }[]
      }
      is_admin:
        | {
            Args: Record<PropertyKey, never>
            Returns: boolean
          }
        | {
            Args: {
              user_id: string
            }
            Returns: boolean
          }
      is_questionnaire_completed: {
        Args: {
          user_uuid: string
          questionnaire_type: string
        }
        Returns: boolean
      }
      query_db: {
        Args: {
          sql_query: string
        }
        Returns: Json
      }
      save_training_with_trainer: {
        Args: {
          training_data: Json
          trainer_id: string
        }
        Returns: Json
      }
      update_questionnaire_status: {
        Args: {
          user_uuid: string
          questionnaire_type: string
          completed: boolean
        }
        Returns: undefined
      }
      user_exists: {
        Args: {
          user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      question_type: "multiple_choice" | "rating" | "short_answer" | "yes_no"
      questionnaire_sous_type: "initial" | "final"
      questionnaire_type:
        | "positioning"
        | "initial_final_evaluation"
        | "satisfaction"
        | "a"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
