# A Space's storage cap in bytes for uploaded files; NULL uses the default.
class AddStorageLimitToWorkspaces < ActiveRecord::Migration[7.2]
  def change
    add_column :workspaces, :storage_limit_bytes, :bigint
  end
end
