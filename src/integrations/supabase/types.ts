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
          description: string
          duration: string
          icon_name: string
          id: number
          status: string
          title: string
        }
        Insert: {
          color?: string
          created_at?: string
          description?: string
          duration?: string
          icon_name?: string
          id?: number
          status?: string
          title: string
        }
        Update: {
          color?: string
          created_at?: string
          description?: string
          duration?: string
          icon_name?: string
          id?: number
          status?: string
          title?: string
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
        }
        Relationships: [
          {
            foreignKeyName: "admin_section_content_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "admin_modules"
            referencedColumns: ["id"]
          },
        ]
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
      quiz_question_bank: {
        Row: {
          correct: number
          created_at: string
          explanation: string
          id: string
          module_id: number
          module_name: string
          options: Json
          question: string
          source: string
        }
        Insert: {
          correct: number
          created_at?: string
          explanation?: string
          id?: string
          module_id: number
          module_name: string
          options?: Json
          question: string
          source?: string
        }
        Update: {
          correct?: number
          created_at?: string
          explanation?: string
          id?: string
          module_id?: number
          module_name?: string
          options?: Json
          question?: string
          source?: string
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
          id: string
          stream_id: string
          student_name: string
          updated_at: string
        }
        Insert: {
          completed_docs?: Json
          completed_steps?: Json
          id?: string
          stream_id: string
          student_name: string
          updated_at?: string
        }
        Update: {
          completed_docs?: Json
          completed_steps?: Json
          id?: string
          stream_id?: string
          student_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      students: {
        Row: {
          college: string
          created_at: string
          email: string
          id: string
          location: string
          mobile: string
          name: string
        }
        Insert: {
          college: string
          created_at?: string
          email: string
          id?: string
          location: string
          mobile: string
          name: string
        }
        Update: {
          college?: string
          created_at?: string
          email?: string
          id?: string
          location?: string
          mobile?: string
          name?: string
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
    Enums: {},
  },
} as const
