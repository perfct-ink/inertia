# Which optional sections a Space shows. NULL means all of them (every existing
# Space keeps everything); turning one off hides it and deletes nothing.
class AddFeaturesToWorkspaces < ActiveRecord::Migration[7.2]
  def change
    add_column :workspaces, :features, :json
  end
end
