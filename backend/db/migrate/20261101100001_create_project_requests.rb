# Project intake: a member requests a project, an admin or owner approves it
# (which creates the project folder, kept in project_id) or declines it with a
# reason. If the requester, decider or created project is later removed, the
# request stays and the reference is cleared.
class CreateProjectRequests < ActiveRecord::Migration[7.2]
  def change
    create_table :project_requests do |t|
      t.references :workspace, null: false, foreign_key: true
      t.references :requested_by, foreign_key: { to_table: :users, on_delete: :nullify }
      t.references :decided_by, foreign_key: { to_table: :users, on_delete: :nullify }
      t.references :project, foreign_key: { to_table: :folders, on_delete: :nullify }
      t.string :name, null: false
      t.text :description
      t.text :justification
      # 0 low, 1 medium, 2 high
      t.integer :priority, null: false, default: 1
      t.date :start_date
      t.date :target_date
      # 0 pending, 1 approved, 2 declined
      t.integer :status, null: false, default: 0
      t.text :decision_note
      t.datetime :decided_at
      t.timestamps
    end
  end
end
