# A folder can be a project: a named container of docs listed on the Projects
# screen. A column rather than a new table, so projects keep folder nesting,
# sharing, pinning and archiving (backlog PM-190; PM-120 adds `feature`).
class AddKindToFolders < ActiveRecord::Migration[7.2]
  def change
    add_column :folders, :kind, :integer, default: 0, null: false
  end
end
