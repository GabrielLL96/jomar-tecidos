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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action: string
          created_at: string
          details: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      addresses: {
        Row: {
          city: string
          created_at: string
          id: string
          is_default: boolean
          label: string
          state: string
          street: string
          user_id: string
          zip_code: string
        }
        Insert: {
          city: string
          created_at?: string
          id?: string
          is_default?: boolean
          label: string
          state: string
          street: string
          user_id: string
          zip_code: string
        }
        Update: {
          city?: string
          created_at?: string
          id?: string
          is_default?: boolean
          label?: string
          state?: string
          street?: string
          user_id?: string
          zip_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "addresses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      cart_items: {
        Row: {
          cart_id: string
          color_id: string | null
          id: string
          meters: number
          product_id: string
        }
        Insert: {
          cart_id: string
          color_id?: string | null
          id?: string
          meters: number
          product_id: string
        }
        Update: {
          cart_id?: string
          color_id?: string | null
          id?: string
          meters?: number
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_cart_id_fkey"
            columns: ["cart_id"]
            isOneToOne: false
            referencedRelation: "carts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_color_id_fkey"
            columns: ["color_id"]
            isOneToOne: false
            referencedRelation: "product_colors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      carts: {
        Row: {
          created_at: string
          id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "carts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      compositions: {
        Row: {
          color: string | null
          id: string
          name: string
          sort_order: number
        }
        Insert: {
          color?: string | null
          id?: string
          name: string
          sort_order?: number
        }
        Update: {
          color?: string | null
          id?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      coupons: {
        Row: {
          code: string
          expires_at: string | null
          id: string
          max_uses: number | null
          status: Database["public"]["Enums"]["coupon_status"]
          type: Database["public"]["Enums"]["coupon_type"]
          used_count: number
          value: number
        }
        Insert: {
          code: string
          expires_at?: string | null
          id?: string
          max_uses?: number | null
          status?: Database["public"]["Enums"]["coupon_status"]
          type: Database["public"]["Enums"]["coupon_type"]
          used_count?: number
          value: number
        }
        Update: {
          code?: string
          expires_at?: string | null
          id?: string
          max_uses?: number | null
          status?: Database["public"]["Enums"]["coupon_status"]
          type?: Database["public"]["Enums"]["coupon_type"]
          used_count?: number
          value?: number
        }
        Relationships: []
      }
      deliveries: {
        Row: {
          carrier: string
          eta_date: string
          id: string
          order_id: string
          status: Database["public"]["Enums"]["delivery_status"]
          tracking_code: string
        }
        Insert: {
          carrier: string
          eta_date: string
          id?: string
          order_id: string
          status?: Database["public"]["Enums"]["delivery_status"]
          tracking_code: string
        }
        Update: {
          carrier?: string
          eta_date?: string
          id?: string
          order_id?: string
          status?: Database["public"]["Enums"]["delivery_status"]
          tracking_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "deliveries_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_campaigns: {
        Row: {
          channel: Database["public"]["Enums"]["campaign_channel"]
          conversions: number
          end_date: string | null
          id: string
          name: string
          reach: number
          start_date: string
          status: Database["public"]["Enums"]["campaign_status"]
        }
        Insert: {
          channel: Database["public"]["Enums"]["campaign_channel"]
          conversions?: number
          end_date?: string | null
          id?: string
          name: string
          reach?: number
          start_date: string
          status?: Database["public"]["Enums"]["campaign_status"]
        }
        Update: {
          channel?: Database["public"]["Enums"]["campaign_channel"]
          conversions?: number
          end_date?: string | null
          id?: string
          name?: string
          reach?: number
          start_date?: string
          status?: Database["public"]["Enums"]["campaign_status"]
        }
        Relationships: []
      }
      order_items: {
        Row: {
          color_id: string | null
          id: string
          meters: number
          order_id: string
          product_id: string
          total: number
          unit_price: number
        }
        Insert: {
          color_id?: string | null
          id?: string
          meters: number
          order_id: string
          product_id: string
          total: number
          unit_price: number
        }
        Update: {
          color_id?: string | null
          id?: string
          meters?: number
          order_id?: string
          product_id?: string
          total?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_color_id_fkey"
            columns: ["color_id"]
            isOneToOne: false
            referencedRelation: "product_colors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      order_status_history: {
        Row: {
          changed_by_name: string
          created_at: string
          id: string
          order_id: string
          status: Database["public"]["Enums"]["order_status"]
        }
        Insert: {
          changed_by_name: string
          created_at?: string
          id?: string
          order_id: string
          status: Database["public"]["Enums"]["order_status"]
        }
        Update: {
          changed_by_name?: string
          created_at?: string
          id?: string
          order_id?: string
          status?: Database["public"]["Enums"]["order_status"]
        }
        Relationships: [
          {
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          cancel_reason: string | null
          coupon_id: string | null
          created_at: string
          discount_total: number
          id: string
          order_number: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          shipping_address_id: string
          shipping_cost: number
          status: Database["public"]["Enums"]["order_status"]
          subtotal: number
          total: number
          user_id: string
        }
        Insert: {
          cancel_reason?: string | null
          coupon_id?: string | null
          created_at?: string
          discount_total?: number
          id?: string
          order_number?: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          shipping_address_id: string
          shipping_cost?: number
          status?: Database["public"]["Enums"]["order_status"]
          subtotal: number
          total: number
          user_id: string
        }
        Update: {
          cancel_reason?: string | null
          coupon_id?: string | null
          created_at?: string
          discount_total?: number
          id?: string
          order_number?: string
          payment_method?: Database["public"]["Enums"]["payment_method"]
          shipping_address_id?: string
          shipping_cost?: number
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          total?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_shipping_address_id_fkey"
            columns: ["shipping_address_id"]
            isOneToOne: false
            referencedRelation: "addresses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      product_colors: {
        Row: {
          hex: string
          id: string
          label: string
          product_id: string
        }
        Insert: {
          hex: string
          id?: string
          label: string
          product_id: string
        }
        Update: {
          hex?: string
          id?: string
          label?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_colors_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_compositions: {
        Row: {
          composition_id: string
          percentage: number
          product_id: string
        }
        Insert: {
          composition_id: string
          percentage: number
          product_id: string
        }
        Update: {
          composition_id?: string
          percentage?: number
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_compositions_composition_id_fkey"
            columns: ["composition_id"]
            isOneToOne: false
            referencedRelation: "compositions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_compositions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          id: string
          product_id: string
          sort_order: number
          url: string
        }
        Insert: {
          id?: string
          product_id: string
          sort_order?: number
          url: string
        }
        Update: {
          id?: string
          product_id?: string
          sort_order?: number
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category_slug: string
          created_at: string
          description: string
          id: string
          image_url: string | null
          is_bestseller: boolean
          min_sale_meters: number
          min_stock_meters: number
          name: string
          price_per_meter: number
          sku: string
          slug: string
          status: Database["public"]["Enums"]["product_status"]
          stock_meters: number
          tag: string | null
          updated_at: string
          width_m: number
        }
        Insert: {
          category_slug: string
          created_at?: string
          description?: string
          id?: string
          image_url?: string | null
          is_bestseller?: boolean
          min_sale_meters?: number
          min_stock_meters?: number
          name: string
          price_per_meter: number
          sku: string
          slug: string
          status?: Database["public"]["Enums"]["product_status"]
          stock_meters?: number
          tag?: string | null
          updated_at?: string
          width_m: number
        }
        Update: {
          category_slug?: string
          created_at?: string
          description?: string
          id?: string
          image_url?: string | null
          is_bestseller?: boolean
          min_sale_meters?: number
          min_stock_meters?: number
          name?: string
          price_per_meter?: number
          sku?: string
          slug?: string
          status?: Database["public"]["Enums"]["product_status"]
          stock_meters?: number
          tag?: string | null
          updated_at?: string
          width_m?: number
        }
        Relationships: []
      }
      reviews: {
        Row: {
          author_name: string
          created_at: string
          id: string
          product_id: string
          rating: number
          text: string
          user_id: string | null
        }
        Insert: {
          author_name: string
          created_at?: string
          id?: string
          product_id: string
          rating: number
          text?: string
          user_id?: string | null
        }
        Update: {
          author_name?: string
          created_at?: string
          id?: string
          product_id?: string
          rating?: number
          text?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      site_settings: {
        Row: {
          key: string
          value: string
        }
        Insert: {
          key: string
          value: string
        }
        Update: {
          key?: string
          value?: string
        }
        Relationships: []
      }
      stock_movements: {
        Row: {
          created_at: string
          id: string
          performed_by_name: string
          product_id: string
          quantity: number
          reason: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          performed_by_name: string
          product_id: string
          quantity: number
          reason: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          performed_by_name?: string
          product_id?: string
          quantity?: number
          reason?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string
          email: string
          id: string
          last_login_at: string | null
          name: string
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          status: Database["public"]["Enums"]["user_status"]
        }
        Insert: {
          created_at?: string
          email: string
          id: string
          last_login_at?: string | null
          name: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          status?: Database["public"]["Enums"]["user_status"]
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          last_login_at?: string | null
          name?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          status?: Database["public"]["Enums"]["user_status"]
        }
        Relationships: []
      }
      wishlists: {
        Row: {
          id: string
          product_id: string
          user_id: string
        }
        Insert: {
          id?: string
          product_id: string
          user_id: string
        }
        Update: {
          id?: string
          product_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlists_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wishlists_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      decrement_coupon_usage: {
        Args: { p_coupon_id: string }
        Returns: undefined
      }
      increment_coupon_usage: {
        Args: { p_coupon_id: string }
        Returns: undefined
      }
    }
    Enums: {
      campaign_channel: "instagram_ads" | "google_ads" | "email" | "whatsapp"
      campaign_status: "active" | "scheduled" | "ended"
      coupon_status: "active" | "scheduled" | "expired" | "depleted"
      coupon_type: "percentage" | "fixed" | "free_shipping"
      delivery_status:
        | "awaiting_pickup"
        | "in_transit"
        | "delivered"
        | "delayed"
      order_status: "pending" | "paid" | "shipping" | "delivered" | "cancelled"
      payment_method: "credit_card" | "pix" | "boleto"
      product_status: "active" | "low_stock" | "out_of_stock" | "draft"
      user_role:
        | "customer"
        | "admin"
        | "vendas"
        | "estoque"
        | "marketing"
        | "suporte"
      user_status: "active" | "inactive"
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
      campaign_channel: ["instagram_ads", "google_ads", "email", "whatsapp"],
      campaign_status: ["active", "scheduled", "ended"],
      coupon_status: ["active", "scheduled", "expired", "depleted"],
      coupon_type: ["percentage", "fixed", "free_shipping"],
      delivery_status: [
        "awaiting_pickup",
        "in_transit",
        "delivered",
        "delayed",
      ],
      order_status: ["pending", "paid", "shipping", "delivered", "cancelled"],
      payment_method: ["credit_card", "pix", "boleto"],
      product_status: ["active", "low_stock", "out_of_stock", "draft"],
      user_role: [
        "customer",
        "admin",
        "vendas",
        "estoque",
        "marketing",
        "suporte",
      ],
      user_status: ["active", "inactive"],
    },
  },
} as const
