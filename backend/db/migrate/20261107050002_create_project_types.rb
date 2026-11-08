# Project types a Space saved from one of its own projects. The built-in types
# are not rows (docs/features/project_types.md). `template` is what a new project
# of the type starts with: documents, Collections (name and fields) and tasks.
class CreateProjectTypes < ActiveRecord::Migration[7.2]
  def change
    create_table :project_types do |t|
      t.references :workspace, null: false, foreign_key: true
      t.string :name, null: false
      t.text :description
      t.string :icon
      t.json :template, null: false, default: {}
      t.timestamps
    end
    add_index :project_types, [ :workspace_id, :name ], unique: true
  end
end
