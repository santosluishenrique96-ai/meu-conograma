export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      evolution_photos: {
        Row: {
          created_at: string;
          id: string;
          image_url: string;
          note: string | null;
          storage_path: string | null;
          taken_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          image_url: string;
          note?: string | null;
          storage_path?: string | null;
          taken_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          image_url?: string;
          note?: string | null;
          storage_path?: string | null;
          taken_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          display_name: string | null;
          id: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          display_name?: string | null;
          id?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          display_name?: string | null;
          id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      products: {
        Row: {
          badge: string;
          benefits: string[];
          created_at: string;
          created_by: string | null;
          cta_mode: string;
          external_url: string;
          focus: string;
          id: string;
          image_url: string;
          name: string;
          price_value: number;
          sort_order: number;
          subtitle: string;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          badge?: string;
          benefits?: string[];
          created_at?: string;
          created_by?: string | null;
          cta_mode?: string;
          external_url?: string;
          focus?: string;
          id: string;
          image_url?: string;
          name: string;
          price_value?: number;
          sort_order?: number;
          subtitle: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          badge?: string;
          benefits?: string[];
          created_at?: string;
          created_by?: string | null;
          cta_mode?: string;
          external_url?: string;
          focus?: string;
          id?: string;
          image_url?: string;
          name?: string;
          price_value?: number;
          sort_order?: number;
          subtitle?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [];
      };
      plan_feature_access: {
        Row: {
          created_at: string;
          created_by: string | null;
          feature_id: string;
          id: string;
          is_enabled: boolean;
          plan_id: string;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          feature_id: string;
          id?: string;
          is_enabled?: boolean;
          plan_id: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          feature_id?: string;
          id?: string;
          is_enabled?: boolean;
          plan_id?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [];
      };
      subscription_plans: {
        Row: {
          annual_price: number;
          badge: string | null;
          button_text: string;
          color: string;
          created_at: string;
          created_by: string | null;
          description: string;
          display_order: number;
          free_trial_days: number;
          icon: string;
          id: string;
          is_active: boolean;
          monthly_price: number;
          name: string;
          promotional_price: number | null;
          slug: string;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          annual_price?: number;
          badge?: string | null;
          button_text?: string;
          color?: string;
          created_at?: string;
          created_by?: string | null;
          description?: string;
          display_order?: number;
          free_trial_days?: number;
          icon?: string;
          id?: string;
          is_active?: boolean;
          monthly_price?: number;
          name: string;
          promotional_price?: number | null;
          slug: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          annual_price?: number;
          badge?: string | null;
          button_text?: string;
          color?: string;
          created_at?: string;
          created_by?: string | null;
          description?: string;
          display_order?: number;
          free_trial_days?: number;
          icon?: string;
          id?: string;
          is_active?: boolean;
          monthly_price?: number;
          name?: string;
          promotional_price?: number | null;
          slug?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [];
      };
      subscription_features: {
        Row: {
          category: string;
          created_at: string;
          created_by: string | null;
          description: string;
          display_order: number;
          feature_key: string;
          id: string;
          is_active: boolean;
          name: string;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          category?: string;
          created_at?: string;
          created_by?: string | null;
          description?: string;
          display_order?: number;
          feature_key: string;
          id?: string;
          is_active?: boolean;
          name: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          category?: string;
          created_at?: string;
          created_by?: string | null;
          description?: string;
          display_order?: number;
          feature_key?: string;
          id?: string;
          is_active?: boolean;
          name?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [];
      };
      schedule_preferences: {
        Row: {
          created_at: string;
          friday: string;
          goal: string | null;
          hair_type: string | null;
          id: string;
          monday: string;
          saturday: string;
          sunday: string;
          thursday: string;
          tuesday: string;
          updated_at: string;
          user_id: string;
          wednesday: string;
        };
        Insert: {
          created_at?: string;
          friday?: string;
          goal?: string | null;
          hair_type?: string | null;
          id?: string;
          monday?: string;
          saturday?: string;
          sunday?: string;
          thursday?: string;
          tuesday?: string;
          updated_at?: string;
          user_id: string;
          wednesday?: string;
        };
        Update: {
          created_at?: string;
          friday?: string;
          goal?: string | null;
          hair_type?: string | null;
          id?: string;
          monday?: string;
          saturday?: string;
          sunday?: string;
          thursday?: string;
          tuesday?: string;
          updated_at?: string;
          user_id?: string;
          wednesday?: string;
        };
        Relationships: [];
      };
      store_settings: {
        Row: {
          created_at: string;
          id: string;
          updated_at: string;
          updated_by: string | null;
          whatsapp_number: string;
        };
        Insert: {
          created_at?: string;
          id: string;
          updated_at?: string;
          updated_by?: string | null;
          whatsapp_number?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          updated_at?: string;
          updated_by?: string | null;
          whatsapp_number?: string;
        };
        Relationships: [];
      };
      store_admins: {
        Row: {
          created_at: string;
          id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      billing_checkout_sessions: {
        Row: {
          action: string;
          amount_snapshot: number | null;
          billing_interval: string;
          cancel_url: string | null;
          canceled_at: string | null;
          checkout_url: string | null;
          completed_at: string | null;
          created_at: string;
          currency_code: string;
          expires_at: string | null;
          external_checkout_id: string | null;
          external_customer_id: string | null;
          external_subscription_id: string | null;
          gateway: string;
          id: string;
          metadata: Json;
          plan_id: string;
          status: string;
          subscription_id: string | null;
          success_url: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          action: string;
          amount_snapshot?: number | null;
          billing_interval?: string;
          cancel_url?: string | null;
          canceled_at?: string | null;
          checkout_url?: string | null;
          completed_at?: string | null;
          created_at?: string;
          currency_code?: string;
          expires_at?: string | null;
          external_checkout_id?: string | null;
          external_customer_id?: string | null;
          external_subscription_id?: string | null;
          gateway: string;
          id?: string;
          metadata?: Json;
          plan_id: string;
          status?: string;
          subscription_id?: string | null;
          success_url?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          action?: string;
          amount_snapshot?: number | null;
          billing_interval?: string;
          cancel_url?: string | null;
          canceled_at?: string | null;
          checkout_url?: string | null;
          completed_at?: string | null;
          created_at?: string;
          currency_code?: string;
          expires_at?: string | null;
          external_checkout_id?: string | null;
          external_customer_id?: string | null;
          external_subscription_id?: string | null;
          gateway?: string;
          id?: string;
          metadata?: Json;
          plan_id?: string;
          status?: string;
          subscription_id?: string | null;
          success_url?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      billing_invoices: {
        Row: {
          amount_due: number;
          amount_paid: number;
          amount_refunded: number;
          billing_reason: string;
          created_at: string;
          currency_code: string;
          due_at: string | null;
          external_invoice_id: string | null;
          gateway: string;
          hosted_invoice_url: string | null;
          id: string;
          invoice_url: string | null;
          metadata: Json;
          paid_at: string | null;
          period_end: string | null;
          period_start: string | null;
          plan_id: string | null;
          status: string;
          subscription_id: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          amount_due?: number;
          amount_paid?: number;
          amount_refunded?: number;
          billing_reason?: string;
          created_at?: string;
          currency_code?: string;
          due_at?: string | null;
          external_invoice_id?: string | null;
          gateway: string;
          hosted_invoice_url?: string | null;
          id?: string;
          invoice_url?: string | null;
          metadata?: Json;
          paid_at?: string | null;
          period_end?: string | null;
          period_start?: string | null;
          plan_id?: string | null;
          status?: string;
          subscription_id?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          amount_due?: number;
          amount_paid?: number;
          amount_refunded?: number;
          billing_reason?: string;
          created_at?: string;
          currency_code?: string;
          due_at?: string | null;
          external_invoice_id?: string | null;
          gateway?: string;
          hosted_invoice_url?: string | null;
          id?: string;
          invoice_url?: string | null;
          metadata?: Json;
          paid_at?: string | null;
          period_end?: string | null;
          period_start?: string | null;
          plan_id?: string | null;
          status?: string;
          subscription_id?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      billing_webhook_events: {
        Row: {
          created_at: string;
          event_status: string;
          event_type: string;
          external_event_id: string;
          gateway: string;
          id: string;
          last_error: string | null;
          payload: Json;
          processed_at: string | null;
          signature: string | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          event_status?: string;
          event_type: string;
          external_event_id: string;
          gateway: string;
          id?: string;
          last_error?: string | null;
          payload?: Json;
          processed_at?: string | null;
          signature?: string | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          event_status?: string;
          event_type?: string;
          external_event_id?: string;
          gateway?: string;
          id?: string;
          last_error?: string | null;
          payload?: Json;
          processed_at?: string | null;
          signature?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      user_subscriptions: {
        Row: {
          auto_renew: boolean;
          billing_interval: string;
          canceled_at: string | null;
          created_at: string;
          created_by: string | null;
          currency_code: string;
          current_period_ends_at: string | null;
          current_period_starts_at: string | null;
          due_at: string | null;
          ends_at: string | null;
          external_reference: string | null;
          id: string;
          metadata: Json;
          origin: string;
          plan_id: string;
          price_snapshot: number | null;
          provider: string;
          provider_customer_id: string | null;
          provider_subscription_id: string | null;
          renewal_count: number;
          started_at: string | null;
          status: string;
          trial_days_snapshot: number;
          trial_ends_at: string | null;
          trial_starts_at: string | null;
          trial_used: boolean;
          updated_at: string;
          updated_by: string | null;
          user_id: string;
        };
        Insert: {
          auto_renew?: boolean;
          billing_interval?: string;
          canceled_at?: string | null;
          created_at?: string;
          created_by?: string | null;
          currency_code?: string;
          current_period_ends_at?: string | null;
          current_period_starts_at?: string | null;
          due_at?: string | null;
          ends_at?: string | null;
          external_reference?: string | null;
          id?: string;
          metadata?: Json;
          origin?: string;
          plan_id: string;
          price_snapshot?: number | null;
          provider?: string;
          provider_customer_id?: string | null;
          provider_subscription_id?: string | null;
          renewal_count?: number;
          started_at?: string | null;
          status?: string;
          trial_days_snapshot?: number;
          trial_ends_at?: string | null;
          trial_starts_at?: string | null;
          trial_used?: boolean;
          updated_at?: string;
          updated_by?: string | null;
          user_id: string;
        };
        Update: {
          auto_renew?: boolean;
          billing_interval?: string;
          canceled_at?: string | null;
          created_at?: string;
          created_by?: string | null;
          currency_code?: string;
          current_period_ends_at?: string | null;
          current_period_starts_at?: string | null;
          due_at?: string | null;
          ends_at?: string | null;
          external_reference?: string | null;
          id?: string;
          metadata?: Json;
          origin?: string;
          plan_id?: string;
          price_snapshot?: number | null;
          provider?: string;
          provider_customer_id?: string | null;
          provider_subscription_id?: string | null;
          renewal_count?: number;
          started_at?: string | null;
          status?: string;
          trial_days_snapshot?: number;
          trial_ends_at?: string | null;
          trial_starts_at?: string | null;
          trial_used?: boolean;
          updated_at?: string;
          updated_by?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      user_subscription_history: {
        Row: {
          auto_renew: boolean;
          created_at: string;
          due_at: string | null;
          event_type: string;
          id: string;
          payload: Json;
          plan_id: string | null;
          started_at: string | null;
          status: string;
          subscription_id: string | null;
          trial_ends_at: string | null;
          trial_starts_at: string | null;
          user_id: string;
        };
        Insert: {
          auto_renew?: boolean;
          created_at?: string;
          due_at?: string | null;
          event_type: string;
          id?: string;
          payload?: Json;
          plan_id?: string | null;
          started_at?: string | null;
          status: string;
          subscription_id?: string | null;
          trial_ends_at?: string | null;
          trial_starts_at?: string | null;
          user_id: string;
        };
        Update: {
          auto_renew?: boolean;
          created_at?: string;
          due_at?: string | null;
          event_type?: string;
          id?: string;
          payload?: Json;
          plan_id?: string | null;
          started_at?: string | null;
          status?: string;
          subscription_id?: string | null;
          trial_ends_at?: string | null;
          trial_starts_at?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      user_subscription_state: {
        Row: {
          auto_renew: boolean;
          created_at: string;
          current_plan_id: string | null;
          current_subscription_id: string | null;
          due_at: string | null;
          id: string;
          last_history_event_at: string | null;
          renewal_count: number;
          started_at: string | null;
          status: string;
          trial_ends_at: string | null;
          trial_starts_at: string | null;
          trial_used: boolean;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          auto_renew?: boolean;
          created_at?: string;
          current_plan_id?: string | null;
          current_subscription_id?: string | null;
          due_at?: string | null;
          id?: string;
          last_history_event_at?: string | null;
          renewal_count?: number;
          started_at?: string | null;
          status?: string;
          trial_ends_at?: string | null;
          trial_starts_at?: string | null;
          trial_used?: boolean;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          auto_renew?: boolean;
          created_at?: string;
          current_plan_id?: string | null;
          current_subscription_id?: string | null;
          due_at?: string | null;
          id?: string;
          last_history_event_at?: string | null;
          renewal_count?: number;
          started_at?: string | null;
          status?: string;
          trial_ends_at?: string | null;
          trial_starts_at?: string | null;
          trial_used?: boolean;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      apply_billing_subscription_event: {
        Args: {
          lifecycle_event: string;
          next_status: string;
          target_auto_renew?: boolean;
          target_billing_interval?: string;
          target_currency_code?: string;
          target_current_period_ends_at?: string;
          target_current_period_starts_at?: string;
          target_due_at?: string;
          target_external_customer_id?: string;
          target_external_reference?: string;
          target_external_subscription_id?: string;
          target_gateway: string;
          target_metadata?: Json;
          target_plan_id: string;
          target_price_snapshot?: number;
          target_subscription_id?: string;
          target_trial_ends_at?: string;
          target_trial_starts_at?: string;
          target_user_id: string;
        };
        Returns: string;
      };
      current_user_is_store_admin: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      current_user_has_feature_access: {
        Args: {
          required_feature_key: string;
        };
        Returns: boolean;
      };
      get_default_subscription_plan_id: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      get_current_user_feature_access: {
        Args: {
          required_feature_key: string;
        };
        Returns: Json;
      };
      has_store_admins: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      provision_default_subscription_for_user: {
        Args: {
          target_user_id: string;
        };
        Returns: string;
      };
      provision_current_user_subscription: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      record_billing_checkout_session: {
        Args: {
          target_action: string;
          target_amount_snapshot?: number;
          target_billing_interval?: string;
          target_cancel_url?: string;
          target_checkout_url?: string;
          target_currency_code?: string;
          target_expires_at?: string;
          target_gateway: string;
          target_metadata?: Json;
          target_plan_id: string;
          target_subscription_id?: string;
          target_success_url?: string;
        };
        Returns: string;
      };
      register_billing_webhook_event: {
        Args: {
          target_event_type: string;
          target_external_event_id: string;
          target_gateway: string;
          target_payload?: Json;
          target_signature?: string;
        };
        Returns: string;
      };
      sync_user_subscription_state: {
        Args: {
          target_subscription_id: string;
          sync_event_type?: string;
        };
        Returns: undefined;
      };
      upsert_billing_invoice: {
        Args: {
          target_amount_due?: number;
          target_amount_paid?: number;
          target_amount_refunded?: number;
          target_billing_reason?: string;
          target_currency_code?: string;
          target_due_at?: string;
          target_external_invoice_id?: string;
          target_gateway?: string;
          target_hosted_invoice_url?: string;
          target_invoice_url?: string;
          target_metadata?: Json;
          target_paid_at?: string;
          target_period_end?: string;
          target_period_start?: string;
          target_plan_id?: string;
          target_status?: string;
          target_subscription_id?: string;
          target_user_id: string;
        };
        Returns: string;
      };
      user_has_feature_access: {
        Args: {
          target_user_id: string;
          required_feature_key: string;
        };
        Returns: boolean;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
