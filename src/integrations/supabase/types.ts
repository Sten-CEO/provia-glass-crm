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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      attachments: {
        Row: {
          created_at: string
          entity_id: string
          entity_type: string
          file_size: number | null
          file_type: string | null
          file_url: string
          filename: string
          id: string
        }
        Insert: {
          created_at?: string
          entity_id: string
          entity_type: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          filename: string
          id?: string
        }
        Update: {
          created_at?: string
          entity_id?: string
          entity_type?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          filename?: string
          id?: string
        }
        Relationships: []
      }
      clients: {
        Row: {
          adresse: string | null
          created_at: string
          debut: string | null
          demande: string | null
          email: string
          fin: string | null
          id: string
          nom: string
          notes: string | null
          statut: string | null
          tags: string[] | null
          telephone: string | null
          tva: string | null
          ville: string | null
        }
        Insert: {
          adresse?: string | null
          created_at?: string
          debut?: string | null
          demande?: string | null
          email: string
          fin?: string | null
          id?: string
          nom: string
          notes?: string | null
          statut?: string | null
          tags?: string[] | null
          telephone?: string | null
          tva?: string | null
          ville?: string | null
        }
        Update: {
          adresse?: string | null
          created_at?: string
          debut?: string | null
          demande?: string | null
          email?: string
          fin?: string | null
          id?: string
          nom?: string
          notes?: string | null
          statut?: string | null
          tags?: string[] | null
          telephone?: string | null
          tva?: string | null
          ville?: string | null
        }
        Relationships: []
      }
      devis: {
        Row: {
          acompte: number | null
          approved_at: string | null
          approved_by: string | null
          client_id: string | null
          client_nom: string
          conditions: string | null
          contact_email: string | null
          contact_phone: string | null
          converted_to_invoice_id: string | null
          converted_to_job_id: string | null
          created_at: string
          custom_fields: Json | null
          date_envoi: string | null
          expiry_date: string | null
          id: string
          issued_at: string | null
          lignes: Json | null
          message_client: string | null
          montant: string
          notes_internes: string | null
          numero: string
          packages: Json | null
          property_address: string | null
          remise: number | null
          salesperson: string | null
          signature_date: string | null
          signature_image: string | null
          statut: string
          title: string | null
          total_ht: number | null
          total_ttc: number | null
          vendeur: string | null
        }
        Insert: {
          acompte?: number | null
          approved_at?: string | null
          approved_by?: string | null
          client_id?: string | null
          client_nom: string
          conditions?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          converted_to_invoice_id?: string | null
          converted_to_job_id?: string | null
          created_at?: string
          custom_fields?: Json | null
          date_envoi?: string | null
          expiry_date?: string | null
          id?: string
          issued_at?: string | null
          lignes?: Json | null
          message_client?: string | null
          montant: string
          notes_internes?: string | null
          numero: string
          packages?: Json | null
          property_address?: string | null
          remise?: number | null
          salesperson?: string | null
          signature_date?: string | null
          signature_image?: string | null
          statut?: string
          title?: string | null
          total_ht?: number | null
          total_ttc?: number | null
          vendeur?: string | null
        }
        Update: {
          acompte?: number | null
          approved_at?: string | null
          approved_by?: string | null
          client_id?: string | null
          client_nom?: string
          conditions?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          converted_to_invoice_id?: string | null
          converted_to_job_id?: string | null
          created_at?: string
          custom_fields?: Json | null
          date_envoi?: string | null
          expiry_date?: string | null
          id?: string
          issued_at?: string | null
          lignes?: Json | null
          message_client?: string | null
          montant?: string
          notes_internes?: string | null
          numero?: string
          packages?: Json | null
          property_address?: string | null
          remise?: number | null
          salesperson?: string | null
          signature_date?: string | null
          signature_image?: string | null
          statut?: string
          title?: string | null
          total_ht?: number | null
          total_ttc?: number | null
          vendeur?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "devis_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      equipe: {
        Row: {
          access_controls: Json | null
          competences: string[] | null
          created_at: string
          email: string
          id: string
          nom: string
          note: string | null
          role: string
        }
        Insert: {
          access_controls?: Json | null
          competences?: string[] | null
          created_at?: string
          email: string
          id?: string
          nom: string
          note?: string | null
          role?: string
        }
        Update: {
          access_controls?: Json | null
          competences?: string[] | null
          created_at?: string
          email?: string
          id?: string
          nom?: string
          note?: string | null
          role?: string
        }
        Relationships: []
      }
      factures: {
        Row: {
          client_id: string | null
          client_nom: string
          created_at: string
          date_paiement: string | null
          echeance: string
          id: string
          lignes: Json | null
          montant: string
          numero: string
          pdf_url: string | null
          remise: number | null
          statut: string
          total_ht: number | null
          total_ttc: number | null
        }
        Insert: {
          client_id?: string | null
          client_nom: string
          created_at?: string
          date_paiement?: string | null
          echeance: string
          id?: string
          lignes?: Json | null
          montant: string
          numero: string
          pdf_url?: string | null
          remise?: number | null
          statut?: string
          total_ht?: number | null
          total_ttc?: number | null
        }
        Update: {
          client_id?: string | null
          client_nom?: string
          created_at?: string
          date_paiement?: string | null
          echeance?: string
          id?: string
          lignes?: Json | null
          montant?: string
          numero?: string
          pdf_url?: string | null
          remise?: number | null
          statut?: string
          total_ht?: number | null
          total_ttc?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "factures_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          adresse: string | null
          assigned_employee_ids: string[] | null
          checklist: Json | null
          client_id: string | null
          client_nom: string
          costs: Json | null
          created_at: string
          date: string
          description: string | null
          employe_id: string | null
          employe_nom: string
          heure_debut: string | null
          heure_fin: string | null
          id: string
          lieu: string | null
          linked_invoice_id: string | null
          linked_quote_id: string | null
          location_gps: Json | null
          notes: string | null
          notes_timeline: Json | null
          planning_event_id: string | null
          scheduled_end: string | null
          scheduled_start: string | null
          statut: string
          time_entries: Json | null
          titre: string
          type: string | null
          zone: string | null
        }
        Insert: {
          adresse?: string | null
          assigned_employee_ids?: string[] | null
          checklist?: Json | null
          client_id?: string | null
          client_nom: string
          costs?: Json | null
          created_at?: string
          date: string
          description?: string | null
          employe_id?: string | null
          employe_nom: string
          heure_debut?: string | null
          heure_fin?: string | null
          id?: string
          lieu?: string | null
          linked_invoice_id?: string | null
          linked_quote_id?: string | null
          location_gps?: Json | null
          notes?: string | null
          notes_timeline?: Json | null
          planning_event_id?: string | null
          scheduled_end?: string | null
          scheduled_start?: string | null
          statut?: string
          time_entries?: Json | null
          titre: string
          type?: string | null
          zone?: string | null
        }
        Update: {
          adresse?: string | null
          assigned_employee_ids?: string[] | null
          checklist?: Json | null
          client_id?: string | null
          client_nom?: string
          costs?: Json | null
          created_at?: string
          date?: string
          description?: string | null
          employe_id?: string | null
          employe_nom?: string
          heure_debut?: string | null
          heure_fin?: string | null
          id?: string
          lieu?: string | null
          linked_invoice_id?: string | null
          linked_quote_id?: string | null
          location_gps?: Json | null
          notes?: string | null
          notes_timeline?: Json | null
          planning_event_id?: string | null
          scheduled_end?: string | null
          scheduled_start?: string | null
          statut?: string
          time_entries?: Json | null
          titre?: string
          type?: string | null
          zone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jobs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_employe_id_fkey"
            columns: ["employe_id"]
            isOneToOne: false
            referencedRelation: "equipe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_planning_event_id_fkey"
            columns: ["planning_event_id"]
            isOneToOne: false
            referencedRelation: "planning_events"
            referencedColumns: ["id"]
          },
        ]
      }
      paiements: {
        Row: {
          created_at: string
          date_paiement: string
          facture_id: string | null
          facture_numero: string
          id: string
          methode: string
          montant: number
          notes: string | null
        }
        Insert: {
          created_at?: string
          date_paiement: string
          facture_id?: string | null
          facture_numero: string
          id?: string
          methode: string
          montant: number
          notes?: string | null
        }
        Update: {
          created_at?: string
          date_paiement?: string
          facture_id?: string | null
          facture_numero?: string
          id?: string
          methode?: string
          montant?: number
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "paiements_facture_id_fkey"
            columns: ["facture_id"]
            isOneToOne: false
            referencedRelation: "factures"
            referencedColumns: ["id"]
          },
        ]
      }
      planning_events: {
        Row: {
          created_at: string | null
          employee_ids: string[] | null
          end_at: string
          id: string
          job_id: string | null
          start_at: string
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          employee_ids?: string[] | null
          end_at: string
          id?: string
          job_id?: string | null
          start_at: string
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          employee_ids?: string[] | null
          end_at?: string
          id?: string
          job_id?: string | null
          start_at?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "planning_events_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      support_messages: {
        Row: {
          category: string | null
          created_at: string
          id: string
          is_from_support: boolean | null
          message: string
          user_name: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          is_from_support?: boolean | null
          message: string
          user_name: string
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          is_from_support?: boolean | null
          message?: string
          user_name?: string
        }
        Relationships: []
      }
      timesheets: {
        Row: {
          created_at: string
          debut: string
          employe_id: string | null
          employe_nom: string
          fin: string
          id: string
          job_id: string | null
          job_titre: string
          total: string
        }
        Insert: {
          created_at?: string
          debut: string
          employe_id?: string | null
          employe_nom: string
          fin: string
          id?: string
          job_id?: string | null
          job_titre: string
          total: string
        }
        Update: {
          created_at?: string
          debut?: string
          employe_id?: string | null
          employe_nom?: string
          fin?: string
          id?: string
          job_id?: string | null
          job_titre?: string
          total?: string
        }
        Relationships: [
          {
            foreignKeyName: "timesheets_employe_id_fkey"
            columns: ["employe_id"]
            isOneToOne: false
            referencedRelation: "equipe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timesheets_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
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
