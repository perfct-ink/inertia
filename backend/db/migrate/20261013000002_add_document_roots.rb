class AddDocumentRoots < ActiveRecord::Migration[7.2]
  def up
    add_reference :workspaces, :root_folder, foreign_key: { to_table: :folders }, index: { unique: true }
    workspace_record = Class.new(ActiveRecord::Base) { self.table_name = "workspaces" }
    folder_record = Class.new(ActiveRecord::Base) { self.table_name = "folders" }
    workspace_record.find_each do |workspace|
      workspace_record.transaction do
        root = folder_record.create!(workspace_id: workspace.id, name: "Root", position: 0, pinned: false)
        folder_record.where(workspace_id: workspace.id, parent_id: nil).where.not(id: root.id).update_all(parent_id: root.id)
        workspace.update_columns(root_folder_id: root.id)
      end
    end
  end

  def down
    # Preserve the root's documents and children as an ordinary folder.
    remove_reference :workspaces, :root_folder, foreign_key: { to_table: :folders }, index: true
  end
end
