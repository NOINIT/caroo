export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Rol = 'mantelzorger' | 'oudere' | 'groepsbeheerder'

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          naam: string
          rol: Rol
          avatar_url: string | null
          aangemaakt_op: string
          bijgewerkt_op: string
        }
        Insert: {
          id: string
          email: string
          naam: string
          rol: Rol
          avatar_url?: string | null
        }
        Update: {
          naam?: string
          rol?: Rol
          avatar_url?: string | null
        }
      }
      zorggroepen: {
        Row: {
          id: string
          naam: string
          eigenaar_id: string
          betaald: boolean
          stripe_session_id: string | null
          aangemaakt_op: string
        }
        Insert: {
          naam: string
          eigenaar_id: string
          betaald?: boolean
          stripe_session_id?: string | null
        }
        Update: {
          naam?: string
          betaald?: boolean
          stripe_session_id?: string | null
        }
      }
      groepsleden: {
        Row: {
          id: string
          groep_id: string
          user_id: string
          rol: Rol
          toegevoegd_op: string
        }
        Insert: {
          groep_id: string
          user_id: string
          rol: Rol
        }
        Update: {
          rol?: Rol
        }
      }
      uitnodigingen: {
        Row: {
          id: string
          groep_id: string
          uitgenodigd_door: string
          email: string
          rol: Rol
          token: string
          gebruikt: boolean
          verloopt_op: string
          aangemaakt_op: string
        }
        Insert: {
          groep_id: string
          uitgenodigd_door: string
          email: string
          rol: Rol
          token: string
          verloopt_op: string
        }
        Update: {
          gebruikt?: boolean
        }
      }
      uitnodiging_log: {
        Row: {
          id: string
          user_id: string
          datum: string
          aantal: number
        }
        Insert: {
          user_id: string
          datum: string
          aantal?: number
        }
        Update: {
          aantal?: number
        }
      }
      taken: {
        Row: {
          id: string
          groep_id: string
          titel: string
          beschrijving: string | null
          toegewezen_aan: string | null
          voltooid: boolean
          deadline: string | null
          aangemaakt_door: string
          aangemaakt_op: string
        }
        Insert: {
          groep_id: string
          titel: string
          beschrijving?: string | null
          toegewezen_aan?: string | null
          deadline?: string | null
          aangemaakt_door: string
        }
        Update: {
          titel?: string
          beschrijving?: string | null
          toegewezen_aan?: string | null
          voltooid?: boolean
          deadline?: string | null
        }
      }
      afspraken: {
        Row: {
          id: string
          groep_id: string
          titel: string
          beschrijving: string | null
          start_tijd: string
          eind_tijd: string | null
          categorie_id: string | null
          aangemaakt_door: string
          aangemaakt_op: string
        }
        Insert: {
          groep_id: string
          titel: string
          beschrijving?: string | null
          start_tijd: string
          eind_tijd?: string | null
          categorie_id?: string | null
          aangemaakt_door: string
        }
        Update: {
          titel?: string
          beschrijving?: string | null
          start_tijd?: string
          eind_tijd?: string | null
          categorie_id?: string | null
        }
      }
      agenda_categorieen: {
        Row: {
          id: string
          groep_id: string
          naam: string
          kleur: string
          systeem: boolean
          aangemaakt_door: string | null
        }
        Insert: {
          groep_id: string
          naam: string
          kleur: string
          systeem?: boolean
          aangemaakt_door?: string | null
        }
        Update: {
          naam?: string
          kleur?: string
        }
      }
      medicijnen: {
        Row: {
          id: string
          groep_id: string
          naam: string
          dosering: string
          tijdstippen: string[]
          opmerkingen: string | null
          actief: boolean
          aangemaakt_door: string
          aangemaakt_op: string
        }
        Insert: {
          groep_id: string
          naam: string
          dosering: string
          tijdstippen: string[]
          opmerkingen?: string | null
          aangemaakt_door: string
        }
        Update: {
          naam?: string
          dosering?: string
          tijdstippen?: string[]
          opmerkingen?: string | null
          actief?: boolean
        }
      }
      medicijn_registraties: {
        Row: {
          id: string
          medicijn_id: string
          groep_id: string
          datum: string
          tijdstip: string
          ingenomen: boolean
          geregistreerd_door: string
          geregistreerd_op: string
        }
        Insert: {
          medicijn_id: string
          groep_id: string
          datum: string
          tijdstip: string
          ingenomen: boolean
          geregistreerd_door: string
        }
        Update: {
          ingenomen?: boolean
        }
      }
      dagboek: {
        Row: {
          id: string
          groep_id: string
          auteur_id: string
          inhoud: string
          gesproken: boolean
          aangemaakt_op: string
        }
        Insert: {
          groep_id: string
          auteur_id: string
          inhoud: string
          gesproken?: boolean
        }
        Update: {
          inhoud?: string
        }
      }
      tips: {
        Row: {
          id: string
          groep_id: string
          auteur_id: string
          tekst: string
          buurt_delen: boolean
          aangemaakt_op: string
        }
        Insert: {
          groep_id: string
          auteur_id: string
          tekst: string
          buurt_delen?: boolean
        }
        Update: {
          tekst?: string
          buurt_delen?: boolean
        }
      }
      fotos: {
        Row: {
          id: string
          groep_id: string
          uploader_id: string
          opslag_pad: string
          onderschrift: string | null
          aangemaakt_op: string
        }
        Insert: {
          groep_id: string
          uploader_id: string
          opslag_pad: string
          onderschrift?: string | null
        }
        Update: {
          onderschrift?: string | null
        }
      }
    }
    Views: {}
    Functions: {}
    Enums: {
      rol: 'mantelzorger' | 'oudere' | 'groepsbeheerder'
    }
  }
}
