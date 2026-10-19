# AI workers (backlog section 25): a named worker with instructions, and one
# run per attempt at a task. A run only stores the text the worker produced;
# nothing here lets a worker change tasks or documents.
class CreateAiWorkersAndRuns < ActiveRecord::Migration[7.2]
  def change
    create_table :ai_workers do |t|
      t.references :workspace, null: false, foreign_key: true
      t.string :name, null: false
      t.text :instructions
      t.string :model, null: false, default: "claude-opus-5-5"
      t.boolean :enabled, null: false, default: true
      t.timestamps
    end

    create_table :ai_runs do |t|
      t.references :workspace, null: false, foreign_key: true
      t.references :ai_worker, null: false, foreign_key: true
      t.references :task, null: false, foreign_key: true
      t.integer :status, null: false, default: 0
      t.text :output
      t.text :error
      t.datetime :started_at
      t.datetime :finished_at
      t.timestamps
    end
  end
end
