# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.1].define(version: 2026_11_08_170001) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "pg_catalog.plpgsql"

  create_table "active_storage_attachments", force: :cascade do |t|
    t.string "name", null: false
    t.string "record_type", null: false
    t.bigint "record_id", null: false
    t.bigint "blob_id", null: false
    t.datetime "created_at", null: false
    t.index ["blob_id"], name: "index_active_storage_attachments_on_blob_id"
    t.index ["record_type", "record_id", "name", "blob_id"], name: "index_active_storage_attachments_uniqueness", unique: true
  end

  create_table "active_storage_blobs", force: :cascade do |t|
    t.string "key", null: false
    t.string "filename", null: false
    t.string "content_type"
    t.text "metadata"
    t.string "service_name", null: false
    t.bigint "byte_size", null: false
    t.string "checksum"
    t.datetime "created_at", null: false
    t.index ["key"], name: "index_active_storage_blobs_on_key", unique: true
  end

  create_table "active_storage_variant_records", force: :cascade do |t|
    t.bigint "blob_id", null: false
    t.string "variation_digest", null: false
    t.index ["blob_id", "variation_digest"], name: "index_active_storage_variant_records_uniqueness", unique: true
  end

  create_table "agent_activities", force: :cascade do |t|
    t.bigint "agent_token_id", null: false
    t.bigint "workspace_id", null: false
    t.string "action", null: false
    t.string "subject_type"
    t.bigint "subject_id"
    t.string "summary"
    t.datetime "created_at", null: false
    t.index ["agent_token_id"], name: "index_agent_activities_on_agent_token_id"
    t.index ["subject_type", "subject_id"], name: "index_agent_activities_on_subject_type_and_subject_id"
    t.index ["workspace_id", "created_at"], name: "index_agent_activities_on_workspace_id_and_created_at"
  end

  create_table "agent_tokens", force: :cascade do |t|
    t.bigint "workspace_id", null: false
    t.bigint "folder_id"
    t.bigint "created_by_id"
    t.string "name", null: false
    t.string "token_digest", null: false
    t.string "token_prefix", null: false
    t.integer "permission", default: 0, null: false
    t.datetime "revoked_at"
    t.datetime "last_used_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["created_by_id"], name: "index_agent_tokens_on_created_by_id"
    t.index ["folder_id"], name: "index_agent_tokens_on_folder_id"
    t.index ["token_digest"], name: "index_agent_tokens_on_token_digest", unique: true
    t.index ["workspace_id"], name: "index_agent_tokens_on_workspace_id"
  end

  create_table "ai_runs", force: :cascade do |t|
    t.bigint "workspace_id", null: false
    t.bigint "ai_worker_id", null: false
    t.bigint "task_id", null: false
    t.integer "status", default: 0, null: false
    t.text "output"
    t.text "error"
    t.datetime "started_at"
    t.datetime "finished_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.integer "input_tokens"
    t.integer "output_tokens"
    t.index ["ai_worker_id"], name: "index_ai_runs_on_ai_worker_id"
    t.index ["task_id"], name: "index_ai_runs_on_task_id"
    t.index ["workspace_id"], name: "index_ai_runs_on_workspace_id"
  end

  create_table "ai_workers", force: :cascade do |t|
    t.bigint "workspace_id", null: false
    t.string "name", null: false
    t.text "instructions"
    t.string "model", default: "claude-opus-5-5", null: false
    t.boolean "enabled", default: true, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["workspace_id"], name: "index_ai_workers_on_workspace_id"
  end

  create_table "baseline_tasks", force: :cascade do |t|
    t.bigint "baseline_id", null: false
    t.bigint "task_id", null: false
    t.date "start_date"
    t.date "due_date", null: false
    t.index ["baseline_id", "task_id"], name: "index_baseline_tasks_on_baseline_id_and_task_id", unique: true
    t.index ["baseline_id"], name: "index_baseline_tasks_on_baseline_id"
    t.index ["task_id"], name: "index_baseline_tasks_on_task_id"
  end

  create_table "baselines", force: :cascade do |t|
    t.bigint "workspace_id", null: false
    t.bigint "folder_id", null: false
    t.bigint "created_by_id"
    t.string "name", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["created_by_id"], name: "index_baselines_on_created_by_id"
    t.index ["folder_id"], name: "index_baselines_on_folder_id"
    t.index ["workspace_id"], name: "index_baselines_on_workspace_id"
  end

  create_table "documents", force: :cascade do |t|
    t.string "title", null: false
    t.json "content"
    t.integer "doc_type", default: 0, null: false
    t.bigint "folder_id", null: false
    t.bigint "created_by_id", null: false
    t.datetime "content_updated_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.boolean "pinned", default: false, null: false
    t.bigint "initiative_id"
    t.bigint "parent_feature_id"
    t.bigint "feature_owner_id"
    t.integer "feature_status"
    t.bigint "epic_id"
    t.bigint "milestone_id"
    t.index ["created_by_id"], name: "index_documents_on_created_by_id"
    t.index ["doc_type"], name: "index_documents_on_doc_type"
    t.index ["epic_id"], name: "index_documents_on_epic_id"
    t.index ["feature_owner_id"], name: "index_documents_on_feature_owner_id"
    t.index ["folder_id"], name: "index_documents_on_folder_id"
    t.index ["initiative_id"], name: "index_documents_on_initiative_id"
    t.index ["milestone_id"], name: "index_documents_on_milestone_id"
    t.index ["parent_feature_id"], name: "index_documents_on_parent_feature_id"
  end

  create_table "epics", force: :cascade do |t|
    t.string "title", null: false
    t.bigint "workspace_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.bigint "folder_id"
    t.date "start_date"
    t.date "target_date"
    t.bigint "initiative_id"
    t.bigint "milestone_id"
    t.integer "horizon"
    t.integer "position", default: 0, null: false
    t.index ["folder_id"], name: "index_epics_on_folder_id"
    t.index ["initiative_id"], name: "index_epics_on_initiative_id"
    t.index ["milestone_id"], name: "index_epics_on_milestone_id"
    t.index ["workspace_id"], name: "index_epics_on_workspace_id"
  end

  create_table "event_tasks", force: :cascade do |t|
    t.bigint "event_id", null: false
    t.bigint "task_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["event_id", "task_id"], name: "index_event_tasks_on_event_id_and_task_id", unique: true
    t.index ["event_id"], name: "index_event_tasks_on_event_id"
    t.index ["task_id"], name: "index_event_tasks_on_task_id"
  end

  create_table "events", force: :cascade do |t|
    t.string "title", null: false
    t.text "description"
    t.date "date", null: false
    t.integer "event_type", default: 0, null: false
    t.bigint "workspace_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.time "start_time"
    t.time "end_time"
    t.bigint "folder_id"
    t.index ["folder_id"], name: "index_events_on_folder_id"
    t.index ["workspace_id", "date"], name: "index_events_on_workspace_id_and_date"
    t.index ["workspace_id"], name: "index_events_on_workspace_id"
  end

  create_table "folders", force: :cascade do |t|
    t.string "name", null: false
    t.bigint "workspace_id", null: false
    t.bigint "parent_id"
    t.integer "position", default: 0
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.boolean "pinned", default: false, null: false
    t.datetime "archived_at"
    t.integer "kind", default: 0, null: false
    t.integer "dependency_mode", default: 0, null: false
    t.bigint "owner_id"
    t.integer "project_status", default: 0, null: false
    t.date "start_date"
    t.date "target_date"
    t.text "description"
    t.bigint "home_document_id"
    t.string "icon"
    t.string "image_url"
    t.index ["home_document_id"], name: "index_folders_on_home_document_id"
    t.index ["owner_id"], name: "index_folders_on_owner_id"
    t.index ["parent_id"], name: "index_folders_on_parent_id"
    t.index ["workspace_id"], name: "index_folders_on_workspace_id"
  end

  create_table "ideas", force: :cascade do |t|
    t.bigint "workspace_id", null: false
    t.bigint "submitted_by_id"
    t.string "title", null: false
    t.text "description"
    t.integer "status", default: 0, null: false
    t.string "promoted_type"
    t.bigint "promoted_id"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.bigint "folder_id"
    t.index ["folder_id"], name: "index_ideas_on_folder_id"
    t.index ["submitted_by_id"], name: "index_ideas_on_submitted_by_id"
    t.index ["workspace_id"], name: "index_ideas_on_workspace_id"
  end

  create_table "initiatives", force: :cascade do |t|
    t.string "title", null: false
    t.bigint "workspace_id", null: false
    t.date "start_date"
    t.date "target_date"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.bigint "milestone_id"
    t.text "description"
    t.integer "status", default: 0, null: false
    t.bigint "owner_id"
    t.integer "horizon"
    t.integer "position", default: 0, null: false
    t.bigint "folder_id"
    t.index ["folder_id"], name: "index_initiatives_on_folder_id"
    t.index ["milestone_id"], name: "index_initiatives_on_milestone_id"
    t.index ["owner_id"], name: "index_initiatives_on_owner_id"
    t.index ["workspace_id"], name: "index_initiatives_on_workspace_id"
  end

  create_table "io_nodes", force: :cascade do |t|
    t.bigint "workspace_id", null: false
    t.bigint "parent_id"
    t.integer "kind", default: 0, null: false
    t.string "title", null: false
    t.text "description"
    t.integer "position", default: 0, null: false
    t.bigint "objective_id"
    t.bigint "initiative_id"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.bigint "folder_id"
    t.index ["folder_id"], name: "index_io_nodes_on_folder_id"
    t.index ["initiative_id"], name: "index_io_nodes_on_initiative_id"
    t.index ["objective_id"], name: "index_io_nodes_on_objective_id"
    t.index ["parent_id"], name: "index_io_nodes_on_parent_id"
    t.index ["workspace_id"], name: "index_io_nodes_on_workspace_id"
  end

  create_table "jwt_denylists", force: :cascade do |t|
    t.string "jti", null: false
    t.datetime "exp", null: false
    t.index ["jti"], name: "index_jwt_denylists_on_jti", unique: true
  end

  create_table "key_result_check_ins", force: :cascade do |t|
    t.bigint "key_result_id", null: false
    t.bigint "author_id"
    t.decimal "value", precision: 15, scale: 2, null: false
    t.text "note"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["author_id"], name: "index_key_result_check_ins_on_author_id"
    t.index ["key_result_id"], name: "index_key_result_check_ins_on_key_result_id"
  end

  create_table "key_results", force: :cascade do |t|
    t.bigint "objective_id", null: false
    t.string "title", null: false
    t.bigint "initiative_id"
    t.decimal "start_value", precision: 15, scale: 2, default: "0.0", null: false
    t.decimal "target_value", precision: 15, scale: 2
    t.decimal "current_value", precision: 15, scale: 2, default: "0.0", null: false
    t.string "unit"
    t.integer "position", default: 0, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["initiative_id"], name: "index_key_results_on_initiative_id"
    t.index ["objective_id"], name: "index_key_results_on_objective_id"
  end

  create_table "milestones", force: :cascade do |t|
    t.bigint "workspace_id", null: false
    t.bigint "folder_id"
    t.bigint "owner_id"
    t.string "title", null: false
    t.text "description"
    t.date "target_date"
    t.integer "status", default: 0, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["folder_id"], name: "index_milestones_on_folder_id"
    t.index ["owner_id"], name: "index_milestones_on_owner_id"
    t.index ["workspace_id"], name: "index_milestones_on_workspace_id"
  end

  create_table "notifications", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.bigint "workspace_id", null: false
    t.string "kind", null: false
    t.string "title", null: false
    t.text "body"
    t.string "subject_type"
    t.bigint "subject_id"
    t.datetime "read_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["user_id", "read_at"], name: "index_notifications_on_user_id_and_read_at"
    t.index ["user_id"], name: "index_notifications_on_user_id"
    t.index ["workspace_id"], name: "index_notifications_on_workspace_id"
  end

  create_table "objectives", force: :cascade do |t|
    t.string "title", null: false
    t.text "description"
    t.bigint "workspace_id", null: false
    t.bigint "owner_id"
    t.integer "status", default: 0, null: false
    t.date "start_date"
    t.date "target_date"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.bigint "folder_id"
    t.index ["folder_id"], name: "index_objectives_on_folder_id"
    t.index ["owner_id"], name: "index_objectives_on_owner_id"
    t.index ["workspace_id"], name: "index_objectives_on_workspace_id"
  end

  create_table "paragraph_styles", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.string "name", null: false
    t.string "base", default: "body", null: false
    t.json "properties", default: {}, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["user_id", "name"], name: "index_paragraph_styles_on_user_id_and_name", unique: true
    t.index ["user_id"], name: "index_paragraph_styles_on_user_id"
  end

  create_table "project_requests", force: :cascade do |t|
    t.bigint "workspace_id", null: false
    t.bigint "requested_by_id"
    t.bigint "decided_by_id"
    t.bigint "project_id"
    t.string "name", null: false
    t.text "description"
    t.text "justification"
    t.integer "priority", default: 1, null: false
    t.date "start_date"
    t.date "target_date"
    t.integer "status", default: 0, null: false
    t.text "decision_note"
    t.datetime "decided_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["decided_by_id"], name: "index_project_requests_on_decided_by_id"
    t.index ["project_id"], name: "index_project_requests_on_project_id"
    t.index ["requested_by_id"], name: "index_project_requests_on_requested_by_id"
    t.index ["workspace_id"], name: "index_project_requests_on_workspace_id"
  end

  create_table "quip_imports", force: :cascade do |t|
    t.bigint "workspace_id", null: false
    t.bigint "destination_folder_id"
    t.integer "status", default: 0, null: false
    t.string "domain", null: false
    t.integer "folders_created", default: 0, null: false
    t.integer "documents_imported", default: 0, null: false
    t.integer "documents_failed", default: 0, null: false
    t.text "error_message"
    t.datetime "started_at"
    t.datetime "finished_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["destination_folder_id"], name: "index_quip_imports_on_destination_folder_id"
    t.index ["workspace_id"], name: "index_quip_imports_on_workspace_id"
  end

  create_table "resource_allocations", force: :cascade do |t|
    t.bigint "workspace_id", null: false
    t.bigint "user_id", null: false
    t.bigint "folder_id", null: false
    t.decimal "hours_per_week", precision: 5, scale: 2, null: false
    t.date "start_date"
    t.date "end_date"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["folder_id"], name: "index_resource_allocations_on_folder_id"
    t.index ["user_id"], name: "index_resource_allocations_on_user_id"
    t.index ["workspace_id"], name: "index_resource_allocations_on_workspace_id"
  end

  create_table "shares", force: :cascade do |t|
    t.string "token", null: false
    t.integer "permission", default: 0, null: false
    t.string "shareable_type", null: false
    t.bigint "shareable_id", null: false
    t.bigint "created_by_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["created_by_id"], name: "index_shares_on_created_by_id"
    t.index ["shareable_type", "shareable_id"], name: "index_shares_on_shareable"
    t.index ["token"], name: "index_shares_on_token", unique: true
  end

  create_table "social_identities", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.string "provider", null: false
    t.string "subject", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["provider", "subject"], name: "index_social_identities_on_provider_and_subject", unique: true
    t.index ["user_id"], name: "index_social_identities_on_user_id"
  end

  create_table "social_login_attempts", force: :cascade do |t|
    t.string "provider", null: false
    t.string "state_digest", null: false
    t.string "client_state", null: false
    t.string "code_challenge", null: false
    t.string "nonce", null: false
    t.string "provider_verifier", null: false
    t.bigint "user_id"
    t.string "exchange_digest"
    t.datetime "expires_at", null: false
    t.datetime "callback_at"
    t.datetime "exchanged_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["exchange_digest"], name: "index_social_login_attempts_on_exchange_digest", unique: true
    t.index ["expires_at"], name: "index_social_login_attempts_on_expires_at"
    t.index ["state_digest"], name: "index_social_login_attempts_on_state_digest", unique: true
    t.index ["user_id"], name: "index_social_login_attempts_on_user_id"
  end

  create_table "sprints", force: :cascade do |t|
    t.string "title", null: false
    t.text "goal"
    t.bigint "workspace_id", null: false
    t.bigint "owner_id"
    t.integer "status", default: 0, null: false
    t.date "start_date"
    t.date "end_date"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.bigint "folder_id"
    t.index ["folder_id"], name: "index_sprints_on_folder_id"
    t.index ["owner_id"], name: "index_sprints_on_owner_id"
    t.index ["workspace_id"], name: "index_sprints_on_workspace_id"
  end

  create_table "table_cells", force: :cascade do |t|
    t.bigint "table_record_id", null: false
    t.bigint "table_field_id", null: false
    t.json "value"
    t.bigint "related_record_id"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["related_record_id"], name: "index_table_cells_on_related_record_id"
    t.index ["table_field_id"], name: "index_table_cells_on_table_field_id"
    t.index ["table_record_id", "table_field_id"], name: "index_table_cells_on_table_record_id_and_table_field_id", unique: true
    t.index ["table_record_id"], name: "index_table_cells_on_table_record_id"
  end

  create_table "table_fields", force: :cascade do |t|
    t.bigint "document_id", null: false
    t.string "name", null: false
    t.string "data_type", null: false
    t.bigint "relation_table_id"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.string "unit"
    t.text "formula"
    t.string "display_format"
    t.json "options"
    t.integer "next_number"
    t.index ["document_id", "name"], name: "index_table_fields_on_document_id_and_name", unique: true
    t.index ["document_id"], name: "index_table_fields_on_document_id"
    t.index ["relation_table_id"], name: "index_table_fields_on_relation_table_id"
  end

  create_table "table_records", force: :cascade do |t|
    t.bigint "document_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["document_id"], name: "index_table_records_on_document_id"
  end

  create_table "task_dependencies", force: :cascade do |t|
    t.bigint "workspace_id", null: false
    t.bigint "predecessor_id", null: false
    t.bigint "successor_id", null: false
    t.integer "kind", default: 0, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["predecessor_id", "successor_id"], name: "index_task_dependencies_on_predecessor_id_and_successor_id", unique: true
    t.index ["predecessor_id"], name: "index_task_dependencies_on_predecessor_id"
    t.index ["successor_id"], name: "index_task_dependencies_on_successor_id"
    t.index ["workspace_id"], name: "index_task_dependencies_on_workspace_id"
  end

  create_table "task_field_values", force: :cascade do |t|
    t.bigint "task_id", null: false
    t.bigint "task_field_id", null: false
    t.json "value", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["task_field_id"], name: "index_task_field_values_on_task_field_id"
    t.index ["task_id", "task_field_id"], name: "index_task_field_values_on_task_id_and_task_field_id", unique: true
    t.index ["task_id"], name: "index_task_field_values_on_task_id"
  end

  create_table "task_fields", force: :cascade do |t|
    t.bigint "workspace_id", null: false
    t.string "name", null: false
    t.string "field_type", null: false
    t.json "options", default: [], null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["workspace_id", "name"], name: "index_task_fields_on_workspace_id_and_name", unique: true
    t.index ["workspace_id"], name: "index_task_fields_on_workspace_id"
  end

  create_table "task_participants", force: :cascade do |t|
    t.bigint "task_id", null: false
    t.bigint "user_id", null: false
    t.integer "role", default: 0, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["task_id", "user_id", "role"], name: "index_task_participants_on_task_id_and_user_id_and_role", unique: true
    t.index ["task_id"], name: "index_task_participants_on_task_id"
    t.index ["user_id"], name: "index_task_participants_on_user_id"
  end

  create_table "task_status_changes", force: :cascade do |t|
    t.bigint "task_id", null: false
    t.bigint "changed_by_id"
    t.integer "from_status"
    t.integer "to_status", null: false
    t.datetime "created_at", null: false
    t.bigint "agent_token_id"
    t.index ["agent_token_id"], name: "index_task_status_changes_on_agent_token_id"
    t.index ["changed_by_id"], name: "index_task_status_changes_on_changed_by_id"
    t.index ["task_id", "created_at"], name: "index_task_status_changes_on_task_id_and_created_at"
    t.index ["task_id"], name: "index_task_status_changes_on_task_id"
  end

  create_table "task_status_settings", force: :cascade do |t|
    t.bigint "workspace_id", null: false
    t.bigint "folder_id"
    t.integer "status", null: false
    t.string "label"
    t.string "color"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["folder_id", "status"], name: "index_task_status_settings_on_folder_and_status", unique: true, where: "(folder_id IS NOT NULL)"
    t.index ["folder_id"], name: "index_task_status_settings_on_folder_id"
    t.index ["workspace_id", "status"], name: "index_task_status_settings_on_space_default", unique: true, where: "(folder_id IS NULL)"
    t.index ["workspace_id"], name: "index_task_status_settings_on_workspace_id"
  end

  create_table "tasks", force: :cascade do |t|
    t.string "title", null: false
    t.text "description"
    t.integer "status", default: 4, null: false
    t.date "start_date"
    t.date "due_date"
    t.integer "position", default: 0
    t.bigint "document_id"
    t.bigint "assignee_id"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.bigint "workspace_id", null: false
    t.bigint "epic_id"
    t.bigint "folder_id"
    t.bigint "parent_id"
    t.bigint "milestone_id"
    t.bigint "sprint_id"
    t.string "recurrence"
    t.integer "recurrence_from", default: 0, null: false
    t.integer "priority", default: 0, null: false
    t.decimal "estimate_hours", precision: 7, scale: 2
    t.integer "story_points"
    t.integer "actual_story_points"
    t.integer "kind", default: 0, null: false
    t.bigint "created_by_id"
    t.index ["assignee_id"], name: "index_tasks_on_assignee_id"
    t.index ["created_by_id"], name: "index_tasks_on_created_by_id"
    t.index ["document_id"], name: "index_tasks_on_document_id"
    t.index ["epic_id"], name: "index_tasks_on_epic_id"
    t.index ["folder_id"], name: "index_tasks_on_folder_id"
    t.index ["kind"], name: "index_tasks_on_kind"
    t.index ["milestone_id"], name: "index_tasks_on_milestone_id"
    t.index ["parent_id"], name: "index_tasks_on_parent_id"
    t.index ["sprint_id"], name: "index_tasks_on_sprint_id"
    t.index ["status"], name: "index_tasks_on_status"
    t.index ["workspace_id"], name: "index_tasks_on_workspace_id"
  end

  create_table "team_memberships", force: :cascade do |t|
    t.bigint "team_id", null: false
    t.bigint "user_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["team_id", "user_id"], name: "index_team_memberships_on_team_id_and_user_id", unique: true
    t.index ["team_id"], name: "index_team_memberships_on_team_id"
    t.index ["user_id"], name: "index_team_memberships_on_user_id"
  end

  create_table "teams", force: :cascade do |t|
    t.bigint "workspace_id", null: false
    t.string "name", null: false
    t.integer "role", default: 1, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["workspace_id", "name"], name: "index_teams_on_workspace_id_and_name", unique: true
    t.index ["workspace_id"], name: "index_teams_on_workspace_id"
  end

  create_table "time_entries", force: :cascade do |t|
    t.bigint "task_id", null: false
    t.bigint "user_id", null: false
    t.datetime "started_at", null: false
    t.datetime "ended_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["task_id"], name: "index_time_entries_on_task_id"
    t.index ["user_id", "ended_at"], name: "index_time_entries_on_user_id_and_ended_at"
    t.index ["user_id"], name: "index_time_entries_on_user_id"
  end

  create_table "users", force: :cascade do |t|
    t.string "name", null: false
    t.string "email", default: "", null: false
    t.string "encrypted_password", default: "", null: false
    t.string "reset_password_token"
    t.datetime "reset_password_sent_at"
    t.datetime "remember_created_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.json "onboarding"
    t.index ["email"], name: "index_users_on_email", unique: true
    t.index ["reset_password_token"], name: "index_users_on_reset_password_token", unique: true
  end

  create_table "workspace_invitations", force: :cascade do |t|
    t.bigint "workspace_id", null: false
    t.bigint "invited_by_id"
    t.string "email", null: false
    t.integer "role", default: 1, null: false
    t.string "token", null: false
    t.datetime "accepted_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["invited_by_id"], name: "index_workspace_invitations_on_invited_by_id"
    t.index ["token"], name: "index_workspace_invitations_on_token", unique: true
    t.index ["workspace_id", "email"], name: "index_workspace_invitations_on_workspace_id_and_email", unique: true
    t.index ["workspace_id"], name: "index_workspace_invitations_on_workspace_id"
  end

  create_table "workspace_memberships", force: :cascade do |t|
    t.bigint "workspace_id", null: false
    t.bigint "user_id", null: false
    t.integer "role", default: 1, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.decimal "weekly_capacity_hours", precision: 5, scale: 2, default: "40.0", null: false
    t.index ["user_id"], name: "index_workspace_memberships_on_user_id"
    t.index ["workspace_id", "user_id"], name: "index_workspace_memberships_on_workspace_id_and_user_id", unique: true
    t.index ["workspace_id"], name: "index_workspace_memberships_on_workspace_id"
  end

  create_table "workspaces", force: :cascade do |t|
    t.string "name", null: false
    t.bigint "user_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.bigint "root_folder_id"
    t.boolean "personal", default: false, null: false
    t.index ["root_folder_id"], name: "index_workspaces_on_root_folder_id", unique: true
    t.index ["user_id"], name: "index_workspaces_on_user_id"
  end

  add_foreign_key "active_storage_attachments", "active_storage_blobs", column: "blob_id"
  add_foreign_key "active_storage_variant_records", "active_storage_blobs", column: "blob_id"
  add_foreign_key "agent_activities", "agent_tokens", on_delete: :cascade
  add_foreign_key "agent_activities", "workspaces"
  add_foreign_key "agent_tokens", "folders", on_delete: :cascade
  add_foreign_key "agent_tokens", "users", column: "created_by_id", on_delete: :nullify
  add_foreign_key "agent_tokens", "workspaces"
  add_foreign_key "ai_runs", "ai_workers"
  add_foreign_key "ai_runs", "tasks"
  add_foreign_key "ai_runs", "workspaces"
  add_foreign_key "ai_workers", "workspaces"
  add_foreign_key "baseline_tasks", "baselines"
  add_foreign_key "baseline_tasks", "tasks"
  add_foreign_key "baselines", "folders"
  add_foreign_key "baselines", "users", column: "created_by_id", on_delete: :nullify
  add_foreign_key "baselines", "workspaces"
  add_foreign_key "documents", "documents", column: "parent_feature_id", on_delete: :nullify
  add_foreign_key "documents", "epics", on_delete: :nullify
  add_foreign_key "documents", "folders"
  add_foreign_key "documents", "initiatives", on_delete: :nullify
  add_foreign_key "documents", "milestones", on_delete: :nullify
  add_foreign_key "documents", "users", column: "created_by_id"
  add_foreign_key "documents", "users", column: "feature_owner_id", on_delete: :nullify
  add_foreign_key "epics", "folders"
  add_foreign_key "epics", "initiatives"
  add_foreign_key "epics", "milestones"
  add_foreign_key "epics", "workspaces"
  add_foreign_key "event_tasks", "events"
  add_foreign_key "event_tasks", "tasks"
  add_foreign_key "events", "folders"
  add_foreign_key "events", "workspaces"
  add_foreign_key "folders", "documents", column: "home_document_id", on_delete: :nullify
  add_foreign_key "folders", "folders", column: "parent_id"
  add_foreign_key "folders", "users", column: "owner_id", on_delete: :nullify
  add_foreign_key "folders", "workspaces"
  add_foreign_key "ideas", "folders", on_delete: :nullify
  add_foreign_key "ideas", "users", column: "submitted_by_id", on_delete: :nullify
  add_foreign_key "ideas", "workspaces"
  add_foreign_key "initiatives", "folders", on_delete: :nullify
  add_foreign_key "initiatives", "milestones"
  add_foreign_key "initiatives", "users", column: "owner_id", on_delete: :nullify
  add_foreign_key "initiatives", "workspaces"
  add_foreign_key "io_nodes", "folders", on_delete: :nullify
  add_foreign_key "io_nodes", "initiatives", on_delete: :nullify
  add_foreign_key "io_nodes", "io_nodes", column: "parent_id"
  add_foreign_key "io_nodes", "objectives", on_delete: :nullify
  add_foreign_key "io_nodes", "workspaces"
  add_foreign_key "key_result_check_ins", "key_results"
  add_foreign_key "key_result_check_ins", "users", column: "author_id", on_delete: :nullify
  add_foreign_key "key_results", "initiatives", on_delete: :nullify
  add_foreign_key "key_results", "objectives"
  add_foreign_key "milestones", "folders"
  add_foreign_key "milestones", "users", column: "owner_id", on_delete: :nullify
  add_foreign_key "milestones", "workspaces"
  add_foreign_key "notifications", "users"
  add_foreign_key "notifications", "workspaces"
  add_foreign_key "objectives", "folders", on_delete: :nullify
  add_foreign_key "objectives", "users", column: "owner_id", on_delete: :nullify
  add_foreign_key "objectives", "workspaces"
  add_foreign_key "paragraph_styles", "users"
  add_foreign_key "project_requests", "folders", column: "project_id", on_delete: :nullify
  add_foreign_key "project_requests", "users", column: "decided_by_id", on_delete: :nullify
  add_foreign_key "project_requests", "users", column: "requested_by_id", on_delete: :nullify
  add_foreign_key "project_requests", "workspaces"
  add_foreign_key "quip_imports", "folders", column: "destination_folder_id"
  add_foreign_key "quip_imports", "workspaces"
  add_foreign_key "resource_allocations", "folders"
  add_foreign_key "resource_allocations", "users"
  add_foreign_key "resource_allocations", "workspaces"
  add_foreign_key "shares", "users", column: "created_by_id"
  add_foreign_key "social_identities", "users"
  add_foreign_key "social_login_attempts", "users"
  add_foreign_key "sprints", "folders", on_delete: :nullify
  add_foreign_key "sprints", "users", column: "owner_id", on_delete: :nullify
  add_foreign_key "sprints", "workspaces"
  add_foreign_key "table_cells", "table_fields"
  add_foreign_key "table_cells", "table_records"
  add_foreign_key "table_cells", "table_records", column: "related_record_id"
  add_foreign_key "table_fields", "documents"
  add_foreign_key "table_fields", "documents", column: "relation_table_id"
  add_foreign_key "table_records", "documents"
  add_foreign_key "task_dependencies", "tasks", column: "predecessor_id"
  add_foreign_key "task_dependencies", "tasks", column: "successor_id"
  add_foreign_key "task_dependencies", "workspaces"
  add_foreign_key "task_field_values", "task_fields"
  add_foreign_key "task_field_values", "tasks"
  add_foreign_key "task_fields", "workspaces"
  add_foreign_key "task_participants", "tasks"
  add_foreign_key "task_participants", "users"
  add_foreign_key "task_status_changes", "agent_tokens", on_delete: :nullify
  add_foreign_key "task_status_changes", "tasks"
  add_foreign_key "task_status_changes", "users", column: "changed_by_id", on_delete: :nullify
  add_foreign_key "task_status_settings", "folders"
  add_foreign_key "task_status_settings", "workspaces"
  add_foreign_key "tasks", "documents"
  add_foreign_key "tasks", "epics"
  add_foreign_key "tasks", "folders"
  add_foreign_key "tasks", "milestones"
  add_foreign_key "tasks", "sprints"
  add_foreign_key "tasks", "tasks", column: "parent_id"
  add_foreign_key "tasks", "users", column: "assignee_id"
  add_foreign_key "tasks", "users", column: "created_by_id", on_delete: :nullify
  add_foreign_key "tasks", "workspaces"
  add_foreign_key "team_memberships", "teams"
  add_foreign_key "team_memberships", "users"
  add_foreign_key "teams", "workspaces"
  add_foreign_key "time_entries", "tasks"
  add_foreign_key "time_entries", "users"
  add_foreign_key "workspace_invitations", "users", column: "invited_by_id", on_delete: :nullify
  add_foreign_key "workspace_invitations", "workspaces"
  add_foreign_key "workspace_memberships", "users"
  add_foreign_key "workspace_memberships", "workspaces"
  add_foreign_key "workspaces", "folders", column: "root_folder_id"
  add_foreign_key "workspaces", "users"
end
