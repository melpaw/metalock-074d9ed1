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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      agent_permissions: {
        Row: {
          agent_id: string
          can_add_wallets: boolean
          can_approve_kyc: boolean
          can_process_tx: boolean
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          agent_id: string
          can_add_wallets?: boolean
          can_approve_kyc?: boolean
          can_process_tx?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          agent_id?: string
          can_add_wallets?: boolean
          can_approve_kyc?: boolean
          can_process_tx?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          id: string
          metadata: Json
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: []
      }
      bank_accounts: {
        Row: {
          account_holder: string
          bank_name: string
          country: string | null
          created_at: string
          iban: string | null
          iban_masked: string | null
          id: string
          last4: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_holder: string
          bank_name: string
          country?: string | null
          created_at?: string
          iban?: string | null
          iban_masked?: string | null
          id?: string
          last4: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_holder?: string
          bank_name?: string
          country?: string | null
          created_at?: string
          iban?: string | null
          iban_masked?: string | null
          id?: string
          last4?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      client_admin_notes: {
        Row: {
          note: string
          updated_at: string
          updated_by: string | null
          user_id: string
        }
        Insert: {
          note?: string
          updated_at?: string
          updated_by?: string | null
          user_id: string
        }
        Update: {
          note?: string
          updated_at?: string
          updated_by?: string | null
          user_id?: string
        }
        Relationships: []
      }
      client_permissions: {
        Row: {
          allow_buy: boolean
          allow_deposit: boolean
          allow_send: boolean
          allow_stake: boolean
          allow_swap: boolean
          allow_withdrawal: boolean
          updated_at: string
          updated_by: string | null
          user_id: string
          withdrawal_fee_rate: number
        }
        Insert: {
          allow_buy?: boolean
          allow_deposit?: boolean
          allow_send?: boolean
          allow_stake?: boolean
          allow_swap?: boolean
          allow_withdrawal?: boolean
          updated_at?: string
          updated_by?: string | null
          user_id: string
          withdrawal_fee_rate?: number
        }
        Update: {
          allow_buy?: boolean
          allow_deposit?: boolean
          allow_send?: boolean
          allow_stake?: boolean
          allow_swap?: boolean
          allow_withdrawal?: boolean
          updated_at?: string
          updated_by?: string | null
          user_id?: string
          withdrawal_fee_rate?: number
        }
        Relationships: []
      }
      currencies: {
        Row: {
          active: boolean
          coingecko_id: string | null
          created_at: string
          decimals: number
          id: string
          logo_url: string | null
          min_deposit: number
          min_withdraw: number
          name: string
          network: string | null
          price_updated_at: string | null
          symbol: string
          usd_price: number | null
          withdraw_fee: number
        }
        Insert: {
          active?: boolean
          coingecko_id?: string | null
          created_at?: string
          decimals?: number
          id?: string
          logo_url?: string | null
          min_deposit?: number
          min_withdraw?: number
          name: string
          network?: string | null
          price_updated_at?: string | null
          symbol: string
          usd_price?: number | null
          withdraw_fee?: number
        }
        Update: {
          active?: boolean
          coingecko_id?: string | null
          created_at?: string
          decimals?: number
          id?: string
          logo_url?: string | null
          min_deposit?: number
          min_withdraw?: number
          name?: string
          network?: string | null
          price_updated_at?: string | null
          symbol?: string
          usd_price?: number | null
          withdraw_fee?: number
        }
        Relationships: []
      }
      deposit_addresses: {
        Row: {
          address: string | null
          created_at: string
          currency_id: string
          id: string
          memo_tag: string | null
          network: string | null
          notes: string | null
          qr_image_path: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          currency_id: string
          id?: string
          memo_tag?: string | null
          network?: string | null
          notes?: string | null
          qr_image_path?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          created_at?: string
          currency_id?: string
          id?: string
          memo_tag?: string | null
          network?: string | null
          notes?: string | null
          qr_image_path?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deposit_addresses_currency_id_fkey"
            columns: ["currency_id"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["id"]
          },
        ]
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      investments: {
        Row: {
          accrued: number
          amount: number
          created_at: string
          currency_id: string
          daily_rate: number
          duration_days: number
          end_date: string
          id: string
          plan_id: string
          start_date: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          accrued?: number
          amount: number
          created_at?: string
          currency_id: string
          daily_rate: number
          duration_days: number
          end_date: string
          id?: string
          plan_id: string
          start_date?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          accrued?: number
          amount?: number
          created_at?: string
          currency_id?: string
          daily_rate?: number
          duration_days?: number
          end_date?: string
          id?: string
          plan_id?: string
          start_date?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "investments_currency_id_fkey"
            columns: ["currency_id"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "investments_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      kyc_submissions: {
        Row: {
          address: string
          birth_date: string
          country: string
          created_at: string
          doc_number: string
          doc_type: string
          document_path: string | null
          full_name: string
          id: string
          review_notes: string | null
          reviewed_at: string | null
          reviewer_id: string | null
          selfie_path: string | null
          status: Database["public"]["Enums"]["kyc_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          address: string
          birth_date: string
          country: string
          created_at?: string
          doc_number: string
          doc_type: string
          document_path?: string | null
          full_name: string
          id?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewer_id?: string | null
          selfie_path?: string | null
          status?: Database["public"]["Enums"]["kyc_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string
          birth_date?: string
          country?: string
          created_at?: string
          doc_number?: string
          doc_type?: string
          document_path?: string | null
          full_name?: string
          id?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewer_id?: string | null
          selfie_path?: string | null
          status?: Database["public"]["Enums"]["kyc_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          link: string | null
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      plans: {
        Row: {
          active: boolean
          created_at: string
          daily_rate: number
          description: string | null
          duration_days: number
          id: string
          max_amount: number
          min_amount: number
          name: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          daily_rate: number
          description?: string | null
          duration_days: number
          id?: string
          max_amount: number
          min_amount: number
          name: string
        }
        Update: {
          active?: boolean
          created_at?: string
          daily_rate?: number
          description?: string | null
          duration_days?: number
          id?: string
          max_amount?: number
          min_amount?: number
          name?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          agent_display_name: string | null
          avatar_url: string | null
          city: string | null
          country: string | null
          created_at: string
          date_of_birth: string | null
          display_currency: string
          email: string
          full_address: string | null
          full_name: string | null
          id: string
          kyc_status: Database["public"]["Enums"]["kyc_status"]
          kyc_verified: boolean
          locale: string
          phone: string | null
          postal_code: string | null
          registered_by: string | null
          status: Database["public"]["Enums"]["account_status"]
          updated_at: string
        }
        Insert: {
          agent_display_name?: string | null
          avatar_url?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          date_of_birth?: string | null
          display_currency?: string
          email: string
          full_address?: string | null
          full_name?: string | null
          id: string
          kyc_status?: Database["public"]["Enums"]["kyc_status"]
          kyc_verified?: boolean
          locale?: string
          phone?: string | null
          postal_code?: string | null
          registered_by?: string | null
          status?: Database["public"]["Enums"]["account_status"]
          updated_at?: string
        }
        Update: {
          agent_display_name?: string | null
          avatar_url?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          date_of_birth?: string | null
          display_currency?: string
          email?: string
          full_address?: string | null
          full_name?: string | null
          id?: string
          kyc_status?: Database["public"]["Enums"]["kyc_status"]
          kyc_verified?: boolean
          locale?: string
          phone?: string | null
          postal_code?: string | null
          registered_by?: string | null
          status?: Database["public"]["Enums"]["account_status"]
          updated_at?: string
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          agent_id: string | null
          assigned_to: string | null
          category: string
          created_at: string
          id: string
          priority: string
          status: string
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          agent_id?: string | null
          assigned_to?: string | null
          category?: string
          created_at?: string
          id?: string
          priority?: string
          status?: string
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          agent_id?: string | null
          assigned_to?: string | null
          category?: string
          created_at?: string
          id?: string
          priority?: string
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      ticket_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          is_internal: boolean
          sender_id: string
          ticket_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          is_internal?: boolean
          sender_id: string
          ticket_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          is_internal?: boolean
          sender_id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          cashback_amount: number
          created_at: string
          created_by: string | null
          currency_id: string | null
          fee: number
          hidden: boolean
          id: string
          metadata: Json
          note: string | null
          reference: string | null
          status: Database["public"]["Enums"]["tx_status"]
          type: Database["public"]["Enums"]["tx_type"]
          usd_value: number | null
          user_id: string
        }
        Insert: {
          amount: number
          cashback_amount?: number
          created_at?: string
          created_by?: string | null
          currency_id?: string | null
          fee?: number
          hidden?: boolean
          id?: string
          metadata?: Json
          note?: string | null
          reference?: string | null
          status?: Database["public"]["Enums"]["tx_status"]
          type: Database["public"]["Enums"]["tx_type"]
          usd_value?: number | null
          user_id: string
        }
        Update: {
          amount?: number
          cashback_amount?: number
          created_at?: string
          created_by?: string | null
          currency_id?: string | null
          fee?: number
          hidden?: boolean
          id?: string
          metadata?: Json
          note?: string | null
          reference?: string | null
          status?: Database["public"]["Enums"]["tx_status"]
          type?: Database["public"]["Enums"]["tx_type"]
          usd_value?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_currency_id_fkey"
            columns: ["currency_id"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["id"]
          },
        ]
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
      wallets: {
        Row: {
          available: number
          created_at: string
          currency_id: string
          id: string
          locked: number
          user_id: string
        }
        Insert: {
          available?: number
          created_at?: string
          currency_id: string
          id?: string
          locked?: number
          user_id: string
        }
        Update: {
          available?: number
          created_at?: string
          currency_id?: string
          id?: string
          locked?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallets_currency_id_fkey"
            columns: ["currency_id"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_add_transaction: {
        Args: {
          _amount: number
          _currency_id: string
          _fee_waived?: boolean
          _hidden: boolean
          _note: string
          _sender_address: string
          _status: string
          _tx_date: string
          _tx_hash: string
          _type: Database["public"]["Enums"]["tx_type"]
          _user_id: string
        }
        Returns: string
      }
      admin_adjust_balance: {
        Args: {
          _currency_id: string
          _delta: number
          _reason: string
          _user_id: string
        }
        Returns: undefined
      }
      admin_process_deposit: {
        Args: { _approve: boolean; _tx_id: string }
        Returns: undefined
      }
      admin_process_withdrawal: {
        Args: { _approve: boolean; _tx_id: string }
        Returns: undefined
      }
      admin_register_client: { Args: { _email: string }; Returns: string }
      admin_review_kyc: {
        Args: { _approve: boolean; _id: string; _notes: string }
        Returns: undefined
      }
      admin_set_deposit_address: {
        Args: {
          _address: string
          _id: string
          _memo_tag: string
          _network: string
          _notes: string
          _qr_image_path: string
        }
        Returns: undefined
      }
      admin_set_insurance_quote: {
        Args: { _percent: number; _tx_id: string }
        Returns: undefined
      }
      admin_set_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: undefined
      }
      admin_update_currency_price: {
        Args: { _currency_id: string; _usd_price: number }
        Returns: undefined
      }
      admin_update_profile: {
        Args: {
          _city: string
          _country: string
          _date_of_birth: string
          _full_address: string
          _full_name: string
          _phone: string
          _postal_code: string
          _user_id: string
        }
        Returns: undefined
      }
      admin_update_transaction: {
        Args: {
          _hidden: boolean
          _note: string
          _status: string
          _tx_id: string
        }
        Returns: undefined
      }
      client_internal_transfer: {
        Args: { _amount: number; _from_currency: string; _to_currency: string }
        Returns: undefined
      }
      client_request_bank_withdrawal: {
        Args: {
          _amount: number
          _bank_id: string
          _currency_id: string
          _fiat_currency: string
        }
        Returns: string
      }
      client_request_buy: {
        Args: {
          _from_amount: number
          _from_currency: string
          _to_currency: string
        }
        Returns: string
      }
      client_request_deposit_address: {
        Args: { _currency_id: string }
        Returns: string
      }
      client_request_external_send: {
        Args: {
          _amount: number
          _currency_id: string
          _notes: string
          _to_address: string
        }
        Returns: string
      }
      client_request_withdrawal_v2: {
        Args: {
          _amount: number
          _bank_id: string
          _currency_id: string
          _insurance_requested: boolean
        }
        Returns: string
      }
      client_respond_insurance: {
        Args: { _approve: boolean; _payment_note: string; _tx_id: string }
        Returns: string
      }
      client_swap: {
        Args: {
          _from_amount: number
          _from_currency: string
          _rate: number
          _to_currency: string
        }
        Returns: undefined
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      email_queue_dispatch: { Args: never; Returns: undefined }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      invest_in_plan: {
        Args: { _amount: number; _currency_id: string; _plan_id: string }
        Returns: string
      }
      is_my_client: { Args: { _user_id: string }; Returns: boolean }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      request_deposit: {
        Args: { _amount: number; _currency_id: string; _tx_hash: string }
        Returns: string
      }
      request_withdrawal: {
        Args: { _address: string; _amount: number; _currency_id: string }
        Returns: string
      }
      set_agent_display_name: {
        Args: { _display_name: string }
        Returns: undefined
      }
      staff_process_swap: {
        Args: { _approve: boolean; _tx_id: string }
        Returns: undefined
      }
    }
    Enums: {
      account_status: "active" | "frozen" | "blocked"
      app_role: "admin" | "agent" | "client"
      kyc_status: "not_submitted" | "pending" | "approved" | "rejected"
      tx_status: "pending" | "completed" | "rejected" | "cancelled"
      tx_type:
        | "deposit"
        | "withdrawal"
        | "investment"
        | "profit"
        | "adjustment"
        | "transfer"
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
      account_status: ["active", "frozen", "blocked"],
      app_role: ["admin", "agent", "client"],
      kyc_status: ["not_submitted", "pending", "approved", "rejected"],
      tx_status: ["pending", "completed", "rejected", "cancelled"],
      tx_type: [
        "deposit",
        "withdrawal",
        "investment",
        "profit",
        "adjustment",
        "transfer",
      ],
    },
  },
} as const
