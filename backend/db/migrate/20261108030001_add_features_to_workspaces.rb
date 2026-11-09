# Which optional pages a Space shows (docs/features/space_features.md). NULL
# means all of them, so every existing Space keeps everything; turning a page
# off hides it and deletes nothing.
class AddFeaturesToWorkspaces < ActiveRecord::Migration[7.2]
  def change
    add_column :workspaces, :features, :json
  end
end
