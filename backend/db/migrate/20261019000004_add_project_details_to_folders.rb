# Details shown for a project folder (kind: project); they feed the portfolio view.
class AddProjectDetailsToFolders < ActiveRecord::Migration[7.2]
  def change
    add_reference :folders, :owner, foreign_key: { to_table: :users, on_delete: :nullify }
    add_column :folders, :project_status, :integer, null: false, default: 0
    add_column :folders, :start_date, :date
    add_column :folders, :target_date, :date
    add_column :folders, :description, :text
  end
end
