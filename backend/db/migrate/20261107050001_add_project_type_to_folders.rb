# The kind of work a project is. A string key rather than an enum, because a
# Space can save its own types: a built-in key ("software", "music_release", ...)
# or "custom_<id>" for a saved one (docs/features/project_types.md). It is only
# a label once the project exists; what a type starts a project with is copied
# into the project when it is created.
class AddProjectTypeToFolders < ActiveRecord::Migration[7.2]
  def change
    add_column :folders, :project_type, :string, null: false, default: "blank"
  end
end
