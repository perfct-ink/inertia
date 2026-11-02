# Collaborating on an entire folder: a named person is invited to one folder
# with a role, and the access covers everything inside it. A row per person per
# folder (inherited by subfolders at read time, never copied). `invited_by_id`
# keeps who sent the invitation and is cleared if that account is deleted.
class CreateFolderMemberships < ActiveRecord::Migration[7.2]
  def change
    create_table :folder_memberships do |t|
      t.references :folder, null: false, foreign_key: true
      t.references :user, null: false, foreign_key: true
      t.references :invited_by, foreign_key: { to_table: :users, on_delete: :nullify }
      # 0 viewer, 1 commenter, 2 editor, 3 owner (see FolderMembership.roles).
      # The default is the least privileged role.
      t.integer :role, null: false, default: 0
      t.timestamps
    end
    add_index :folder_memberships, [ :folder_id, :user_id ], unique: true
  end
end
