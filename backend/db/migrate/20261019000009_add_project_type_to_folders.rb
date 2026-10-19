# The kind of work a project is (software, music release, ...). A type chooses
# the starting point; `project_type` is only meaningful when kind is project.
class AddProjectTypeToFolders < ActiveRecord::Migration[7.2]
  def change
    add_column :folders, :project_type, :integer, null: false, default: 0
  end
end
