# Forms that create tasks: a form is a short list of questions (stored as
# JSON on the form) whose answers become a task in the Space. Each filled-in
# form leaves a submission pointing at the task it made, so the form's
# owner can see who asked for what and so public submissions can be capped.
# The assignee/epic/folder a form files tasks under fall back to none if
# they are deleted; a submission goes with its task.
class CreateTaskFormsAndSubmissions < ActiveRecord::Migration[7.2]
  def change
    create_table :task_forms do |t|
      t.references :workspace, null: false, foreign_key: true
      t.string :title, null: false
      t.text :description
      t.json :questions, null: false, default: []
      t.string :token, null: false
      t.boolean :enabled, null: false, default: true
      t.boolean :public_access, null: false, default: false
      t.string :default_status, null: false, default: "backlog"
      t.references :epic, foreign_key: { on_delete: :nullify }
      t.references :folder, foreign_key: { on_delete: :nullify }
      t.references :assignee, foreign_key: { to_table: :users, on_delete: :nullify }
      t.references :created_by, foreign_key: { to_table: :users, on_delete: :nullify }
      t.timestamps
    end
    add_index :task_forms, :token, unique: true

    create_table :task_form_submissions do |t|
      t.references :task_form, null: false, foreign_key: true
      t.references :task, null: false, foreign_key: { on_delete: :cascade }
      t.references :submitted_by, foreign_key: { to_table: :users, on_delete: :nullify }
      t.json :answers, null: false, default: []
      t.timestamps
    end
  end
end
