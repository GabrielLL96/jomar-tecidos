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
          data_after: Json | null
          data_before: Json | null
          details: string | null
          entity: string | null
          entity_id: string | null
          error_message: string | null
          id: string
          ip_address: string | null
          status: string
          user_agent: string | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          data_after?: Json | null
          data_before?: Json | null
          details?: string | null
          entity?: string | null
          entity_id?: string | null
          error_message?: string | null
          id?: string
          ip_address?: string | null
          status?: string
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          data_after?: Json | null
          data_before?: Json | null
          details?: string | null
          entity?: string | null
          entity_id?: string | null
          error_message?: string | null
          id?: string
          ip_address?: string | null
          status?: string
          user_agent?: string | null
          user_email?: string | null
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
      asaas_settings: {
        Row: {
          api_key: string | null
          connected_at: string | null
          connected_by: string | null
          environment: string
          id: string
          updated_at: string
          webhook_token: string | null
        }
        Insert: {
          api_key?: string | null
          connected_at?: string | null
          connected_by?: string | null
          environment?: string
          id?: string
          updated_at?: string
          webhook_token?: string | null
        }
        Update: {
          api_key?: string | null
          connected_at?: string | null
          connected_by?: string | null
          environment?: string
          id?: string
          updated_at?: string
          webhook_token?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "asaas_settings_connected_by_fkey"
            columns: ["connected_by"]
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
          starts_at: string | null
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
          starts_at?: string | null
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
          starts_at?: string | null
          status?: Database["public"]["Enums"]["coupon_status"]
          type?: Database["public"]["Enums"]["coupon_type"]
          used_count?: number
          value?: number
        }
        Relationships: []
      }
      deliveries: {
        Row: {
          carrier: string | null
          eta_date: string | null
          id: string
          melhor_envio_protocol: string | null
          melhor_envio_shipment_id: string | null
          order_id: string
          status: Database["public"]["Enums"]["delivery_status"]
          tracking_code: string
          tracking_url: string | null
        }
        Insert: {
          carrier?: string | null
          eta_date?: string | null
          id?: string
          melhor_envio_protocol?: string | null
          melhor_envio_shipment_id?: string | null
          order_id: string
          status?: Database["public"]["Enums"]["delivery_status"]
          tracking_code: string
          tracking_url?: string | null
        }
        Update: {
          carrier?: string | null
          eta_date?: string | null
          id?: string
          melhor_envio_protocol?: string | null
          melhor_envio_shipment_id?: string | null
          order_id?: string
          status?: Database["public"]["Enums"]["delivery_status"]
          tracking_code?: string
          tracking_url?: string | null
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
      error_logs: {
        Row: {
          context: Json | null
          created_at: string
          id: string
          message: string
          source: string
          stack: string | null
          url: string | null
          user_agent: string | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          context?: Json | null
          created_at?: string
          id?: string
          message: string
          source: string
          stack?: string | null
          url?: string | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          context?: Json | null
          created_at?: string
          id?: string
          message?: string
          source?: string
          stack?: string | null
          url?: string | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "error_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_logs: {
        Row: {
          created_at: string
          direction: string
          duration_ms: number | null
          environment: string
          error_message: string | null
          id: string
          integration: string
          operation: string
          related_entity: string | null
          related_entity_id: string | null
          request_summary: Json | null
          response_summary: Json | null
          status: string
          status_http: number | null
        }
        Insert: {
          created_at?: string
          direction?: string
          duration_ms?: number | null
          environment: string
          error_message?: string | null
          id?: string
          integration: string
          operation: string
          related_entity?: string | null
          related_entity_id?: string | null
          request_summary?: Json | null
          response_summary?: Json | null
          status?: string
          status_http?: number | null
        }
        Update: {
          created_at?: string
          direction?: string
          duration_ms?: number | null
          environment?: string
          error_message?: string | null
          id?: string
          integration?: string
          operation?: string
          related_entity?: string | null
          related_entity_id?: string | null
          request_summary?: Json | null
          response_summary?: Json | null
          status?: string
          status_http?: number | null
        }
        Relationships: []
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
      melhor_envio_settings: {
        Row: {
          access_token: string | null
          client_id: string | null
          client_secret: string | null
          connected_at: string | null
          connected_by: string | null
          id: string
          redirect_uri: string | null
          refresh_token: string | null
          token_expires_at: string | null
          updated_at: string
        }
        Insert: {
          access_token?: string | null
          client_id?: string | null
          client_secret?: string | null
          connected_at?: string | null
          connected_by?: string | null
          id?: string
          redirect_uri?: string | null
          refresh_token?: string | null
          token_expires_at?: string | null
          updated_at?: string
        }
        Update: {
          access_token?: string | null
          client_id?: string | null
          client_secret?: string | null
          connected_at?: string | null
          connected_by?: string | null
          id?: string
          redirect_uri?: string | null
          refresh_token?: string | null
          token_expires_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "melhor_envio_settings_connected_by_fkey"
            columns: ["connected_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
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
      order_payments: {
        Row: {
          amount: number
          asaas_payment_id: string | null
          boleto_barcode: string | null
          boleto_url: string | null
          confirmed_at: string | null
          created_at: string
          due_date: string | null
          id: string
          installment_count: number
          invoice_url: string | null
          order_id: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          pix_copy_paste: string | null
          pix_qr_code: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          asaas_payment_id?: string | null
          boleto_barcode?: string | null
          boleto_url?: string | null
          confirmed_at?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          installment_count?: number
          invoice_url?: string | null
          order_id: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          pix_copy_paste?: string | null
          pix_qr_code?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          asaas_payment_id?: string | null
          boleto_barcode?: string | null
          boleto_url?: string | null
          confirmed_at?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          installment_count?: number
          invoice_url?: string | null
          order_id?: string
          payment_method?: Database["public"]["Enums"]["payment_method"]
          pix_copy_paste?: string | null
          pix_qr_code?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
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
          deleted_at: string | null
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
          deleted_at?: string | null
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
          deleted_at?: string | null
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
          package_height_cm: number | null
          package_length_cm: number | null
          package_width_cm: number | null
          price_per_meter: number
          sku: string
          slug: string
          status: Database["public"]["Enums"]["product_status"]
          stock_meters: number
          tag: string | null
          updated_at: string
          weight_grams: number | null
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
          package_height_cm?: number | null
          package_length_cm?: number | null
          package_width_cm?: number | null
          price_per_meter: number
          sku: string
          slug: string
          status?: Database["public"]["Enums"]["product_status"]
          stock_meters?: number
          tag?: string | null
          updated_at?: string
          weight_grams?: number | null
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
          package_height_cm?: number | null
          package_length_cm?: number | null
          package_width_cm?: number | null
          price_per_meter?: number
          sku?: string
          slug?: string
          status?: Database["public"]["Enums"]["product_status"]
          stock_meters?: number
          tag?: string | null
          updated_at?: string
          weight_grams?: number | null
          width_m?: number
        }
        Relationships: []
      }
      rate_limit_attempts: {
        Row: {
          created_at: string
          endpoint: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          endpoint: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          endpoint?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      rate_limit_attempts_anon: {
        Row: {
          created_at: string
          endpoint: string
          id: string
          identifier: string
        }
        Insert: {
          created_at?: string
          endpoint: string
          id?: string
          identifier: string
        }
        Update: {
          created_at?: string
          endpoint?: string
          id?: string
          identifier?: string
        }
        Relationships: []
      }
      refunds: {
        Row: {
          amount: number
          asaas_refund_id: string | null
          created_at: string
          id: string
          order_id: string
          reason: string
          requested_by: string | null
          requested_by_name: string
        }
        Insert: {
          amount: number
          asaas_refund_id?: string | null
          created_at?: string
          id?: string
          order_id: string
          reason: string
          requested_by?: string | null
          requested_by_name: string
        }
        Update: {
          amount?: number
          asaas_refund_id?: string | null
          created_at?: string
          id?: string
          order_id?: string
          reason?: string
          requested_by?: string | null
          requested_by_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "refunds_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refunds_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      resend_settings: {
        Row: {
          api_key: string | null
          connected_at: string | null
          connected_by: string | null
          contact_notification_email: string | null
          from_email: string | null
          from_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          api_key?: string | null
          connected_at?: string | null
          connected_by?: string | null
          contact_notification_email?: string | null
          from_email?: string | null
          from_name?: string | null
          id?: string
          updated_at?: string
        }
        Update: {
          api_key?: string | null
          connected_at?: string | null
          connected_by?: string | null
          contact_notification_email?: string | null
          from_email?: string | null
          from_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "resend_settings_connected_by_fkey"
            columns: ["connected_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
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
      saved_credit_cards: {
        Row: {
          brand: string | null
          created_at: string
          credit_card_token: string
          id: string
          last_four_digits: string
          user_id: string
        }
        Insert: {
          brand?: string | null
          created_at?: string
          credit_card_token: string
          id?: string
          last_four_digits: string
          user_id: string
        }
        Update: {
          brand?: string | null
          created_at?: string
          credit_card_token?: string
          id?: string
          last_four_digits?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_credit_cards_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      shipping_quotes: {
        Row: {
          created_at: string
          destination_zip: string
          expires_at: string
          id: string
          options: Json
        }
        Insert: {
          created_at?: string
          destination_zip: string
          expires_at?: string
          id?: string
          options: Json
        }
        Update: {
          created_at?: string
          destination_zip?: string
          expires_at?: string
          id?: string
          options?: Json
        }
        Relationships: []
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
          asaas_customer_id: string | null
          cpf: string | null
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
          asaas_customer_id?: string | null
          cpf?: string | null
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
          asaas_customer_id?: string | null
          cpf?: string | null
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
      asaas_secrets_configured: {
        Args: never
        Returns: {
          api_key_configured: boolean
          webhook_token_configured: boolean
        }[]
      }
      check_and_record_rate_limit: {
        Args: {
          p_endpoint: string
          p_max_attempts: number
          p_user_id: string
          p_window_seconds: number
        }
        Returns: boolean
      }
      check_and_record_rate_limit_by_ip: {
        Args: {
          p_endpoint: string
          p_identifier: string
          p_max_attempts: number
          p_window_seconds: number
        }
        Returns: boolean
      }
      create_order: {
        Args: {
          p_coupon_id?: string
          p_items?: Json
          p_payment_method: Database["public"]["Enums"]["payment_method"]
          p_shipping_address_id: string
          p_shipping_cost?: number
          p_shipping_quote_id?: string
          p_shipping_service_id?: number
        }
        Returns: {
          id: string
          order_number: string
        }[]
      }
      current_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      decrement_coupon_usage: {
        Args: { p_coupon_id: string }
        Returns: undefined
      }
      delete_order: { Args: { p_order_id: string }; Returns: undefined }
      increment_coupon_usage: {
        Args: { p_coupon_id: string }
        Returns: undefined
      }
      log_failed_login: { Args: { p_email: string }; Returns: undefined }
      log_login: { Args: never; Returns: undefined }
      log_logout: { Args: never; Returns: undefined }
      melhor_envio_secret_configured: { Args: never; Returns: boolean }
      resend_secrets_configured: {
        Args: never
        Returns: {
          api_key_configured: boolean
          from_email_configured: boolean
        }[]
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
      order_status:
        | "pending"
        | "paid"
        | "shipping"
        | "delivered"
        | "cancelled"
        | "refunded"
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
      order_status: [
        "pending",
        "paid",
        "shipping",
        "delivered",
        "cancelled",
        "refunded",
      ],
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
