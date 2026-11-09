# Access for outside agents (Claude, Claude Code, any MCP or REST client). A token
# is scoped to one Space (optionally one folder), read or read-write, and can be
# revoked. Only a SHA-256 digest of the token is stored. Everything an agent
# changes is logged against its token.
class CreateAgentTokensAndActivities < ActiveRecord::Migration[7.2]
  def change
    create_table :agent_tokens do |t|
      t.references :workspace, null: false, foreign_key: true
      # A token limited to a folder dies with the folder; it is never widened to the Space.
      t.references :folder, foreign_key: { on_delete: :cascade }
      # The owner who made it. If that person is deleted the token stops working (see AgentToken#usable?).
      t.references :created_by, foreign_key: { to_table: :users, on_delete: :nullify }
      t.string :name, null: false
      t.string :token_digest, null: false
      t.string :token_prefix, null: false
      t.integer :permission, null: false, default: 0
      t.datetime :revoked_at
      t.datetime :last_used_at
      t.timestamps
      t.index :token_digest, unique: true
    end

    create_table :agent_activities do |t|
      t.references :agent_token, null: false, foreign_key: { on_delete: :cascade }
      t.references :workspace, null: false, foreign_key: true, index: false
      t.string :action, null: false
      t.string :subject_type
      t.bigint :subject_id
      t.string :summary
      t.datetime :created_at, null: false
      t.index %i[workspace_id created_at]
      t.index %i[subject_type subject_id]
    end
  end
end
