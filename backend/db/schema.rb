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

ActiveRecord::Schema[7.2].define(version: 2026_10_04_000001) do
  create_table "documents", charset: "utf8mb4", collation: "utf8mb4_0900_ai_ci", force: :cascade do |t|
    t.string "title", null: false
    t.json "content"
    t.integer "doc_type", default: 0, null: false
    t.bigint "folder_id", null: false
    t.bigint "created_by_id", null: false
    t.datetime "content_updated_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.boolean "pinned", default: false, null: false
    t.index ["created_by_id"], name: "index_documents_on_created_by_id"
    t.index ["doc_type"], name: "index_documents_on_doc_type"
    t.index ["folder_id"], name: "index_documents_on_folder_id"
  end

  create_table "epics", charset: "utf8mb4", collation: "utf8mb4_0900_ai_ci", force: :cascade do |t|
    t.string "title", null: false
    t.bigint "workspace_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.bigint "folder_id"
    t.date "start_date"
    t.date "target_date"
    t.index ["folder_id"], name: "index_epics_on_folder_id"
    t.index ["workspace_id"], name: "index_epics_on_workspace_id"
  end

  create_table "event_tasks", charset: "utf8mb4", collation: "utf8mb4_0900_ai_ci", force: :cascade do |t|
    t.bigint "event_id", null: false
    t.bigint "task_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["event_id", "task_id"], name: "index_event_tasks_on_event_id_and_task_id", unique: true
    t.index ["event_id"], name: "index_event_tasks_on_event_id"
    t.index ["task_id"], name: "index_event_tasks_on_task_id"
  end

  create_table "events", charset: "utf8mb4", collation: "utf8mb4_0900_ai_ci", force: :cascade do |t|
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

  create_table "folders", charset: "utf8mb4", collation: "utf8mb4_0900_ai_ci", force: :cascade do |t|
    t.string "name", null: false
    t.bigint "workspace_id", null: false
    t.bigint "parent_id"
    t.integer "position", default: 0
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.boolean "pinned", default: false, null: false
    t.datetime "archived_at"
    t.index ["parent_id"], name: "index_folders_on_parent_id"
    t.index ["workspace_id"], name: "index_folders_on_workspace_id"
  end

  create_table "jwt_denylists", charset: "utf8mb4", collation: "utf8mb4_0900_ai_ci", force: :cascade do |t|
    t.string "jti", null: false
    t.datetime "exp", null: false
    t.index ["jti"], name: "index_jwt_denylists_on_jti", unique: true
  end

  create_table "quip_imports", charset: "utf8mb4", collation: "utf8mb4_0900_ai_ci", force: :cascade do |t|
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

  create_table "shares", charset: "utf8mb4", collation: "utf8mb4_0900_ai_ci", force: :cascade do |t|
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

  create_table "table_cells", charset: "utf8mb4", collation: "utf8mb4_0900_ai_ci", force: :cascade do |t|
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

  create_table "table_fields", charset: "utf8mb4", collation: "utf8mb4_0900_ai_ci", force: :cascade do |t|
    t.bigint "document_id", null: false
    t.string "name", null: false
    t.string "data_type", null: false
    t.bigint "relation_table_id"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["document_id", "name"], name: "index_table_fields_on_document_id_and_name", unique: true
    t.index ["document_id"], name: "index_table_fields_on_document_id"
    t.index ["relation_table_id"], name: "index_table_fields_on_relation_table_id"
  end

  create_table "table_records", charset: "utf8mb4", collation: "utf8mb4_0900_ai_ci", force: :cascade do |t|
    t.bigint "document_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["document_id"], name: "index_table_records_on_document_id"
  end

  create_table "tasks", charset: "utf8mb4", collation: "utf8mb4_0900_ai_ci", force: :cascade do |t|
    t.string "title", null: false
    t.text "description"
    t.integer "status", default: 4, null: false
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
    t.index ["assignee_id"], name: "index_tasks_on_assignee_id"
    t.index ["document_id"], name: "index_tasks_on_document_id"
    t.index ["epic_id"], name: "index_tasks_on_epic_id"
    t.index ["folder_id"], name: "index_tasks_on_folder_id"
    t.index ["parent_id"], name: "index_tasks_on_parent_id"
    t.index ["status"], name: "index_tasks_on_status"
    t.index ["workspace_id"], name: "index_tasks_on_workspace_id"
  end

  create_table "users", charset: "utf8mb4", collation: "utf8mb4_0900_ai_ci", force: :cascade do |t|
    t.string "name", null: false
    t.string "email", default: "", null: false
    t.string "encrypted_password", default: "", null: false
    t.string "reset_password_token"
    t.datetime "reset_password_sent_at"
    t.datetime "remember_created_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["email"], name: "index_users_on_email", unique: true
    t.index ["reset_password_token"], name: "index_users_on_reset_password_token", unique: true
  end

  create_table "workspaces", charset: "utf8mb4", collation: "utf8mb4_0900_ai_ci", force: :cascade do |t|
    t.string "name", null: false
    t.bigint "user_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["user_id"], name: "index_workspaces_on_user_id"
  end

  add_foreign_key "documents", "folders"
  add_foreign_key "documents", "users", column: "created_by_id"
  add_foreign_key "epics", "folders"
  add_foreign_key "epics", "workspaces"
  add_foreign_key "event_tasks", "events"
  add_foreign_key "event_tasks", "tasks"
  add_foreign_key "events", "folders"
  add_foreign_key "events", "workspaces"
  add_foreign_key "folders", "folders", column: "parent_id"
  add_foreign_key "folders", "workspaces"
  add_foreign_key "quip_imports", "folders", column: "destination_folder_id"
  add_foreign_key "quip_imports", "workspaces"
  add_foreign_key "shares", "users", column: "created_by_id"
  add_foreign_key "table_cells", "table_fields"
  add_foreign_key "table_cells", "table_records"
  add_foreign_key "table_cells", "table_records", column: "related_record_id"
  add_foreign_key "table_fields", "documents"
  add_foreign_key "table_fields", "documents", column: "relation_table_id"
  add_foreign_key "table_records", "documents"
  add_foreign_key "tasks", "documents"
  add_foreign_key "tasks", "epics"
  add_foreign_key "tasks", "folders"
  add_foreign_key "tasks", "tasks", column: "parent_id"
  add_foreign_key "tasks", "users", column: "assignee_id"
  add_foreign_key "tasks", "workspaces"
  add_foreign_key "workspaces", "users"
end
