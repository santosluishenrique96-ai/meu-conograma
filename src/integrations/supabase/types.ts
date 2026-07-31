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
      current_user_is_store_admin: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      get_default_subscription_plan_id: {
        Args: Record<PropertyKey, never>;
        Returns: string;
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
      sync_user_subscription_state: {
        Args: {
          target_subscription_id: string;
          sync_event_type?: string;
        };
        Returns: undefined;
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
