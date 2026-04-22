export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      admin_module_topics: {
        Row: {
          created_at: string
          description: string
          id: string
          module_id: number
          sort_order: number
          suggested_videos: string[]
          title: string
        }
        Insert: {
          created_at?: string
          description?: string
          id?: string
          module_id: number
          sort_order?: number
          suggested_videos?: string[]
          title: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          module_id?: number
          sort_order?: number
          suggested_videos?: string[]
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_module_topics_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "admin_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_modules: {
        Row: {
          color: string
          created_at: string
          created_by: string
          description: string
          duration: string
          icon_name: string
          id: number
          status: string
          title: string
          trainer_id: string | null
        }
        Insert: {
          color?: string
          created_at?: string
          created_by?: string
          description?: string
          duration?: string
          icon_name?: string
          id?: number
          status?: string
          title: string
          trainer_id?: string | null
        }
        Update: {
          color?: string
          created_at?: string
          created_by?: string
          description?: string
          duration?: string
          icon_name?: string
          id?: number
          status?: string
          title?: string
          trainer_id?: string | null
        }
        Relationships: []
      }
      admin_section_content: {
        Row: {
          content: Json
          created_at: string
          id: string
          module_id: number | null
          section_type: string
          sort_order: number
          status: string
          title: string
          topic_id: string | null
        }
        Insert: {
          content?: Json
          created_at?: string
          id?: string
          module_id?: number | null
          section_type: string
          sort_order?: number
          status?: string
          title: string
          topic_id?: string | null
        }
        Update: {
          content?: Json
          created_at?: string
          id?: string
          module_id?: number | null
          section_type?: string
          sort_order?: number
          status?: string
          title?: string
          topic_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_section_content_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "admin_modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_section_content_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "admin_module_topics"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_attempts: {
        Row: {
          ai_grading: Json
          answers: Json
          assessment_id: string
          completed_at: string | null
          correct_answers: number
          grading_status: string
          id: string
          responses: Json
          score: number
          started_at: string
          student_college: string
          student_id: string
          student_name: string
          time_taken_seconds: number | null
          total_questions: number
        }
        Insert: {
          ai_grading?: Json
          answers?: Json
          assessment_id: string
          completed_at?: string | null
          correct_answers?: number
          grading_status?: string
          id?: string
          responses?: Json
          score?: number
          started_at?: string
          student_college?: string
          student_id: string
          student_name?: string
          time_taken_seconds?: number | null
          total_questions?: number
        }
        Update: {
          ai_grading?: Json
          answers?: Json
          assessment_id?: string
          completed_at?: string | null
          correct_answers?: number
          grading_status?: string
          id?: string
          responses?: Json
          score?: number
          started_at?: string
          student_college?: string
          student_id?: string
          student_name?: string
          time_taken_seconds?: number | null
          total_questions?: number
        }
        Relationships: [
          {
            foreignKeyName: "assessment_attempts_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_questions: {
        Row: {
          assessment_id: string
          correct: number | null
          created_at: string
          expected_answer: string
          explanation: string
          id: string
          language: string
          max_score: number
          options: Json
          question: string
          question_type: string
          sort_order: number
          source: string
          starter_code: string
          time_limit_seconds: number | null
        }
        Insert: {
          assessment_id: string
          correct?: number | null
          created_at?: string
          expected_answer?: string
          explanation?: string
          id?: string
          language?: string
          max_score?: number
          options?: Json
          question: string
          question_type?: string
          sort_order?: number
          source?: string
          starter_code?: string
          time_limit_seconds?: number | null
        }
        Update: {
          assessment_id?: string
          correct?: number | null
          created_at?: string
          expected_answer?: string
          explanation?: string
          id?: string
          language?: string
          max_score?: number
          options?: Json
          question?: string
          question_type?: string
          sort_order?: number
          source?: string
          starter_code?: string
          time_limit_seconds?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "assessment_questions_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      assessments: {
        Row: {
          assigned_colleges: string[]
          created_at: string
          created_by: string
          created_by_name: string
          description: string
          end_at: string | null
          id: string
          jd_file_url: string
          jd_text: string
          max_attempts: number | null
          module_id: number | null
          passing_score: number
          proctoring_enabled: boolean
          question_count: number
          question_mix: Json
          source_mode: string
          start_at: string | null
          status: string
          time_limit_minutes: number | null
          title: string
          topic_or_skills: string
          updated_at: string
        }
        Insert: {
          assigned_colleges?: string[]
          created_at?: string
          created_by?: string
          created_by_name?: string
          description?: string
          end_at?: string | null
          id?: string
          jd_file_url?: string
          jd_text?: string
          max_attempts?: number | null
          module_id?: number | null
          passing_score?: number
          proctoring_enabled?: boolean
          question_count?: number
          question_mix?: Json
          source_mode?: string
          start_at?: string | null
          status?: string
          time_limit_minutes?: number | null
          title: string
          topic_or_skills?: string
          updated_at?: string
        }
        Update: {
          assigned_colleges?: string[]
          created_at?: string
          created_by?: string
          created_by_name?: string
          description?: string
          end_at?: string | null
          id?: string
          jd_file_url?: string
          jd_text?: string
          max_attempts?: number | null
          module_id?: number | null
          passing_score?: number
          proctoring_enabled?: boolean
          question_count?: number
          question_mix?: Json
          source_mode?: string
          start_at?: string | null
          status?: string
          time_limit_minutes?: number | null
          title?: string
          topic_or_skills?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessments_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "admin_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_diagnostic_results: {
        Row: {
          answers: Json
          candidate_id: string
          candidate_name: string
          correct_answers: number
          id: string
          score: number
          taken_at: string
          topic_breakdown: Json
          total_questions: number
        }
        Insert: {
          answers?: Json
          candidate_id: string
          candidate_name?: string
          correct_answers?: number
          id?: string
          score?: number
          taken_at?: string
          topic_breakdown?: Json
          total_questions?: number
        }
        Update: {
          answers?: Json
          candidate_id?: string
          candidate_name?: string
          correct_answers?: number
          id?: string
          score?: number
          taken_at?: string
          topic_breakdown?: Json
          total_questions?: number
        }
        Relationships: []
      }
      candidate_learning_path_modules: {
        Row: {
          created_at: string
          id: string
          module_id: number
          module_title: string
          path_id: string
          reason: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          module_id: number
          module_title?: string
          path_id: string
          reason?: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          module_id?: number
          module_title?: string
          path_id?: string
          reason?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "candidate_learning_path_modules_path_id_fkey"
            columns: ["path_id"]
            isOneToOne: false
            referencedRelation: "candidate_learning_paths"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_learning_paths: {
        Row: {
          candidate_id: string
          candidate_name: string
          generated_at: string
          id: string
          is_beginner_default: boolean
          model_used: string
          rationale: string
          source: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          candidate_id: string
          candidate_name?: string
          generated_at?: string
          id?: string
          is_beginner_default?: boolean
          model_used?: string
          rationale?: string
          source?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Update: {
          candidate_id?: string
          candidate_name?: string
          generated_at?: string
          id?: string
          is_beginner_default?: boolean
          model_used?: string
          rationale?: string
          source?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      coding_challenges: {
        Row: {
          category: string
          created_at: string
          description: string
          difficulty: string
          id: string
          sample_input: string | null
          sample_output: string | null
          source: string
          title: string
        }
        Insert: {
          category?: string
          created_at?: string
          description: string
          difficulty?: string
          id?: string
          sample_input?: string | null
          sample_output?: string | null
          source?: string
          title: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          difficulty?: string
          id?: string
          sample_input?: string | null
          sample_output?: string | null
          source?: string
          title?: string
        }
        Relationships: []
      }
      colleges: {
        Row: {
          created_at: string
          id: number
          name: string
        }
        Insert: {
          created_at?: string
          id?: never
          name: string
        }
        Update: {
          created_at?: string
          id?: never
          name?: string
        }
        Relationships: []
      }
      learning_path_assignments: {
        Row: {
          college: string
          created_at: string
          degree: string
          department: string
          id: string
          path_id: string
        }
        Insert: {
          college?: string
          created_at?: string
          degree?: string
          department?: string
          id?: string
          path_id: string
        }
        Update: {
          college?: string
          created_at?: string
          degree?: string
          department?: string
          id?: string
          path_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "learning_path_assignments_path_id_fkey"
            columns: ["path_id"]
            isOneToOne: false
            referencedRelation: "learning_paths"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_path_modules: {
        Row: {
          created_at: string
          id: string
          module_id: number
          path_id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          module_id: number
          path_id: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          module_id?: number
          path_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "learning_path_modules_path_id_fkey"
            columns: ["path_id"]
            isOneToOne: false
            referencedRelation: "learning_paths"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_paths: {
        Row: {
          created_at: string
          description: string
          id: string
          required_tier: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string
          id?: string
          required_tier?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          required_tier?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      llm_settings: {
        Row: {
          age_group_difficulty_overrides: Json
          default_model: string
          default_provider: string
          enabled_providers: Json
          id: string
          provider_models: Json
          updated_at: string
          updated_by: string
        }
        Insert: {
          age_group_difficulty_overrides?: Json
          default_model?: string
          default_provider?: string
          enabled_providers?: Json
          id?: string
          provider_models?: Json
          updated_at?: string
          updated_by?: string
        }
        Update: {
          age_group_difficulty_overrides?: Json
          default_model?: string
          default_provider?: string
          enabled_providers?: Json
          id?: string
          provider_models?: Json
          updated_at?: string
          updated_by?: string
        }
        Relationships: []
      }
      llm_usage_logs: {
        Row: {
          completion_tokens: number
          created_at: string
          estimated_cost_usd: number
          feature: string
          id: string
          latency_ms: number
          model: string
          prompt_tokens: number
          provider: string
          status: string
          total_tokens: number
          user_id: string
          user_name: string
          user_role: string
        }
        Insert: {
          completion_tokens?: number
          created_at?: string
          estimated_cost_usd?: number
          feature?: string
          id?: string
          latency_ms?: number
          model: string
          prompt_tokens?: number
          provider: string
          status?: string
          total_tokens?: number
          user_id?: string
          user_name?: string
          user_role?: string
        }
        Update: {
          completion_tokens?: number
          created_at?: string
          estimated_cost_usd?: number
          feature?: string
          id?: string
          latency_ms?: number
          model?: string
          prompt_tokens?: number
          provider?: string
          status?: string
          total_tokens?: number
          user_id?: string
          user_name?: string
          user_role?: string
        }
        Relationships: []
      }
      locations: {
        Row: {
          created_at: string
          id: number
          name: string
        }
        Insert: {
          created_at?: string
          id?: never
          name: string
        }
        Update: {
          created_at?: string
          id?: never
          name?: string
        }
        Relationships: []
      }
      login_attempts: {
        Row: {
          audience: string
          created_at: string
          id: string
          identifier: string
          identifier_type: string
          ip_address: string
          reason: string
          stage: string
          status: string
          user_agent: string
          user_id: string | null
          user_name: string
        }
        Insert: {
          audience?: string
          created_at?: string
          id?: string
          identifier?: string
          identifier_type?: string
          ip_address?: string
          reason?: string
          stage?: string
          status?: string
          user_agent?: string
          user_id?: string | null
          user_name?: string
        }
        Update: {
          audience?: string
          created_at?: string
          id?: string
          identifier?: string
          identifier_type?: string
          ip_address?: string
          reason?: string
          stage?: string
          status?: string
          user_agent?: string
          user_id?: string | null
          user_name?: string
        }
        Relationships: []
      }
      menu_access_controls: {
        Row: {
          advanced_access: boolean
          audience: string
          beginner_access: boolean
          enterprise_access: boolean
          free_access: boolean
          id: string
          label: string
          menu_key: string
          premium_access: boolean
          sort_order: number
          updated_at: string
        }
        Insert: {
          advanced_access?: boolean
          audience?: string
          beginner_access?: boolean
          enterprise_access?: boolean
          free_access?: boolean
          id?: string
          label?: string
          menu_key: string
          premium_access?: boolean
          sort_order?: number
          updated_at?: string
        }
        Update: {
          advanced_access?: boolean
          audience?: string
          beginner_access?: boolean
          enterprise_access?: boolean
          free_access?: boolean
          id?: string
          label?: string
          menu_key?: string
          premium_access?: boolean
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      module_group_assignments: {
        Row: {
          college: string
          created_at: string
          degree: string
          department: string
          group_id: string
          id: string
          scope_type: string
          student_id: string | null
        }
        Insert: {
          college?: string
          created_at?: string
          degree?: string
          department?: string
          group_id: string
          id?: string
          scope_type?: string
          student_id?: string | null
        }
        Update: {
          college?: string
          created_at?: string
          degree?: string
          department?: string
          group_id?: string
          id?: string
          scope_type?: string
          student_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "module_group_assignments_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "module_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      module_group_items: {
        Row: {
          created_at: string
          group_id: string
          id: string
          module_id: number
          module_title: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          module_id: number
          module_title?: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          module_id?: number
          module_title?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "module_group_items_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "module_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      module_groups: {
        Row: {
          created_at: string
          description: string
          id: string
          name: string
          owner_id: string
          owner_name: string
          owner_role: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string
          id?: string
          name: string
          owner_id?: string
          owner_name?: string
          owner_role?: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          name?: string
          owner_id?: string
          owner_name?: string
          owner_role?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      path_regeneration_settings: {
        Row: {
          day_of_month: number
          day_of_week: number
          enabled: boolean
          frequency: string
          hour_utc: number
          id: string
          last_run_at: string | null
          last_run_count: number
          minute_utc: number
          updated_at: string
          updated_by: string
        }
        Insert: {
          day_of_month?: number
          day_of_week?: number
          enabled?: boolean
          frequency?: string
          hour_utc?: number
          id?: string
          last_run_at?: string | null
          last_run_count?: number
          minute_utc?: number
          updated_at?: string
          updated_by?: string
        }
        Update: {
          day_of_month?: number
          day_of_week?: number
          enabled?: boolean
          frequency?: string
          hour_utc?: number
          id?: string
          last_run_at?: string | null
          last_run_count?: number
          minute_utc?: number
          updated_at?: string
          updated_by?: string
        }
        Relationships: []
      }
      proctoring_active_sessions: {
        Row: {
          assessment_id: string
          browser_info: string
          created_at: string
          id: string
          last_heartbeat: string
          session_id: string
          student_id: string
        }
        Insert: {
          assessment_id: string
          browser_info?: string
          created_at?: string
          id?: string
          last_heartbeat?: string
          session_id: string
          student_id: string
        }
        Update: {
          assessment_id?: string
          browser_info?: string
          created_at?: string
          id?: string
          last_heartbeat?: string
          session_id?: string
          student_id?: string
        }
        Relationships: []
      }
      proctoring_logs: {
        Row: {
          assessment_id: string
          attempt_id: string
          created_at: string
          event_data: Json
          event_type: string
          id: string
          photo_url: string | null
          student_id: string
          student_name: string
        }
        Insert: {
          assessment_id: string
          attempt_id: string
          created_at?: string
          event_data?: Json
          event_type: string
          id?: string
          photo_url?: string | null
          student_id: string
          student_name?: string
        }
        Update: {
          assessment_id?: string
          attempt_id?: string
          created_at?: string
          event_data?: Json
          event_type?: string
          id?: string
          photo_url?: string | null
          student_id?: string
          student_name?: string
        }
        Relationships: []
      }
      proctoring_summary: {
        Row: {
          assessment_id: string
          attempt_id: string
          created_at: string
          eye_movement_violations: number
          face_not_detected_count: number
          fullscreen_exit_count: number
          id: string
          multiple_faces_count: number
          photos_captured: number
          proctoring_score: number
          status: string
          student_id: string
          student_name: string
          tab_switch_count: number
        }
        Insert: {
          assessment_id: string
          attempt_id: string
          created_at?: string
          eye_movement_violations?: number
          face_not_detected_count?: number
          fullscreen_exit_count?: number
          id?: string
          multiple_faces_count?: number
          photos_captured?: number
          proctoring_score?: number
          status?: string
          student_id: string
          student_name?: string
          tab_switch_count?: number
        }
        Update: {
          assessment_id?: string
          attempt_id?: string
          created_at?: string
          eye_movement_violations?: number
          face_not_detected_count?: number
          fullscreen_exit_count?: number
          id?: string
          multiple_faces_count?: number
          photos_captured?: number
          proctoring_score?: number
          status?: string
          student_id?: string
          student_name?: string
          tab_switch_count?: number
        }
        Relationships: []
      }
      project_assignments: {
        Row: {
          assigner_id: string
          assigner_name: string
          assigner_role: string
          created_at: string
          description: string
          due_date: string | null
          id: string
          source_type: string
          status: string
          stream_id: string
          student_id: string
          student_name: string
          title: string
          updated_at: string
        }
        Insert: {
          assigner_id?: string
          assigner_name?: string
          assigner_role?: string
          created_at?: string
          description?: string
          due_date?: string | null
          id?: string
          source_type?: string
          status?: string
          stream_id?: string
          student_id: string
          student_name?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigner_id?: string
          assigner_name?: string
          assigner_role?: string
          created_at?: string
          description?: string
          due_date?: string | null
          id?: string
          source_type?: string
          status?: string
          stream_id?: string
          student_id?: string
          student_name?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      project_feedback: {
        Row: {
          created_at: string
          feedback: string
          id: string
          parent_id: string | null
          reviewer_name: string
          reviewer_role: string
          step_number: number | null
          stream_id: string
          student_name: string
        }
        Insert: {
          created_at?: string
          feedback: string
          id?: string
          parent_id?: string | null
          reviewer_name?: string
          reviewer_role?: string
          step_number?: number | null
          stream_id: string
          student_name: string
        }
        Update: {
          created_at?: string
          feedback?: string
          id?: string
          parent_id?: string | null
          reviewer_name?: string
          reviewer_role?: string
          step_number?: number | null
          stream_id?: string
          student_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_feedback_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "project_feedback"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_question_bank: {
        Row: {
          correct: number
          created_at: string
          expected_answer: string
          explanation: string
          id: string
          module_id: number
          module_name: string
          options: Json
          question: string
          question_type: string
          source: string
        }
        Insert: {
          correct: number
          created_at?: string
          expected_answer?: string
          explanation?: string
          id?: string
          module_id: number
          module_name: string
          options?: Json
          question: string
          question_type?: string
          source?: string
        }
        Update: {
          correct?: number
          created_at?: string
          expected_answer?: string
          explanation?: string
          id?: string
          module_id?: number
          module_name?: string
          options?: Json
          question?: string
          question_type?: string
          source?: string
        }
        Relationships: []
      }
      sms_gateway_settings: {
        Row: {
          enabled: boolean
          generic_auth_key_set: boolean
          generic_body_template: string
          generic_endpoint_url: string
          generic_headers: Json
          generic_http_method: string
          id: string
          msg91_auth_key_set: boolean
          msg91_dlt_te_id: string
          msg91_template_id: string
          otp_length: number
          otp_template: string
          otp_validity_minutes: number
          provider: string
          sender_id: string
          twilio_account_sid: string
          twilio_from_number: string
          updated_at: string
          updated_by: string
        }
        Insert: {
          enabled?: boolean
          generic_auth_key_set?: boolean
          generic_body_template?: string
          generic_endpoint_url?: string
          generic_headers?: Json
          generic_http_method?: string
          id?: string
          msg91_auth_key_set?: boolean
          msg91_dlt_te_id?: string
          msg91_template_id?: string
          otp_length?: number
          otp_template?: string
          otp_validity_minutes?: number
          provider?: string
          sender_id?: string
          twilio_account_sid?: string
          twilio_from_number?: string
          updated_at?: string
          updated_by?: string
        }
        Update: {
          enabled?: boolean
          generic_auth_key_set?: boolean
          generic_body_template?: string
          generic_endpoint_url?: string
          generic_headers?: Json
          generic_http_method?: string
          id?: string
          msg91_auth_key_set?: boolean
          msg91_dlt_te_id?: string
          msg91_template_id?: string
          otp_length?: number
          otp_template?: string
          otp_validity_minutes?: number
          provider?: string
          sender_id?: string
          twilio_account_sid?: string
          twilio_from_number?: string
          updated_at?: string
          updated_by?: string
        }
        Relationships: []
      }
      student_assessment_scores: {
        Row: {
          attempted_at: string
          correct_answers: number
          id: string
          module_id: number
          score: number
          student_id: string
          total_questions: number
        }
        Insert: {
          attempted_at?: string
          correct_answers: number
          id?: string
          module_id: number
          score: number
          student_id: string
          total_questions: number
        }
        Update: {
          attempted_at?: string
          correct_answers?: number
          id?: string
          module_id?: number
          score?: number
          student_id?: string
          total_questions?: number
        }
        Relationships: [
          {
            foreignKeyName: "student_assessment_scores_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_module_progress: {
        Row: {
          completed: boolean
          created_at: string
          id: string
          last_accessed: string | null
          module_id: number
          progress_percent: number
          student_id: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          id?: string
          last_accessed?: string | null
          module_id: number
          progress_percent?: number
          student_id: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          id?: string
          last_accessed?: string | null
          module_id?: number
          progress_percent?: number
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_module_progress_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_notifications: {
        Row: {
          created_at: string
          id: string
          message_id: string
          read: boolean
          student_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message_id: string
          read?: boolean
          student_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message_id?: string
          read?: boolean
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_notifications_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "trainer_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_notifications_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_project_documents: {
        Row: {
          doc_code: string | null
          file_name: string
          file_path: string
          file_size: number
          id: string
          step_number: number
          stream_id: string
          student_name: string
          uploaded_at: string
        }
        Insert: {
          doc_code?: string | null
          file_name: string
          file_path: string
          file_size?: number
          id?: string
          step_number: number
          stream_id: string
          student_name: string
          uploaded_at?: string
        }
        Update: {
          doc_code?: string | null
          file_name?: string
          file_path?: string
          file_size?: number
          id?: string
          step_number?: number
          stream_id?: string
          student_name?: string
          uploaded_at?: string
        }
        Relationships: []
      }
      student_project_progress: {
        Row: {
          completed_docs: Json
          completed_steps: Json
          github_url: string
          id: string
          project_description: string
          project_title: string
          stream_id: string
          student_name: string
          updated_at: string
        }
        Insert: {
          completed_docs?: Json
          completed_steps?: Json
          github_url?: string
          id?: string
          project_description?: string
          project_title?: string
          stream_id: string
          student_name: string
          updated_at?: string
        }
        Update: {
          completed_docs?: Json
          completed_steps?: Json
          github_url?: string
          id?: string
          project_description?: string
          project_title?: string
          stream_id?: string
          student_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      student_solved_challenges: {
        Row: {
          challenge_id: number
          id: string
          language: string
          solved_at: string
          student_name: string
        }
        Insert: {
          challenge_id: number
          id?: string
          language: string
          solved_at?: string
          student_name: string
        }
        Update: {
          challenge_id?: number
          id?: string
          language?: string
          solved_at?: string
          student_name?: string
        }
        Relationships: []
      }
      students: {
        Row: {
          age_group: string
          college: string
          created_at: string
          degree: string
          department: string
          email: string
          id: string
          location: string
          mobile: string
          name: string
          password: string
          status: string
          subscription_tier: string
        }
        Insert: {
          age_group?: string
          college: string
          created_at?: string
          degree?: string
          department?: string
          email: string
          id?: string
          location: string
          mobile: string
          name: string
          password?: string
          status?: string
          subscription_tier?: string
        }
        Update: {
          age_group?: string
          college?: string
          created_at?: string
          degree?: string
          department?: string
          email?: string
          id?: string
          location?: string
          mobile?: string
          name?: string
          password?: string
          status?: string
          subscription_tier?: string
        }
        Relationships: []
      }
      trainer_activity_log: {
        Row: {
          action: string
          actor_id: string
          actor_name: string
          created_at: string
          id: string
          reason: string
          trainer_id: string
          trainer_name: string
        }
        Insert: {
          action: string
          actor_id?: string
          actor_name?: string
          created_at?: string
          id?: string
          reason?: string
          trainer_id: string
          trainer_name?: string
        }
        Update: {
          action?: string
          actor_id?: string
          actor_name?: string
          created_at?: string
          id?: string
          reason?: string
          trainer_id?: string
          trainer_name?: string
        }
        Relationships: []
      }
      trainer_messages: {
        Row: {
          body: string
          id: string
          recipient_count: number
          sent_at: string
          subject: string
        }
        Insert: {
          body: string
          id?: string
          recipient_count?: number
          sent_at?: string
          subject: string
        }
        Update: {
          body?: string
          id?: string
          recipient_count?: number
          sent_at?: string
          subject?: string
        }
        Relationships: []
      }
      trainer_students: {
        Row: {
          created_at: string
          id: string
          student_id: string
          trainer_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          student_id: string
          trainer_id: string
        }
        Update: {
          created_at?: string
          id?: string
          student_id?: string
          trainer_id?: string
        }
        Relationships: []
      }
      trainers: {
        Row: {
          approved_at: string | null
          approved_by: string
          college: string
          created_at: string
          email: string
          id: string
          location: string
          mobile: string
          name: string
          password: string
          rejection_reason: string
          status: string
          subscription_tier: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string
          college: string
          created_at?: string
          email: string
          id?: string
          location: string
          mobile: string
          name: string
          password?: string
          rejection_reason?: string
          status?: string
          subscription_tier?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string
          college?: string
          created_at?: string
          email?: string
          id?: string
          location?: string
          mobile?: string
          name?: string
          password?: string
          rejection_reason?: string
          status?: string
          subscription_tier?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      video_lesson_questions: {
        Row: {
          chapter_index: number
          chapter_start_seconds: number
          chapter_title: string
          correct: number
          created_at: string
          explanation: string
          id: string
          lesson_id: string
          options: Json
          question: string
          sort_order: number
        }
        Insert: {
          chapter_index?: number
          chapter_start_seconds?: number
          chapter_title?: string
          correct?: number
          created_at?: string
          explanation?: string
          id?: string
          lesson_id: string
          options?: Json
          question: string
          sort_order?: number
        }
        Update: {
          chapter_index?: number
          chapter_start_seconds?: number
          chapter_title?: string
          correct?: number
          created_at?: string
          explanation?: string
          id?: string
          lesson_id?: string
          options?: Json
          question?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "video_lesson_questions_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "video_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      video_lesson_versions: {
        Row: {
          chapters: Json
          generated_at: string
          generated_by: string
          id: string
          lesson_id: string
          note: string
          questions: Json
          version: number
        }
        Insert: {
          chapters?: Json
          generated_at?: string
          generated_by?: string
          id?: string
          lesson_id: string
          note?: string
          questions?: Json
          version: number
        }
        Update: {
          chapters?: Json
          generated_at?: string
          generated_by?: string
          id?: string
          lesson_id?: string
          note?: string
          questions?: Json
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "video_lesson_versions_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "video_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      video_lessons: {
        Row: {
          chapters: Json
          created_at: string
          created_by: string
          description: string
          duration_seconds: number
          generation_error: string
          generation_status: string
          id: string
          last_regenerated_at: string | null
          module_id: number | null
          status: string
          thumbnail_url: string
          title: string
          updated_at: string
          version: number
          youtube_url: string
          youtube_video_id: string
        }
        Insert: {
          chapters?: Json
          created_at?: string
          created_by?: string
          description?: string
          duration_seconds?: number
          generation_error?: string
          generation_status?: string
          id?: string
          last_regenerated_at?: string | null
          module_id?: number | null
          status?: string
          thumbnail_url?: string
          title: string
          updated_at?: string
          version?: number
          youtube_url: string
          youtube_video_id?: string
        }
        Update: {
          chapters?: Json
          created_at?: string
          created_by?: string
          description?: string
          duration_seconds?: number
          generation_error?: string
          generation_status?: string
          id?: string
          last_regenerated_at?: string | null
          module_id?: number | null
          status?: string
          thumbnail_url?: string
          title?: string
          updated_at?: string
          version?: number
          youtube_url?: string
          youtube_video_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      sms_gateway_public: {
        Row: {
          enabled: boolean | null
          otp_length: number | null
          otp_validity_minutes: number | null
        }
        Insert: {
          enabled?: boolean | null
          otp_length?: number | null
          otp_validity_minutes?: number | null
        }
        Update: {
          enabled?: boolean | null
          otp_length?: number | null
          otp_validity_minutes?: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
