# The activity log (backlog: activity log per item): one row each time an item
# (task, file, epic, initiative, milestone) is created or one of its audited
# fields changes, with who did it. Rows go when their item does.
class CreateActivities < ActiveRecord::Migration[7.2]
  def change
    create_table :activities do |t|
      t.references :workspace, null: false, foreign_key: true
      t.string :subject_type, null: false
      t.bigint :subject_id, null: false
      t.references :actor, foreign_key: { to_table: :users, on_delete: :nullify }
      t.integer :action, null: false
      t.json :field_changes, null: false, default: {}
      t.datetime :created_at, null: false
    end
    add_index :activities, %i[subject_type subject_id created_at], name: "index_activities_on_subject"
  end
end
