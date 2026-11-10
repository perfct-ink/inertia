# Which pages a project shows (docs/features/project_features.md). NULL means
# all of them, so every existing project keeps everything; turning a page off
# hides it and deletes nothing. Only projects (folders.kind = 1) use it.
class AddFeaturesToFolders < ActiveRecord::Migration[8.1]
  def change
    add_column :folders, :features, :json
  end
end
