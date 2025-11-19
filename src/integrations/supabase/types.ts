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
      agenda_events: {
        Row: {
          attendees: string[] | null
          company_id: string | null
          created_at: string
          description: string | null
          end_at: string
          id: string
          location: string | null
          start_at: string
          status: string
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          attendees?: string[] | null
          company_id?: string | null
          created_at?: string
          description?: string | null
          end_at: string
          id?: string
          location?: string | null
          start_at: string
          status?: string
          title: string
          type?: string
          updated_at?: string
        }
        Update: {
          attendees?: string[] | null
          company_id?: string | null
          created_at?: string
          description?: string | null
          end_at?: string
          id?: string
          location?: string | null
          start_at?: string
          status?: string
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agenda_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      attachments: {
        Row: {
          company_id: string | null
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
          company_id?: string | null
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
          company_id?: string | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          filename?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attachments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      client_addresses: {
        Row: {
          city: string | null
          client_id: string
          company_id: string | null
          country: string | null
          created_at: string | null
          id: string
          is_primary: boolean | null
          label: string
          notes: string | null
          street: string | null
          zipcode: string | null
        }
        Insert: {
          city?: string | null
          client_id: string
          company_id?: string | null
          country?: string | null
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          label: string
          notes?: string | null
          street?: string | null
          zipcode?: string | null
        }
        Update: {
          city?: string | null
          client_id?: string
          company_id?: string | null
          country?: string | null
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          label?: string
          notes?: string | null
          street?: string | null
          zipcode?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_addresses_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_addresses_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      client_contracts: {
        Row: {
          client_id: string
          company_id: string | null
          file_name: string
          file_url: string
          id: string
          notes: string | null
          uploaded_at: string | null
          uploaded_by: string | null
        }
        Insert: {
          client_id: string
          company_id?: string | null
          file_name: string
          file_url: string
          id?: string
          notes?: string | null
          uploaded_at?: string | null
          uploaded_by?: string | null
        }
        Update: {
          client_id?: string
          company_id?: string | null
          file_name?: string
          file_url?: string
          id?: string
          notes?: string | null
          uploaded_at?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_contracts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_contracts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_contracts_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "employee_performance_v"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "client_contracts_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "equipe"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          adresse: string | null
          company_id: string | null
          created_at: string
          custom_fields: Json | null
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
          company_id?: string | null
          created_at?: string
          custom_fields?: Json | null
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
          company_id?: string | null
          created_at?: string
          custom_fields?: Json | null
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
        Relationships: [
          {
            foreignKeyName: "clients_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          country: string | null
          created_at: string
          currency: string | null
          id: string
          name: string
          owner_user_id: string | null
          settings: Json | null
        }
        Insert: {
          country?: string | null
          created_at?: string
          currency?: string | null
          id?: string
          name: string
          owner_user_id?: string | null
          settings?: Json | null
        }
        Update: {
          country?: string | null
          created_at?: string
          currency?: string | null
          id?: string
          name?: string
          owner_user_id?: string | null
          settings?: Json | null
        }
        Relationships: []
      }
      company_settings: {
        Row: {
          address: string | null
          city: string | null
          company_id: string | null
          company_name: string
          country: string | null
          created_at: string
          discount_conditions: string | null
          email: string | null
          id: string
          late_payment_penalty: string | null
          legal_mentions: string | null
          logo_url: string | null
          payment_conditions: string | null
          phone: string | null
          postal_code: string | null
          siren: string | null
          siret: string | null
          tva_intracom: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          company_id?: string | null
          company_name: string
          country?: string | null
          created_at?: string
          discount_conditions?: string | null
          email?: string | null
          id?: string
          late_payment_penalty?: string | null
          legal_mentions?: string | null
          logo_url?: string | null
          payment_conditions?: string | null
          phone?: string | null
          postal_code?: string | null
          siren?: string | null
          siret?: string | null
          tva_intracom?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          company_id?: string | null
          company_name?: string
          country?: string | null
          created_at?: string
          discount_conditions?: string | null
          email?: string | null
          id?: string
          late_payment_penalty?: string | null
          legal_mentions?: string | null
          logo_url?: string | null
          payment_conditions?: string | null
          phone?: string | null
          postal_code?: string | null
          siren?: string | null
          siret?: string | null
          tva_intracom?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          billing_frequency: string | null
          client_id: string | null
          company_id: string | null
          contract_number: string
          created_at: string | null
          description: string | null
          end_date: string | null
          id: string
          notes: string | null
          start_date: string | null
          status: string
          title: string
          updated_at: string | null
          value_ht: number | null
          value_ttc: number | null
        }
        Insert: {
          billing_frequency?: string | null
          client_id?: string | null
          company_id?: string | null
          contract_number: string
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          notes?: string | null
          start_date?: string | null
          status?: string
          title: string
          updated_at?: string | null
          value_ht?: number | null
          value_ttc?: number | null
        }
        Update: {
          billing_frequency?: string | null
          client_id?: string | null
          company_id?: string | null
          contract_number?: string
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          notes?: string | null
          start_date?: string | null
          status?: string
          title?: string
          updated_at?: string | null
          value_ht?: number | null
          value_ttc?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "contracts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      dashboard_prefs: {
        Row: {
          alerts_enabled: Json
          company_id: string | null
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          alerts_enabled?: Json
          company_id?: string | null
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          alerts_enabled?: Json
          company_id?: string | null
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dashboard_prefs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      devices_push_tokens: {
        Row: {
          company_id: string | null
          created_at: string
          employee_id: string
          id: string
          platform: string
          token: string
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          employee_id: string
          id?: string
          platform: string
          token: string
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          employee_id?: string
          id?: string
          platform?: string
          token?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "devices_push_tokens_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "devices_push_tokens_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_performance_v"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "devices_push_tokens_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "equipe"
            referencedColumns: ["id"]
          },
        ]
      }
      devis: {
        Row: {
          accepted_at: string | null
          acompte: number | null
          approved_at: string | null
          approved_by: string | null
          assignee_id: string | null
          auto_create_job_on_accept: boolean | null
          billing_address: Json | null
          client_id: string | null
          client_nom: string
          company_id: string | null
          conditions: string | null
          contact_email: string | null
          contact_phone: string | null
          converted_to_invoice_id: string | null
          converted_to_job_id: string | null
          created_at: string
          currency: string | null
          custom_fields: Json | null
          date_envoi: string | null
          declined_at: string | null
          discount_global: number | null
          discount_type: string | null
          expires_at: string | null
          expiry_date: string | null
          id: string
          issued_at: string | null
          lignes: Json | null
          message_client: string | null
          montant: string
          notes_internes: string | null
          numero: string
          packages: Json | null
          pdf_signed_url: string | null
          pdf_url: string | null
          planned_date: string | null
          planned_duration_minutes: number | null
          planned_end_time: string | null
          planned_start_time: string | null
          property_address: string | null
          quote_valid_days: number | null
          remise: number | null
          salesperson: string | null
          sent_at: string | null
          shipping_address: Json | null
          signature_date: string | null
          signature_image: string | null
          site_address: string | null
          statut: string
          template_id: string | null
          title: string | null
          token: string | null
          total_ht: number | null
          total_ttc: number | null
          vendeur: string | null
        }
        Insert: {
          accepted_at?: string | null
          acompte?: number | null
          approved_at?: string | null
          approved_by?: string | null
          assignee_id?: string | null
          auto_create_job_on_accept?: boolean | null
          billing_address?: Json | null
          client_id?: string | null
          client_nom: string
          company_id?: string | null
          conditions?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          converted_to_invoice_id?: string | null
          converted_to_job_id?: string | null
          created_at?: string
          currency?: string | null
          custom_fields?: Json | null
          date_envoi?: string | null
          declined_at?: string | null
          discount_global?: number | null
          discount_type?: string | null
          expires_at?: string | null
          expiry_date?: string | null
          id?: string
          issued_at?: string | null
          lignes?: Json | null
          message_client?: string | null
          montant: string
          notes_internes?: string | null
          numero: string
          packages?: Json | null
          pdf_signed_url?: string | null
          pdf_url?: string | null
          planned_date?: string | null
          planned_duration_minutes?: number | null
          planned_end_time?: string | null
          planned_start_time?: string | null
          property_address?: string | null
          quote_valid_days?: number | null
          remise?: number | null
          salesperson?: string | null
          sent_at?: string | null
          shipping_address?: Json | null
          signature_date?: string | null
          signature_image?: string | null
          site_address?: string | null
          statut?: string
          template_id?: string | null
          title?: string | null
          token?: string | null
          total_ht?: number | null
          total_ttc?: number | null
          vendeur?: string | null
        }
        Update: {
          accepted_at?: string | null
          acompte?: number | null
          approved_at?: string | null
          approved_by?: string | null
          assignee_id?: string | null
          auto_create_job_on_accept?: boolean | null
          billing_address?: Json | null
          client_id?: string | null
          client_nom?: string
          company_id?: string | null
          conditions?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          converted_to_invoice_id?: string | null
          converted_to_job_id?: string | null
          created_at?: string
          currency?: string | null
          custom_fields?: Json | null
          date_envoi?: string | null
          declined_at?: string | null
          discount_global?: number | null
          discount_type?: string | null
          expires_at?: string | null
          expiry_date?: string | null
          id?: string
          issued_at?: string | null
          lignes?: Json | null
          message_client?: string | null
          montant?: string
          notes_internes?: string | null
          numero?: string
          packages?: Json | null
          pdf_signed_url?: string | null
          pdf_url?: string | null
          planned_date?: string | null
          planned_duration_minutes?: number | null
          planned_end_time?: string | null
          planned_start_time?: string | null
          property_address?: string | null
          quote_valid_days?: number | null
          remise?: number | null
          salesperson?: string | null
          sent_at?: string | null
          shipping_address?: Json | null
          signature_date?: string | null
          signature_image?: string | null
          site_address?: string | null
          statut?: string
          template_id?: string | null
          title?: string | null
          token?: string | null
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
          {
            foreignKeyName: "devis_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "devis_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "doc_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      doc_templates: {
        Row: {
          company_id: string | null
          content_html: string
          created_at: string | null
          css: string | null
          email_body: string | null
          email_subject: string | null
          font_family: string | null
          footer_html: string | null
          header_html: string | null
          header_logo: string | null
          id: string
          is_default: boolean | null
          locale: string | null
          logo_position: string | null
          logo_size: string | null
          main_color: string | null
          margin_bottom: number | null
          margin_left: number | null
          margin_right: number | null
          margin_top: number | null
          name: string
          paper_format: string | null
          paper_orientation: string | null
          show_discounts: boolean | null
          show_remaining_balance: boolean | null
          show_vat: boolean | null
          signature_enabled: boolean | null
          theme: string | null
          type: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          company_id?: string | null
          content_html: string
          created_at?: string | null
          css?: string | null
          email_body?: string | null
          email_subject?: string | null
          font_family?: string | null
          footer_html?: string | null
          header_html?: string | null
          header_logo?: string | null
          id?: string
          is_default?: boolean | null
          locale?: string | null
          logo_position?: string | null
          logo_size?: string | null
          main_color?: string | null
          margin_bottom?: number | null
          margin_left?: number | null
          margin_right?: number | null
          margin_top?: number | null
          name: string
          paper_format?: string | null
          paper_orientation?: string | null
          show_discounts?: boolean | null
          show_remaining_balance?: boolean | null
          show_vat?: boolean | null
          signature_enabled?: boolean | null
          theme?: string | null
          type: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          company_id?: string | null
          content_html?: string
          created_at?: string | null
          css?: string | null
          email_body?: string | null
          email_subject?: string | null
          font_family?: string | null
          footer_html?: string | null
          header_html?: string | null
          header_logo?: string | null
          id?: string
          is_default?: boolean | null
          locale?: string | null
          logo_position?: string | null
          logo_size?: string | null
          main_color?: string | null
          margin_bottom?: number | null
          margin_left?: number | null
          margin_right?: number | null
          margin_top?: number | null
          name?: string
          paper_format?: string | null
          paper_orientation?: string | null
          show_discounts?: boolean | null
          show_remaining_balance?: boolean | null
          show_vat?: boolean | null
          signature_enabled?: boolean | null
          theme?: string | null
          type?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "doc_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      document_numbering: {
        Row: {
          company_id: string | null
          created_at: string
          id: string
          next_number: number
          pattern: string
          prefix: string
          reset_each_year: boolean
          type: string
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          id?: string
          next_number?: number
          pattern?: string
          prefix?: string
          reset_each_year?: boolean
          type: string
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          id?: string
          next_number?: number
          pattern?: string
          prefix?: string
          reset_each_year?: boolean
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_numbering_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      equipe: {
        Row: {
          access_controls: Json | null
          app_access_status: string | null
          company_id: string | null
          competences: string[] | null
          created_at: string
          email: string
          hourly_rate: number | null
          id: string
          is_manager: boolean | null
          lang: string | null
          nom: string
          note: string | null
          phone: string | null
          role: string
          status: string | null
          user_id: string | null
        }
        Insert: {
          access_controls?: Json | null
          app_access_status?: string | null
          company_id?: string | null
          competences?: string[] | null
          created_at?: string
          email: string
          hourly_rate?: number | null
          id?: string
          is_manager?: boolean | null
          lang?: string | null
          nom: string
          note?: string | null
          phone?: string | null
          role?: string
          status?: string | null
          user_id?: string | null
        }
        Update: {
          access_controls?: Json | null
          app_access_status?: string | null
          company_id?: string | null
          competences?: string[] | null
          created_at?: string
          email?: string
          hourly_rate?: number | null
          id?: string
          is_manager?: boolean | null
          lang?: string | null
          nom?: string
          note?: string | null
          phone?: string | null
          role?: string
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "equipe_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      event_assignees: {
        Row: {
          company_id: string | null
          created_at: string | null
          employee_id: string
          event_id: string
          id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          employee_id: string
          event_id: string
          id?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          employee_id?: string
          event_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_assignees_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_assignees_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_performance_v"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "event_assignees_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "equipe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_assignees_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "agenda_events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_clients: {
        Row: {
          client_id: string | null
          company_id: string | null
          created_at: string | null
          event_id: string
          external_client_email: string | null
          external_client_name: string | null
          external_client_phone: string | null
          id: string
        }
        Insert: {
          client_id?: string | null
          company_id?: string | null
          created_at?: string | null
          event_id: string
          external_client_email?: string | null
          external_client_name?: string | null
          external_client_phone?: string | null
          id?: string
        }
        Update: {
          client_id?: string | null
          company_id?: string | null
          created_at?: string | null
          event_id?: string
          external_client_email?: string | null
          external_client_name?: string | null
          external_client_phone?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_clients_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_clients_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_clients_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "agenda_events"
            referencedColumns: ["id"]
          },
        ]
      }
      factures: {
        Row: {
          billing_address: Json | null
          client_id: string | null
          client_nom: string
          company_id: string | null
          converted_from_quote_id: string | null
          created_at: string
          currency: string | null
          date_paiement: string | null
          deposit_percent: number | null
          due_date: string | null
          echeance: string
          facturx_profile: string | null
          facturx_xml_url: string | null
          id: string
          intervention_id: string | null
          invoice_type: string | null
          issue_date: string | null
          lignes: Json | null
          montant: string
          notes_legal: string | null
          numero: string
          paid_at: string | null
          payment_terms: string | null
          pdf_url: string | null
          remise: number | null
          sent_at: string | null
          shipping_address: Json | null
          source_quote_id: string | null
          statut: string
          template_id: string | null
          total_ht: number | null
          total_ttc: number | null
          tva_breakdown: Json | null
        }
        Insert: {
          billing_address?: Json | null
          client_id?: string | null
          client_nom: string
          company_id?: string | null
          converted_from_quote_id?: string | null
          created_at?: string
          currency?: string | null
          date_paiement?: string | null
          deposit_percent?: number | null
          due_date?: string | null
          echeance: string
          facturx_profile?: string | null
          facturx_xml_url?: string | null
          id?: string
          intervention_id?: string | null
          invoice_type?: string | null
          issue_date?: string | null
          lignes?: Json | null
          montant: string
          notes_legal?: string | null
          numero: string
          paid_at?: string | null
          payment_terms?: string | null
          pdf_url?: string | null
          remise?: number | null
          sent_at?: string | null
          shipping_address?: Json | null
          source_quote_id?: string | null
          statut?: string
          template_id?: string | null
          total_ht?: number | null
          total_ttc?: number | null
          tva_breakdown?: Json | null
        }
        Update: {
          billing_address?: Json | null
          client_id?: string | null
          client_nom?: string
          company_id?: string | null
          converted_from_quote_id?: string | null
          created_at?: string
          currency?: string | null
          date_paiement?: string | null
          deposit_percent?: number | null
          due_date?: string | null
          echeance?: string
          facturx_profile?: string | null
          facturx_xml_url?: string | null
          id?: string
          intervention_id?: string | null
          invoice_type?: string | null
          issue_date?: string | null
          lignes?: Json | null
          montant?: string
          notes_legal?: string | null
          numero?: string
          paid_at?: string | null
          payment_terms?: string | null
          pdf_url?: string | null
          remise?: number | null
          sent_at?: string | null
          shipping_address?: Json | null
          source_quote_id?: string | null
          statut?: string
          template_id?: string | null
          total_ht?: number | null
          total_ttc?: number | null
          tva_breakdown?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "factures_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "factures_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "factures_converted_from_quote_id_fkey"
            columns: ["converted_from_quote_id"]
            isOneToOne: false
            referencedRelation: "devis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "factures_intervention_id_fkey"
            columns: ["intervention_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "factures_intervention_id_fkey"
            columns: ["intervention_id"]
            isOneToOne: false
            referencedRelation: "v_employee_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "factures_source_quote_id_fkey"
            columns: ["source_quote_id"]
            isOneToOne: false
            referencedRelation: "devis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "factures_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "doc_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      intervention_assignments: {
        Row: {
          company_id: string | null
          created_at: string | null
          employee_id: string
          id: string
          intervention_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          employee_id: string
          id?: string
          intervention_id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          employee_id?: string
          id?: string
          intervention_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "intervention_assignments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intervention_assignments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_performance_v"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "intervention_assignments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "equipe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intervention_assignments_intervention_id_fkey"
            columns: ["intervention_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intervention_assignments_intervention_id_fkey"
            columns: ["intervention_id"]
            isOneToOne: false
            referencedRelation: "v_employee_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      intervention_consumables: {
        Row: {
          company_id: string | null
          created_at: string | null
          id: string
          intervention_id: string
          inventory_item_id: string | null
          location: string | null
          product_name: string
          product_ref: string | null
          quantity: number
          serial_number: string | null
          tax_rate: number | null
          total_ht: number | null
          total_ttc: number | null
          unit: string | null
          unit_price_ht: number | null
          updated_at: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          intervention_id: string
          inventory_item_id?: string | null
          location?: string | null
          product_name: string
          product_ref?: string | null
          quantity?: number
          serial_number?: string | null
          tax_rate?: number | null
          total_ht?: number | null
          total_ttc?: number | null
          unit?: string | null
          unit_price_ht?: number | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          intervention_id?: string
          inventory_item_id?: string | null
          location?: string | null
          product_name?: string
          product_ref?: string | null
          quantity?: number
          serial_number?: string | null
          tax_rate?: number | null
          total_ht?: number | null
          total_ttc?: number | null
          unit?: string | null
          unit_price_ht?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "intervention_consumables_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intervention_consumables_intervention_id_fkey"
            columns: ["intervention_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intervention_consumables_intervention_id_fkey"
            columns: ["intervention_id"]
            isOneToOne: false
            referencedRelation: "v_employee_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intervention_consumables_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      intervention_feedback: {
        Row: {
          comment: string | null
          company_id: string | null
          created_at: string
          id: string
          intervention_id: string
          rating: number | null
          signer_name: string | null
          submitted_at: string | null
        }
        Insert: {
          comment?: string | null
          company_id?: string | null
          created_at?: string
          id?: string
          intervention_id: string
          rating?: number | null
          signer_name?: string | null
          submitted_at?: string | null
        }
        Update: {
          comment?: string | null
          company_id?: string | null
          created_at?: string
          id?: string
          intervention_id?: string
          rating?: number | null
          signer_name?: string | null
          submitted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "intervention_feedback_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intervention_feedback_intervention_id_fkey"
            columns: ["intervention_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intervention_feedback_intervention_id_fkey"
            columns: ["intervention_id"]
            isOneToOne: false
            referencedRelation: "v_employee_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      intervention_files: {
        Row: {
          category: string | null
          company_id: string | null
          created_at: string | null
          employee_id: string | null
          file_name: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          intervention_id: string
          metadata: Json | null
          photo_type: string | null
        }
        Insert: {
          category?: string | null
          company_id?: string | null
          created_at?: string | null
          employee_id?: string | null
          file_name: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          intervention_id: string
          metadata?: Json | null
          photo_type?: string | null
        }
        Update: {
          category?: string | null
          company_id?: string | null
          created_at?: string | null
          employee_id?: string | null
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          intervention_id?: string
          metadata?: Json | null
          photo_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "intervention_files_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intervention_files_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_performance_v"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "intervention_files_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "equipe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intervention_files_intervention_id_fkey"
            columns: ["intervention_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intervention_files_intervention_id_fkey"
            columns: ["intervention_id"]
            isOneToOne: false
            referencedRelation: "v_employee_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      intervention_logs: {
        Row: {
          action: string
          company_id: string | null
          created_at: string
          details: string | null
          id: string
          intervention_id: string
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          action: string
          company_id?: string | null
          created_at?: string
          details?: string | null
          id?: string
          intervention_id: string
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          action?: string
          company_id?: string | null
          created_at?: string
          details?: string | null
          id?: string
          intervention_id?: string
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "intervention_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intervention_logs_intervention_id_fkey"
            columns: ["intervention_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intervention_logs_intervention_id_fkey"
            columns: ["intervention_id"]
            isOneToOne: false
            referencedRelation: "v_employee_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      intervention_services: {
        Row: {
          assigned_to: string | null
          company_id: string | null
          created_at: string | null
          description: string
          id: string
          intervention_id: string
          is_billable: boolean | null
          quantity: number
          service_item_id: string | null
          tax_rate: number | null
          total_ht: number | null
          total_ttc: number | null
          unit: string | null
          unit_price_ht: number | null
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          company_id?: string | null
          created_at?: string | null
          description: string
          id?: string
          intervention_id: string
          is_billable?: boolean | null
          quantity?: number
          service_item_id?: string | null
          tax_rate?: number | null
          total_ht?: number | null
          total_ttc?: number | null
          unit?: string | null
          unit_price_ht?: number | null
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          company_id?: string | null
          created_at?: string | null
          description?: string
          id?: string
          intervention_id?: string
          is_billable?: boolean | null
          quantity?: number
          service_item_id?: string | null
          tax_rate?: number | null
          total_ht?: number | null
          total_ttc?: number | null
          unit?: string | null
          unit_price_ht?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "intervention_services_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "employee_performance_v"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "intervention_services_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "equipe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intervention_services_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intervention_services_intervention_id_fkey"
            columns: ["intervention_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intervention_services_intervention_id_fkey"
            columns: ["intervention_id"]
            isOneToOne: false
            referencedRelation: "v_employee_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intervention_services_service_item_id_fkey"
            columns: ["service_item_id"]
            isOneToOne: false
            referencedRelation: "service_items"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          category: string | null
          company_id: string | null
          created_at: string
          files: Json | null
          id: string
          location: string | null
          low_stock_threshold: number | null
          min_qty_alert: number | null
          name: string
          notes: string | null
          qty_on_hand: number
          qty_reserved: number
          sku: string | null
          supplier: string | null
          supplier_name: string | null
          tva_rate: number | null
          type: string
          unit_cost_ht: number | null
          unit_price_ht: number | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          company_id?: string | null
          created_at?: string
          files?: Json | null
          id?: string
          location?: string | null
          low_stock_threshold?: number | null
          min_qty_alert?: number | null
          name: string
          notes?: string | null
          qty_on_hand?: number
          qty_reserved?: number
          sku?: string | null
          supplier?: string | null
          supplier_name?: string | null
          tva_rate?: number | null
          type: string
          unit_cost_ht?: number | null
          unit_price_ht?: number | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          company_id?: string | null
          created_at?: string
          files?: Json | null
          id?: string
          location?: string | null
          low_stock_threshold?: number | null
          min_qty_alert?: number | null
          name?: string
          notes?: string | null
          qty_on_hand?: number
          qty_reserved?: number
          sku?: string | null
          supplier?: string | null
          supplier_name?: string | null
          tva_rate?: number | null
          type?: string
          unit_cost_ht?: number | null
          unit_price_ht?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_movements: {
        Row: {
          company_id: string | null
          created_at: string
          created_by: string | null
          date: string
          effective_at: string | null
          id: string
          item_id: string | null
          note: string | null
          qty: number
          ref_id: string | null
          ref_number: string | null
          scheduled_at: string | null
          source: string
          status: string
          type: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          date?: string
          effective_at?: string | null
          id?: string
          item_id?: string | null
          note?: string | null
          qty: number
          ref_id?: string | null
          ref_number?: string | null
          scheduled_at?: string | null
          source: string
          status?: string
          type: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          date?: string
          effective_at?: string | null
          id?: string
          item_id?: string | null
          note?: string | null
          qty?: number
          ref_id?: string | null
          ref_number?: string | null
          scheduled_at?: string | null
          source?: string
          status?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employee_performance_v"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "inventory_movements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "equipe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_reservations: {
        Row: {
          company_id: string | null
          consumed_at: string | null
          created_at: string | null
          id: string
          inventory_item_id: string | null
          invoice_id: string | null
          job_id: string | null
          qty_consumed: number | null
          qty_reserved: number
          quote_id: string | null
          reserved_at: string | null
          status: string | null
        }
        Insert: {
          company_id?: string | null
          consumed_at?: string | null
          created_at?: string | null
          id?: string
          inventory_item_id?: string | null
          invoice_id?: string | null
          job_id?: string | null
          qty_consumed?: number | null
          qty_reserved?: number
          quote_id?: string | null
          reserved_at?: string | null
          status?: string | null
        }
        Update: {
          company_id?: string | null
          consumed_at?: string | null
          created_at?: string | null
          id?: string
          inventory_item_id?: string | null
          invoice_id?: string | null
          job_id?: string | null
          qty_consumed?: number | null
          qty_reserved?: number
          quote_id?: string | null
          reserved_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_reservations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_reservations_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_reservations_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "factures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_reservations_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_reservations_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "v_employee_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_reservations_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "devis"
            referencedColumns: ["id"]
          },
        ]
      }
      job_signatures: {
        Row: {
          company_id: string | null
          created_at: string
          employee_id: string
          id: string
          image_url: string
          job_id: string
          signed_at: string
          signer_email: string | null
          signer_name: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          employee_id: string
          id?: string
          image_url: string
          job_id: string
          signed_at?: string
          signer_email?: string | null
          signer_name: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          employee_id?: string
          id?: string
          image_url?: string
          job_id?: string
          signed_at?: string
          signer_email?: string | null
          signer_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_signatures_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_signatures_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_performance_v"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "job_signatures_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "equipe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_signatures_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_signatures_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "v_employee_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          adresse: string | null
          assigned_employee_ids: string[] | null
          billing_status: string | null
          checklist: Json | null
          client_id: string | null
          client_nom: string
          client_notes: string | null
          company_id: string | null
          contract_id: string | null
          converted_from_quote_id: string | null
          costs: Json | null
          created_at: string
          date: string
          description: string | null
          duration_actual: number | null
          duration_estimated: number | null
          employe_id: string | null
          employe_nom: string
          heure_debut: string | null
          heure_fin: string | null
          id: string
          internal_notes: string | null
          intervention_number: string | null
          invoice_id: string | null
          lieu: string | null
          linked_invoice_id: string | null
          linked_quote_id: string | null
          location_gps: Json | null
          notes: string | null
          notes_timeline: Json | null
          planning_event_id: string | null
          priority: string | null
          quote_id: string | null
          scheduled_at: string | null
          scheduled_end: string | null
          scheduled_start: string | null
          signature_date: string | null
          signature_image: string | null
          signature_name: string | null
          signature_signer: string | null
          signature_url: string | null
          signed_at: string | null
          statut: string
          time_entries: Json | null
          titre: string
          type: string | null
          zone: string | null
        }
        Insert: {
          adresse?: string | null
          assigned_employee_ids?: string[] | null
          billing_status?: string | null
          checklist?: Json | null
          client_id?: string | null
          client_nom: string
          client_notes?: string | null
          company_id?: string | null
          contract_id?: string | null
          converted_from_quote_id?: string | null
          costs?: Json | null
          created_at?: string
          date: string
          description?: string | null
          duration_actual?: number | null
          duration_estimated?: number | null
          employe_id?: string | null
          employe_nom: string
          heure_debut?: string | null
          heure_fin?: string | null
          id?: string
          internal_notes?: string | null
          intervention_number?: string | null
          invoice_id?: string | null
          lieu?: string | null
          linked_invoice_id?: string | null
          linked_quote_id?: string | null
          location_gps?: Json | null
          notes?: string | null
          notes_timeline?: Json | null
          planning_event_id?: string | null
          priority?: string | null
          quote_id?: string | null
          scheduled_at?: string | null
          scheduled_end?: string | null
          scheduled_start?: string | null
          signature_date?: string | null
          signature_image?: string | null
          signature_name?: string | null
          signature_signer?: string | null
          signature_url?: string | null
          signed_at?: string | null
          statut?: string
          time_entries?: Json | null
          titre: string
          type?: string | null
          zone?: string | null
        }
        Update: {
          adresse?: string | null
          assigned_employee_ids?: string[] | null
          billing_status?: string | null
          checklist?: Json | null
          client_id?: string | null
          client_nom?: string
          client_notes?: string | null
          company_id?: string | null
          contract_id?: string | null
          converted_from_quote_id?: string | null
          costs?: Json | null
          created_at?: string
          date?: string
          description?: string | null
          duration_actual?: number | null
          duration_estimated?: number | null
          employe_id?: string | null
          employe_nom?: string
          heure_debut?: string | null
          heure_fin?: string | null
          id?: string
          internal_notes?: string | null
          intervention_number?: string | null
          invoice_id?: string | null
          lieu?: string | null
          linked_invoice_id?: string | null
          linked_quote_id?: string | null
          location_gps?: Json | null
          notes?: string | null
          notes_timeline?: Json | null
          planning_event_id?: string | null
          priority?: string | null
          quote_id?: string | null
          scheduled_at?: string | null
          scheduled_end?: string | null
          scheduled_start?: string | null
          signature_date?: string | null
          signature_image?: string | null
          signature_name?: string | null
          signature_signer?: string | null
          signature_url?: string | null
          signed_at?: string | null
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
            foreignKeyName: "jobs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_converted_from_quote_id_fkey"
            columns: ["converted_from_quote_id"]
            isOneToOne: false
            referencedRelation: "devis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_employe_id_fkey"
            columns: ["employe_id"]
            isOneToOne: false
            referencedRelation: "employee_performance_v"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "jobs_employe_id_fkey"
            columns: ["employe_id"]
            isOneToOne: false
            referencedRelation: "equipe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "factures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_planning_event_id_fkey"
            columns: ["planning_event_id"]
            isOneToOne: false
            referencedRelation: "planning_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "devis"
            referencedColumns: ["id"]
          },
        ]
      }
      material_reservations: {
        Row: {
          company_id: string
          created_at: string
          id: string
          job_id: string | null
          material_id: string
          qty_reserved: number
          quote_id: string | null
          scheduled_end: string
          scheduled_start: string
          status: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          job_id?: string | null
          material_id: string
          qty_reserved?: number
          quote_id?: string | null
          scheduled_end: string
          scheduled_start: string
          status?: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          job_id?: string | null
          material_id?: string
          qty_reserved?: number
          quote_id?: string | null
          scheduled_end?: string
          scheduled_start?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "material_reservations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_reservations_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_reservations_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "v_employee_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_reservations_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_reservations_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "devis"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          actor_id: string | null
          company_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          kind: string | null
          level: string | null
          link: string | null
          message: string | null
          payload: Json | null
          read: boolean | null
          read_at: string | null
          recipient_role: string | null
          recipient_user_id: string | null
          title: string
          type: string | null
        }
        Insert: {
          actor_id?: string | null
          company_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          kind?: string | null
          level?: string | null
          link?: string | null
          message?: string | null
          payload?: Json | null
          read?: boolean | null
          read_at?: string | null
          recipient_role?: string | null
          recipient_user_id?: string | null
          title: string
          type?: string | null
        }
        Update: {
          actor_id?: string | null
          company_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          kind?: string | null
          level?: string | null
          link?: string | null
          message?: string | null
          payload?: Json | null
          read?: boolean | null
          read_at?: string | null
          recipient_role?: string | null
          recipient_user_id?: string | null
          title?: string
          type?: string | null
        }
        Relationships: []
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
          {
            foreignKeyName: "planning_events_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "v_employee_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          first_name: string | null
          id: string
          last_name: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      purchase_orders: {
        Row: {
          company_id: string
          created_at: string
          expected_date: string | null
          files: Json | null
          id: string
          items: Json | null
          kind: string
          note: string | null
          number: string
          received_date: string | null
          status: string
          supplier: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          expected_date?: string | null
          files?: Json | null
          id?: string
          items?: Json | null
          kind: string
          note?: string | null
          number: string
          received_date?: string | null
          status?: string
          supplier?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          expected_date?: string | null
          files?: Json | null
          id?: string
          items?: Json | null
          kind?: string
          note?: string | null
          number?: string
          received_date?: string | null
          status?: string
          supplier?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_events: {
        Row: {
          event_type: string
          id: string
          ip_address: string | null
          metadata: Json | null
          occurred_at: string
          quote_id: string
          user_agent: string | null
        }
        Insert: {
          event_type: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          occurred_at?: string
          quote_id: string
          user_agent?: string | null
        }
        Update: {
          event_type?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          occurred_at?: string
          quote_id?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quote_events_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "devis"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_signatures: {
        Row: {
          accepted_terms: boolean
          id: string
          ip_address: string | null
          pdf_hash: string
          quote_id: string
          signature_image_url: string
          signed_at: string
          signer_email: string | null
          signer_name: string
          user_agent: string | null
        }
        Insert: {
          accepted_terms?: boolean
          id?: string
          ip_address?: string | null
          pdf_hash: string
          quote_id: string
          signature_image_url: string
          signed_at?: string
          signer_email?: string | null
          signer_name: string
          user_agent?: string | null
        }
        Update: {
          accepted_terms?: boolean
          id?: string
          ip_address?: string | null
          pdf_hash?: string
          quote_id?: string
          signature_image_url?: string
          signed_at?: string
          signer_email?: string | null
          signer_name?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quote_signatures_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "devis"
            referencedColumns: ["id"]
          },
        ]
      }
      service_items: {
        Row: {
          category: string | null
          company_id: string | null
          created_at: string | null
          default_price_ht: number | null
          default_tva_rate: number | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          unit: string | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          company_id?: string | null
          created_at?: string | null
          default_price_ht?: number | null
          default_tva_rate?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          unit?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          company_id?: string | null
          created_at?: string | null
          default_price_ht?: number | null
          default_tva_rate?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          unit?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      support_events: {
        Row: {
          created_at: string
          employee_id: string
          event_type: string
          id: string
          metadata: Json | null
        }
        Insert: {
          created_at?: string
          employee_id: string
          event_type: string
          id?: string
          metadata?: Json | null
        }
        Update: {
          created_at?: string
          employee_id?: string
          event_type?: string
          id?: string
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "support_events_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_performance_v"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "support_events_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "equipe"
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
      support_tickets: {
        Row: {
          created_at: string
          description: string
          employee_id: string
          id: string
          status: string
          subject: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          employee_id: string
          id?: string
          status?: string
          subject: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          employee_id?: string
          id?: string
          status?: string
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_performance_v"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "support_tickets_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "equipe"
            referencedColumns: ["id"]
          },
        ]
      }
      taxes: {
        Row: {
          company_id: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          is_default: boolean
          name: string
          rate: number
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          name: string
          rate: number
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          name?: string
          rate?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "taxes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      timesheet_breaks: {
        Row: {
          company_id: string | null
          created_at: string
          duration_minutes: number | null
          end_at: string | null
          id: string
          start_at: string
          timesheet_entry_id: string
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          duration_minutes?: number | null
          end_at?: string | null
          id?: string
          start_at: string
          timesheet_entry_id: string
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          duration_minutes?: number | null
          end_at?: string | null
          id?: string
          start_at?: string
          timesheet_entry_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "timesheet_breaks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timesheet_breaks_timesheet_entry_id_fkey"
            columns: ["timesheet_entry_id"]
            isOneToOne: false
            referencedRelation: "timesheets_entries"
            referencedColumns: ["id"]
          },
        ]
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
            referencedRelation: "employee_performance_v"
            referencedColumns: ["employee_id"]
          },
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
          {
            foreignKeyName: "timesheets_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "v_employee_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      timesheets_entries: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          billing_status: string | null
          break_min: number | null
          client_id: string | null
          company_id: string | null
          cost: number
          created_at: string
          date: string
          description: string | null
          employee_id: string
          end_at: string | null
          hourly_rate: number | null
          hours: number
          id: string
          invoice_id: string | null
          is_billable: boolean | null
          job_id: string | null
          note: string | null
          overtime_hours: number | null
          rejected_at: string | null
          rejected_by: string | null
          rejection_reason: string | null
          start_at: string | null
          status: Database["public"]["Enums"]["timesheet_status"]
          submitted_at: string | null
          timesheet_type: string | null
          travel_minutes: number | null
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          billing_status?: string | null
          break_min?: number | null
          client_id?: string | null
          company_id?: string | null
          cost?: number
          created_at?: string
          date: string
          description?: string | null
          employee_id: string
          end_at?: string | null
          hourly_rate?: number | null
          hours?: number
          id?: string
          invoice_id?: string | null
          is_billable?: boolean | null
          job_id?: string | null
          note?: string | null
          overtime_hours?: number | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          start_at?: string | null
          status?: Database["public"]["Enums"]["timesheet_status"]
          submitted_at?: string | null
          timesheet_type?: string | null
          travel_minutes?: number | null
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          billing_status?: string | null
          break_min?: number | null
          client_id?: string | null
          company_id?: string | null
          cost?: number
          created_at?: string
          date?: string
          description?: string | null
          employee_id?: string
          end_at?: string | null
          hourly_rate?: number | null
          hours?: number
          id?: string
          invoice_id?: string | null
          is_billable?: boolean | null
          job_id?: string | null
          note?: string | null
          overtime_hours?: number | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          start_at?: string | null
          status?: Database["public"]["Enums"]["timesheet_status"]
          submitted_at?: string | null
          timesheet_type?: string | null
          travel_minutes?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "timesheets_entries_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "employee_performance_v"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "timesheets_entries_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "equipe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timesheets_entries_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timesheets_entries_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timesheets_entries_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_performance_v"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "timesheets_entries_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "equipe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timesheets_entries_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "factures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timesheets_entries_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timesheets_entries_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "v_employee_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timesheets_entries_rejected_by_fkey"
            columns: ["rejected_by"]
            isOneToOne: false
            referencedRelation: "employee_performance_v"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "timesheets_entries_rejected_by_fkey"
            columns: ["rejected_by"]
            isOneToOne: false
            referencedRelation: "equipe"
            referencedColumns: ["id"]
          },
        ]
      }
      timesheets_events: {
        Row: {
          at: string
          created_at: string
          duration_minutes: number | null
          employee_id: string | null
          id: string
          job_id: string | null
          meta: Json | null
          type: string
        }
        Insert: {
          at?: string
          created_at?: string
          duration_minutes?: number | null
          employee_id?: string | null
          id?: string
          job_id?: string | null
          meta?: Json | null
          type: string
        }
        Update: {
          at?: string
          created_at?: string
          duration_minutes?: number | null
          employee_id?: string | null
          id?: string
          job_id?: string | null
          meta?: Json | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "timesheets_events_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_performance_v"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "timesheets_events_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "equipe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timesheets_events_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timesheets_events_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "v_employee_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      user_display_settings: {
        Row: {
          active_view: string | null
          created_at: string
          custom_views: Json | null
          id: string
          page: string
          updated_at: string
          user_id: string
          visible_columns: Json
        }
        Insert: {
          active_view?: string | null
          created_at?: string
          custom_views?: Json | null
          id?: string
          page: string
          updated_at?: string
          user_id: string
          visible_columns?: Json
        }
        Update: {
          active_view?: string | null
          created_at?: string
          custom_views?: Json | null
          id?: string
          page?: string
          updated_at?: string
          user_id?: string
          visible_columns?: Json
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          company_id: string | null
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      employee_performance_v: {
        Row: {
          duree_totale_h: number | null
          employee_id: string | null
          employee_name: string | null
          en_cours: number | null
          heures_facturables: number | null
          terminees: number | null
          total_interventions: number | null
        }
        Relationships: []
      }
      v_employee_jobs: {
        Row: {
          address: string | null
          assigned_at: string | null
          client_name: string | null
          date: string | null
          description: string | null
          employee_id: string | null
          employee_name: string | null
          end_time: string | null
          id: string | null
          notes: string | null
          start_time: string | null
          status: string | null
          title: string | null
        }
        Relationships: [
          {
            foreignKeyName: "intervention_assignments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_performance_v"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "intervention_assignments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "equipe"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      bulk_approve_timesheets: {
        Args: { entry_ids: string[]; manager_id: string }
        Returns: undefined
      }
      bulk_reject_timesheets: {
        Args: { entry_ids: string[]; manager_id: string; reason: string }
        Returns: undefined
      }
      calculate_material_reserved: {
        Args: { p_material_id: string }
        Returns: number
      }
      check_material_availability: {
        Args: {
          p_end: string
          p_exclude_reservation_id?: string
          p_material_id: string
          p_qty_needed: number
          p_start: string
        }
        Returns: {
          is_available: boolean
          qty_already_reserved: number
          qty_available: number
          qty_on_hand: number
        }[]
      }
      create_notification: {
        Args: {
          p_actor_id?: string
          p_kind: string
          p_link?: string
          p_message: string
          p_title: string
        }
        Returns: string
      }
      finish_job: { Args: { p_job_id: string }; Returns: Json }
      generate_intervention_number: { Args: never; Returns: string }
      generate_invoice_number: { Args: never; Returns: string }
      generate_quote_number: { Args: never; Returns: string }
      get_intervention_billing_status: {
        Args: { p_job_id: string }
        Returns: string
      }
      get_user_company_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_manager: { Args: { user_id: string }; Returns: boolean }
      start_job: { Args: { p_job_id: string }; Returns: Json }
      update_agenda_event_statuses: { Args: never; Returns: undefined }
      update_reservations_for_quote: {
        Args: { p_quote_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "manager" | "employee"
      timesheet_status: "draft" | "submitted" | "approved" | "rejected"
      timesheet_status_enum: "draft" | "submitted" | "approved" | "rejected"
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
      app_role: ["admin", "manager", "employee"],
      timesheet_status: ["draft", "submitted", "approved", "rejected"],
      timesheet_status_enum: ["draft", "submitted", "approved", "rejected"],
    },
  },
} as const
