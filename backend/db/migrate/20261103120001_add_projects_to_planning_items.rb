# Every list in the sidebar is per-project (docs/features/projects.md),
# so the planning records that had no folder get one. Nullable: records made
# before this, or outside any project, stay Space-wide.
class AddProjectsToPlanningItems < ActiveRecord::Migration[7.2]
  TABLES = %i[initiatives sprints ideas io_nodes releases objectives].freeze

  def change
    TABLES.each do |table|
      add_reference table, :folder, foreign_key: { on_delete: :nullify }
    end
    add_column :folders, :icon, :string
    add_column :folders, :image_url, :string
  end
end
