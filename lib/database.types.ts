export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          avatar_url: string | null;
          about: string | null;
          website: string | null;
          karma: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          username: string;
          avatar_url?: string | null;
          about?: string | null;
          website?: string | null;
          karma?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          username?: string;
          avatar_url?: string | null;
          about?: string | null;
          website?: string | null;
          karma?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      webauthn_credentials: {
        Row: {
          id: string;
          user_id: string;
          credential_id: string;
          public_key: string;
          sign_count: number;
          transports: string[] | null;
          device_label: string | null;
          created_at: string;
          last_used_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          credential_id: string;
          public_key: string;
          sign_count?: number;
          transports?: string[] | null;
          device_label?: string | null;
          created_at?: string;
          last_used_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          credential_id?: string;
          public_key?: string;
          sign_count?: number;
          transports?: string[] | null;
          device_label?: string | null;
          created_at?: string;
          last_used_at?: string | null;
        };
        Relationships: [];
      };
      username_reservations: {
        Row: {
          username: string;
          reserved_until: string;
          session_token: string;
        };
        Insert: {
          username: string;
          reserved_until: string;
          session_token: string;
        };
        Update: {
          username?: string;
          reserved_until?: string;
          session_token?: string;
        };
        Relationships: [];
      };
      pages: {
        Row: {
          id: string;
          canonical_url: string;
          url: string | null;
          title: string | null;
          description: string | null;
          favicon_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          canonical_url: string;
          url?: string | null;
          title?: string | null;
          description?: string | null;
          favicon_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          canonical_url?: string;
          url?: string | null;
          title?: string | null;
          description?: string | null;
          favicon_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      messages: {
        Row: {
          id: string;
          page_id: string;
          author_id: string;
          parent_id: string | null;
          body: string;
          gif_url: string | null;
          score: number;
          upvotes: number;
          downvotes: number;
          deleted_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          page_id: string;
          author_id: string;
          parent_id?: string | null;
          body: string;
          gif_url?: string | null;
          score?: number;
          upvotes?: number;
          downvotes?: number;
          deleted_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          page_id?: string;
          author_id?: string;
          parent_id?: string | null;
          body?: string;
          gif_url?: string | null;
          score?: number;
          upvotes?: number;
          downvotes?: number;
          deleted_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'messages_author_id_fkey';
            columns: ['author_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'messages_page_id_fkey';
            columns: ['page_id'];
            isOneToOne: false;
            referencedRelation: 'pages';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'messages_parent_id_fkey';
            columns: ['parent_id'];
            isOneToOne: false;
            referencedRelation: 'messages';
            referencedColumns: ['id'];
          },
        ];
      };
      message_translations: {
        Row: {
          message_id: string;
          locale: string;
          body: string;
          created_at: string;
        };
        Insert: {
          message_id: string;
          locale: string;
          body: string;
          created_at?: string;
        };
        Update: {
          message_id?: string;
          locale?: string;
          body?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'message_translations_message_id_fkey';
            columns: ['message_id'];
            isOneToOne: false;
            referencedRelation: 'messages';
            referencedColumns: ['id'];
          },
        ];
      };
      votes: {
        Row: {
          message_id: string;
          user_id: string;
          value: number;
        };
        Insert: {
          message_id: string;
          user_id: string;
          value: number;
        };
        Update: {
          message_id?: string;
          user_id?: string;
          value?: number;
        };
        Relationships: [];
      };
      reports: {
        Row: {
          id: string;
          message_id: string;
          reporter_id: string;
          reason: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          message_id: string;
          reporter_id: string;
          reason?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          message_id?: string;
          reporter_id?: string;
          reason?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          recipient_id: string;
          actor_id: string;
          message_id: string;
          parent_id: string;
          page_id: string;
          page_url: string;
          body_preview: string;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          recipient_id: string;
          actor_id: string;
          message_id: string;
          parent_id: string;
          page_id: string;
          page_url: string;
          body_preview: string;
          read_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          recipient_id?: string;
          actor_id?: string;
          message_id?: string;
          parent_id?: string;
          page_id?: string;
          page_url?: string;
          body_preview?: string;
          read_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'notifications_actor_id_fkey';
            columns: ['actor_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'notifications_page_id_fkey';
            columns: ['page_id'];
            isOneToOne: false;
            referencedRelation: 'pages';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'notifications_recipient_id_fkey';
            columns: ['recipient_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      rate_limits: {
        Row: {
          user_id: string;
          action: string;
          window_start: string;
          count: number;
        };
        Insert: {
          user_id: string;
          action: string;
          window_start?: string;
          count?: number;
        };
        Update: {
          user_id?: string;
          action?: string;
          window_start?: string;
          count?: number;
        };
        Relationships: [];
      };
      webauthn_challenges: {
        Row: {
          id: string;
          challenge: string;
          user_id: string | null;
          username: string | null;
          expires_at: string;
        };
        Insert: {
          id: string;
          challenge: string;
          user_id?: string | null;
          username?: string | null;
          expires_at: string;
        };
        Update: {
          id?: string;
          challenge?: string;
          user_id?: string | null;
          username?: string | null;
          expires_at?: string;
        };
        Relationships: [];
      };
      page_presence: {
        Row: {
          user_id: string;
          canonical_url: string;
          last_seen: string;
        };
        Insert: {
          user_id: string;
          canonical_url: string;
          last_seen?: string;
        };
        Update: {
          user_id?: string;
          canonical_url?: string;
          last_seen?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'page_presence_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: true;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      page_online_counts: {
        Row: {
          canonical_url: string;
          online_count: number;
          updated_at: string;
        };
        Insert: {
          canonical_url: string;
          online_count: number;
          updated_at?: string;
        };
        Update: {
          canonical_url?: string;
          online_count?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      themes: {
        Row: {
          id: string;
          slug: string;
          name: string;
          author_name: string;
          font_family: string;
          tokens: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          author_name: string;
          font_family?: string;
          tokens: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          name?: string;
          author_name?: string;
          font_family?: string;
          tokens?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      trending_pages: {
        Row: {
          id: string;
          canonical_url: string;
          url: string | null;
          title: string | null;
          description: string | null;
          favicon_url: string | null;
          message_count: number;
          post_count: number;
        };
        Relationships: [];
      };
      active_pages: {
        Row: {
          id: string;
          canonical_url: string;
          url: string | null;
          title: string | null;
          description: string | null;
          favicon_url: string | null;
          message_count: number;
          post_count: number;
          last_active_at: string;
        };
        Relationships: [];
      };
    };
    Functions: {
      check_username_available: {
        Args: { p_username: string; p_session_token?: string | null };
        Returns: boolean;
      };
      reserve_username: {
        Args: { p_username: string; p_session_token: string };
        Returns: boolean;
      };
      release_username: {
        Args: { p_username: string; p_session_token: string };
        Returns: boolean;
      };
      check_rate_limit: {
        Args: { p_action: string };
        Returns: boolean;
      };
      delete_own_message: {
        Args: { p_message_id: string };
        Returns: string;
      };
      leaderboard: {
        Args: { p_limit?: number; p_offset?: number };
        Returns: {
          rank: number;
          username: string;
          avatar_url: string | null;
          karma: number;
          is_me: boolean;
        }[];
      };
      touch_page_presence: {
        Args: { p_canonical_url: string };
        Returns: undefined;
      };
      clear_page_presence: {
        Args: Record<string, never>;
        Returns: undefined;
      };
      page_online_counts: {
        Args: { p_canonical_urls: string[] };
        Returns: {
          canonical_url: string;
          online_count: number;
        }[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Page = Database['public']['Tables']['pages']['Row'];
export type Message = Database['public']['Tables']['messages']['Row'];
export type Vote = Database['public']['Tables']['votes']['Row'];
export type Notification = Database['public']['Tables']['notifications']['Row'];
export type WebAuthnCredential =
  Database['public']['Tables']['webauthn_credentials']['Row'];

export type MessageWithAuthor = Message & {
  author: Pick<Profile, 'id' | 'username' | 'avatar_url' | 'karma'> | null;
};

export type NotificationWithJoins = Notification & {
  actor: Pick<Profile, 'id' | 'username' | 'avatar_url'> | null;
  page: Pick<
    Page,
    'id' | 'canonical_url' | 'url' | 'title' | 'description' | 'favicon_url'
  > | null;
};

export type ActivityItem = Message & {
  page: Pick<
    Page,
    'id' | 'canonical_url' | 'url' | 'title' | 'description' | 'favicon_url'
  > | null;
};

export interface MessageNode extends MessageWithAuthor {
  children: MessageNode[];
  myVote: number | null;
}

export type SortMode = 'best' | 'new';

export type PanelTab =
  | 'chat'
  | 'explore'
  | 'leaderboard'
  | 'notifications'
  | 'profile'
  | 'settings';

export interface TabInfo {
  tabId: number | null;
  url: string | null;
  title: string | null;
  favIconUrl: string | null;
  canonicalUrl: string | null;
  focusMessageId: string | null;
  host: string | null;
}

export interface SessionUser {
  id: string;
  username: string;
  avatar_url: string | null;
  about?: string | null;
  website?: string | null;
  karma: number;
  token: string;
  expiresAt: number;
}
