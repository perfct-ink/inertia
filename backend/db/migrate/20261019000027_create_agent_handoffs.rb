# A person sending a document, folder or task to an outside agent (Claude Code,
# ...): who sent it, what it covers, the instruction, and the token the agent got.
class CreateAgentHandoffs < ActiveRecord::Migration[7.2]
  def change
    create_table :agent_handoffs do |t|
      t.references :workspace, null: false, foreign_key: true
      t.references :agent_token, null: false, foreign_key: true
      t.references :sent_by, foreign_key: { to_table: :users, on_delete: :nullify }
      t.string :subject_type, null: false
      t.bigint :subject_id, null: false
      t.string :agent_name, null: false
      t.text :instruction
      t.text :prompt, null: false
      t.timestamps
      t.index %i[subject_type subject_id]
    end
  end
end
