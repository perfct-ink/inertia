# Pending invitations for people who don't have an account yet. Whoever
# holds the link (the token) and signs in as the invited email joins the
# Space with the invited role. No email is sent; the inviter shares the link.
class CreateWorkspaceInvitations < ActiveRecord::Migration[7.2]
  def change
    create_table :workspace_invitations do |t|
      t.references :workspace, null: false, foreign_key: true
      t.references :invited_by, foreign_key: { to_table: :users, on_delete: :nullify }
      t.string :email, null: false
      t.integer :role, null: false, default: 1
      t.string :token, null: false
      t.datetime :accepted_at
      t.timestamps
    end
    add_index :workspace_invitations, :token, unique: true
    add_index :workspace_invitations, [ :workspace_id, :email ], unique: true
  end
end
