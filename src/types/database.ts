
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {

  "public": {
          Tables: {
            "activity_events": {
                  Row: {
                    "action": string,"created_at": string,"id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "action": string,"created_at"?: string,"id"?: string,"user_id": string
                  }
                  Update: {
                    "action"?: string,"created_at"?: string,"id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "activity_events_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"cnpj_queries": {
                  Row: {
                    "cnpj": string,"company_id": string | null,"created_at": string,"from_cache": boolean,"id": string,"outcome": string,"provider": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "cnpj": string,"company_id"?: string | null,"created_at"?: string,"from_cache"?: boolean,"id"?: string,"outcome": string,"provider": string,"user_id": string
                  }
                  Update: {
                    "cnpj"?: string,"company_id"?: string | null,"created_at"?: string,"from_cache"?: boolean,"id"?: string,"outcome"?: string,"provider"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "cnpj_queries_user_id_company_id_fkey"
      columns: ["user_id","company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["user_id","id"]
    },{
      foreignKeyName: "cnpj_queries_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"companies": {
                  Row: {
                    "cnpj": string,"created_at": string,"data": NonNullable<Json>,"expires_at": string,"id": string,"ie_result": NonNullable<Json>,"is_favorite": boolean,"legal_name": string,"queried_at": string,"registration_status": string | null,"sources": NonNullable<Json>,"trade_name": string | null,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "cnpj": string,"created_at"?: string,"data"?: NonNullable<Json>,"expires_at": string,"id"?: string,"ie_result"?: NonNullable<Json>,"is_favorite"?: boolean,"legal_name": string,"queried_at"?: string,"registration_status"?: string | null,"sources"?: NonNullable<Json>,"trade_name"?: string | null,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "cnpj"?: string,"created_at"?: string,"data"?: NonNullable<Json>,"expires_at"?: string,"id"?: string,"ie_result"?: NonNullable<Json>,"is_favorite"?: boolean,"legal_name"?: string,"queried_at"?: string,"registration_status"?: string | null,"sources"?: NonNullable<Json>,"trade_name"?: string | null,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "companies_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"fiscal_documents": {
                  Row: {
                    "access_key": string,"authorized_at": string | null,"base_status": string,"content_hash": string | null,"created_at": string,"data": NonNullable<Json>,"deleting": boolean,"discount_value": number,"emission_type": string | null,"environment": string,"evidence": NonNullable<Json>,"freight_value": number,"id": string,"import_id": string | null,"issued_at": string,"issuer": NonNullable<Json>,"issuer_tax_id": string,"issues": NonNullable<Json>,"layout_version": string,"model": string,"number": string,"operation_nature": string | null,"operation_type": string | null,"original_path": string | null,"other_totals": NonNullable<Json>,"product_value": number,"purpose": string | null,"recipient": NonNullable<Json>,"recipient_name": string | null,"recipient_tax_id": string | null,"series": string,"sha256": string | null,"status": string,"tax_totals": NonNullable<Json>,"total_value": number,"uf": string | null,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "access_key": string,"authorized_at"?: string | null,"base_status"?: string,"content_hash"?: string | null,"created_at"?: string,"data"?: NonNullable<Json>,"deleting"?: boolean,"discount_value"?: number,"emission_type"?: string | null,"environment": string,"evidence"?: NonNullable<Json>,"freight_value"?: number,"id"?: string,"import_id"?: string | null,"issued_at": string,"issuer"?: NonNullable<Json>,"issuer_tax_id": string,"issues"?: NonNullable<Json>,"layout_version": string,"model": string,"number": string,"operation_nature"?: string | null,"operation_type"?: string | null,"original_path"?: string | null,"other_totals"?: NonNullable<Json>,"product_value"?: number,"purpose"?: string | null,"recipient"?: NonNullable<Json>,"recipient_name"?: string | null,"recipient_tax_id"?: string | null,"series": string,"sha256"?: string | null,"status"?: string,"tax_totals"?: NonNullable<Json>,"total_value": number,"uf"?: string | null,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "access_key"?: string,"authorized_at"?: string | null,"base_status"?: string,"content_hash"?: string | null,"created_at"?: string,"data"?: NonNullable<Json>,"deleting"?: boolean,"discount_value"?: number,"emission_type"?: string | null,"environment"?: string,"evidence"?: NonNullable<Json>,"freight_value"?: number,"id"?: string,"import_id"?: string | null,"issued_at"?: string,"issuer"?: NonNullable<Json>,"issuer_tax_id"?: string,"issues"?: NonNullable<Json>,"layout_version"?: string,"model"?: string,"number"?: string,"operation_nature"?: string | null,"operation_type"?: string | null,"original_path"?: string | null,"other_totals"?: NonNullable<Json>,"product_value"?: number,"purpose"?: string | null,"recipient"?: NonNullable<Json>,"recipient_name"?: string | null,"recipient_tax_id"?: string | null,"series"?: string,"sha256"?: string | null,"status"?: string,"tax_totals"?: NonNullable<Json>,"total_value"?: number,"uf"?: string | null,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "fiscal_documents_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fiscal_documents_user_id_import_id_fkey"
      columns: ["user_id","import_id"]
isOneToOne: false
      referencedRelation: "xml_imports"
      referencedColumns: ["user_id","id"]
    }
                  ]
                },"fiscal_events": {
                  Row: {
                    "accepted": boolean,"access_key": string,"created_at": string,"environment": string,"event_type": string,"evidence": NonNullable<Json>,"id": string,"occurred_at": string | null,"original_path": string | null,"protocol": string | null,"registered_at": string | null,"sequence": number,"status_code": string | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "accepted"?: boolean,"access_key": string,"created_at"?: string,"environment": string,"event_type": string,"evidence": NonNullable<Json>,"id"?: string,"occurred_at"?: string | null,"original_path"?: string | null,"protocol"?: string | null,"registered_at"?: string | null,"sequence": number,"status_code"?: string | null,"user_id": string
                  }
                  Update: {
                    "accepted"?: boolean,"access_key"?: string,"created_at"?: string,"environment"?: string,"event_type"?: string,"evidence"?: NonNullable<Json>,"id"?: string,"occurred_at"?: string | null,"original_path"?: string | null,"protocol"?: string | null,"registered_at"?: string | null,"sequence"?: number,"status_code"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "fiscal_events_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"fiscal_items": {
                  Row: {
                    "cest": string | null,"cfop": string | null,"code": string | null,"created_at": string,"data": NonNullable<Json>,"description": string,"discount_value": number,"document_id": string,"gtin": string | null,"id": string,"item_number": number,"ncm": string | null,"quantity": number,"tax_situation": string | null,"taxes": NonNullable<Json>,"total_value": number,"unit": string | null,"unit_value": number,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "cest"?: string | null,"cfop"?: string | null,"code"?: string | null,"created_at"?: string,"data"?: NonNullable<Json>,"description": string,"discount_value"?: number,"document_id": string,"gtin"?: string | null,"id"?: string,"item_number": number,"ncm"?: string | null,"quantity": number,"tax_situation"?: string | null,"taxes"?: NonNullable<Json>,"total_value": number,"unit"?: string | null,"unit_value": number,"user_id": string
                  }
                  Update: {
                    "cest"?: string | null,"cfop"?: string | null,"code"?: string | null,"created_at"?: string,"data"?: NonNullable<Json>,"description"?: string,"discount_value"?: number,"document_id"?: string,"gtin"?: string | null,"id"?: string,"item_number"?: number,"ncm"?: string | null,"quantity"?: number,"tax_situation"?: string | null,"taxes"?: NonNullable<Json>,"total_value"?: number,"unit"?: string | null,"unit_value"?: number,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "fiscal_items_user_id_document_id_fkey"
      columns: ["user_id","document_id"]
isOneToOne: false
      referencedRelation: "fiscal_documents"
      referencedColumns: ["user_id","id"]
    },{
      foreignKeyName: "fiscal_items_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"fiscal_payments": {
                  Row: {
                    "change_value": number | null,"created_at": string,"data": NonNullable<Json>,"document_id": string,"id": string,"method": string,"user_id": string,"value": number
                  }
                  ComputedFields: never
                  Insert: {
                    "change_value"?: number | null,"created_at"?: string,"data"?: NonNullable<Json>,"document_id": string,"id"?: string,"method": string,"user_id": string,"value": number
                  }
                  Update: {
                    "change_value"?: number | null,"created_at"?: string,"data"?: NonNullable<Json>,"document_id"?: string,"id"?: string,"method"?: string,"user_id"?: string,"value"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "fiscal_payments_user_id_document_id_fkey"
      columns: ["user_id","document_id"]
isOneToOne: false
      referencedRelation: "fiscal_documents"
      referencedColumns: ["user_id","id"]
    },{
      foreignKeyName: "fiscal_payments_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"import_files": {
                  Row: {
                    "created_at": string,"document_id": string | null,"event_id": string | null,"filename": string,"id": string,"import_id": string,"message": string | null,"original_path": string | null,"outcome": string,"sha256": string,"source_data": NonNullable<Json>,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"document_id"?: string | null,"event_id"?: string | null,"filename": string,"id"?: string,"import_id": string,"message"?: string | null,"original_path"?: string | null,"outcome": string,"sha256": string,"source_data"?: NonNullable<Json>,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"document_id"?: string | null,"event_id"?: string | null,"filename"?: string,"id"?: string,"import_id"?: string,"message"?: string | null,"original_path"?: string | null,"outcome"?: string,"sha256"?: string,"source_data"?: NonNullable<Json>,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "import_files_user_id_document_id_fkey"
      columns: ["user_id","document_id"]
isOneToOne: false
      referencedRelation: "fiscal_documents"
      referencedColumns: ["user_id","id"]
    },{
      foreignKeyName: "import_files_user_id_event_id_fkey"
      columns: ["user_id","event_id"]
isOneToOne: false
      referencedRelation: "fiscal_events"
      referencedColumns: ["user_id","id"]
    },{
      foreignKeyName: "import_files_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "import_files_user_id_import_id_fkey"
      columns: ["user_id","import_id"]
isOneToOne: false
      referencedRelation: "xml_imports"
      referencedColumns: ["user_id","id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "created_at": string,"full_name": string,"id": string,"role": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"full_name": string,"id": string,"role"?: string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"full_name"?: string,"id"?: string,"role"?: string,"updated_at"?: string
                  }
                  Relationships: [

                  ]
                },"rejection_catalog": {
                  Row: {
                    "causes": NonNullable<Json>,"code": string,"corrections": NonNullable<Json>,"created_at": string,"description": string,"example": string | null,"explanation": string,"id": string,"models": (string)[],"reviewed_at": string,"search_vector": unknown,"title": string,"updated_at": string,"valid_from": string | null,"valid_until": string | null,"xml_fields": (string)[]
                  }
                  ComputedFields: never
                  Insert: {
                    "causes"?: NonNullable<Json>,"code": string,"corrections"?: NonNullable<Json>,"created_at"?: string,"description": string,"example"?: string | null,"explanation": string,"id"?: string,"models": (string)[],"reviewed_at": string,"search_vector"?: never,"title": string,"updated_at"?: string,"valid_from"?: string | null,"valid_until"?: string | null,"xml_fields"?: (string)[]
                  }
                  Update: {
                    "causes"?: NonNullable<Json>,"code"?: string,"corrections"?: NonNullable<Json>,"created_at"?: string,"description"?: string,"example"?: string | null,"explanation"?: string,"id"?: string,"models"?: (string)[],"reviewed_at"?: string,"search_vector"?: never,"title"?: string,"updated_at"?: string,"valid_from"?: string | null,"valid_until"?: string | null,"xml_fields"?: (string)[]
                  }
                  Relationships: [

                  ]
                },"rejection_favorites": {
                  Row: {
                    "created_at": string,"rejection_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"rejection_id": string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"rejection_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "rejection_favorites_rejection_id_fkey"
      columns: ["rejection_id"]
isOneToOne: false
      referencedRelation: "rejection_catalog"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "rejection_favorites_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"rejection_sources": {
                  Row: {
                    "id": string,"is_official": boolean,"publisher": string,"rejection_id": string,"reviewed_at": string,"title": string,"url": string
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: string,"is_official"?: boolean,"publisher": string,"rejection_id": string,"reviewed_at": string,"title": string,"url": string
                  }
                  Update: {
                    "id"?: string,"is_official"?: boolean,"publisher"?: string,"rejection_id"?: string,"reviewed_at"?: string,"title"?: string,"url"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "rejection_sources_rejection_id_fkey"
      columns: ["rejection_id"]
isOneToOne: false
      referencedRelation: "rejection_catalog"
      referencedColumns: ["id"]
    }
                  ]
                },"schema_versions": {
                  Row: {
                    "document_type": string,"id": string,"installed_at": string,"name": string,"sha256": string,"source_url": string,"valid_from": string | null,"valid_until": string | null,"version": string
                  }
                  ComputedFields: never
                  Insert: {
                    "document_type": string,"id"?: string,"installed_at"?: string,"name": string,"sha256": string,"source_url": string,"valid_from"?: string | null,"valid_until"?: string | null,"version": string
                  }
                  Update: {
                    "document_type"?: string,"id"?: string,"installed_at"?: string,"name"?: string,"sha256"?: string,"source_url"?: string,"valid_from"?: string | null,"valid_until"?: string | null,"version"?: string
                  }
                  Relationships: [

                  ]
                },"search_history": {
                  Row: {
                    "created_at": string,"id": string,"kind": string,"query": string,"result_id": string | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"kind": string,"query": string,"result_id"?: string | null,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"kind"?: string,"query"?: string,"result_id"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "search_history_result_id_fkey"
      columns: ["result_id"]
isOneToOne: false
      referencedRelation: "rejection_catalog"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "search_history_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"state_registrations": {
                  Row: {
                    "company_id": string,"created_at": string,"data": NonNullable<Json>,"id": string,"queried_at": string | null,"registration": string | null,"source_url": string,"status": string,"uf": string,"updated_at": string,"user_id": string,"verified": boolean
                  }
                  ComputedFields: never
                  Insert: {
                    "company_id": string,"created_at"?: string,"data"?: NonNullable<Json>,"id"?: string,"queried_at"?: string | null,"registration"?: string | null,"source_url": string,"status"?: string,"uf": string,"updated_at"?: string,"user_id": string,"verified"?: boolean
                  }
                  Update: {
                    "company_id"?: string,"created_at"?: string,"data"?: NonNullable<Json>,"id"?: string,"queried_at"?: string | null,"registration"?: string | null,"source_url"?: string,"status"?: string,"uf"?: string,"updated_at"?: string,"user_id"?: string,"verified"?: boolean
                  }
                  Relationships: [
                    {
      foreignKeyName: "state_registrations_user_id_company_id_fkey"
      columns: ["user_id","company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["user_id","id"]
    },{
      foreignKeyName: "state_registrations_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"user_settings": {
                  Row: {
                    "accent": string,"created_at": string,"theme": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "accent"?: string,"created_at"?: string,"theme"?: string,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "accent"?: string,"created_at"?: string,"theme"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "user_settings_user_id_fkey"
      columns: ["user_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"validation_issues": {
                  Row: {
                    "column_number": number | null,"created_at": string,"expected_value": string | null,"found_value": string | null,"id": string,"level": string,"line": number | null,"message": string,"reason": string | null,"rejection_code": string | null,"rule_id": string | null,"severity": string,"source": NonNullable<Json>,"suggestion": string | null,"tag": string | null,"user_id": string,"validation_id": string,"xpath": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "column_number"?: number | null,"created_at"?: string,"expected_value"?: string | null,"found_value"?: string | null,"id"?: string,"level": string,"line"?: number | null,"message": string,"reason"?: string | null,"rejection_code"?: string | null,"rule_id"?: string | null,"severity": string,"source"?: NonNullable<Json>,"suggestion"?: string | null,"tag"?: string | null,"user_id": string,"validation_id": string,"xpath"?: string | null
                  }
                  Update: {
                    "column_number"?: number | null,"created_at"?: string,"expected_value"?: string | null,"found_value"?: string | null,"id"?: string,"level"?: string,"line"?: number | null,"message"?: string,"reason"?: string | null,"rejection_code"?: string | null,"rule_id"?: string | null,"severity"?: string,"source"?: NonNullable<Json>,"suggestion"?: string | null,"tag"?: string | null,"user_id"?: string,"validation_id"?: string,"xpath"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "validation_issues_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "validation_issues_user_id_validation_id_fkey"
      columns: ["user_id","validation_id"]
isOneToOne: false
      referencedRelation: "xml_validations"
      referencedColumns: ["user_id","id"]
    }
                  ]
                },"xml_imports": {
                  Row: {
                    "created_at": string,"duplicate_files": number,"error_count": number,"errors": NonNullable<Json>,"id": string,"name": string,"processed_files": number,"status": string,"total_files": number,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"duplicate_files"?: number,"error_count"?: number,"errors"?: NonNullable<Json>,"id"?: string,"name": string,"processed_files"?: number,"status"?: string,"total_files"?: number,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"duplicate_files"?: number,"error_count"?: number,"errors"?: NonNullable<Json>,"id"?: string,"name"?: string,"processed_files"?: number,"status"?: string,"total_files"?: number,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "xml_imports_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"xml_validations": {
                  Row: {
                    "access_key": string | null,"checks_run": number,"created_at": string,"document_id": string | null,"document_type": string | null,"error_count": number,"id": string,"layout_version": string | null,"not_verified": NonNullable<Json>,"rules_result": string,"schema_id": string | null,"structural_result": string,"user_id": string,"warning_count": number,"xsd_result": string
                  }
                  ComputedFields: never
                  Insert: {
                    "access_key"?: string | null,"checks_run"?: number,"created_at"?: string,"document_id"?: string | null,"document_type"?: string | null,"error_count"?: number,"id"?: string,"layout_version"?: string | null,"not_verified"?: NonNullable<Json>,"rules_result": string,"schema_id"?: string | null,"structural_result": string,"user_id": string,"warning_count"?: number,"xsd_result": string
                  }
                  Update: {
                    "access_key"?: string | null,"checks_run"?: number,"created_at"?: string,"document_id"?: string | null,"document_type"?: string | null,"error_count"?: number,"id"?: string,"layout_version"?: string | null,"not_verified"?: NonNullable<Json>,"rules_result"?: string,"schema_id"?: string | null,"structural_result"?: string,"user_id"?: string,"warning_count"?: number,"xsd_result"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "xml_validations_schema_id_fkey"
      columns: ["schema_id"]
isOneToOne: false
      referencedRelation: "schema_versions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "xml_validations_user_id_document_id_fkey"
      columns: ["user_id","document_id"]
isOneToOne: false
      referencedRelation: "fiscal_documents"
      referencedColumns: ["user_id","id"]
    },{
      foreignKeyName: "xml_validations_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "consume_rate_limit":
{ Args: { "p_key": string,"p_limit": number,"p_window_seconds": number }; Returns: Json
                           },
"dashboard_summary":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"document_details":
{ Args: { "p_id": string }; Returns: Json
                           },
"document_report":
{ Args: { "p_export"?: boolean,"p_filters"?: Json,"p_page"?: number }; Returns: Json
                           },
"has_active_session":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"save_company_query":
{ Args: { "p_cnpj": string,"p_company": Json,"p_ie": Json,"p_ttl_seconds"?: number }; Returns: Json
                           },
"save_import_file":
{ Args: { "p_error"?: string,"p_filename": string,"p_import_id": string,"p_path"?: string,"p_payload": Json,"p_sha256": string }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "public": {
          Enums: {

          }
        }
} as const
