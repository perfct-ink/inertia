class CreateWorkspaceMemberships < ActiveRecord::Migration[7.2]
  def up
    add_column :workspaces, :personal, :boolean, default: false, null: false

    create_table :workspace_memberships do |t|
      t.references :workspace, null: false, foreign_key: true
      t.references :user, null: false, foreign_key: true
      # 0 viewer, 1 member, 2 admin, 3 owner (see WorkspaceMembership.roles)
      t.integer :role, null: false, default: 1
      t.timestamps
    end
    add_index :workspace_memberships, [ :workspace_id, :user_id ], unique: true

    # Every existing workspace was one user's private workspace: that user
    # becomes its owner and it is flagged personal (never shared or deleted).
    execute <<~SQL.squish
      INSERT INTO workspace_memberships (workspace_id, user_id, role, created_at, updated_at)
      SELECT id, user_id, 3, NOW(6), NOW(6) FROM workspaces
    SQL
    execute "UPDATE workspaces SET personal = TRUE"
  end

  def down
    drop_table :workspace_memberships
    remove_column :workspaces, :personal
  end
end
