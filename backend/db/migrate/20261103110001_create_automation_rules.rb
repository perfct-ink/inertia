# Automations: a rule a Space runs on its own, "when this happens, and these
# are true, do that". The trigger, its conditions and its actions are kept as
# JSON (the registry in app/services/automations/registry.rb says what each may
# hold) so new triggers and actions need no migration. If the person who made a
# rule is removed, the rule stays and the reference is cleared.
class CreateAutomationRules < ActiveRecord::Migration[7.2]
  def change
    create_table :automation_rules do |t|
      # The (workspace, trigger) index below covers lookups by workspace alone.
      t.references :workspace, null: false, foreign_key: true, index: false
      t.references :created_by, foreign_key: { to_table: :users, on_delete: :nullify }
      t.string :name, null: false
      t.boolean :enabled, null: false, default: true
      t.string :trigger_type, null: false
      t.json :trigger_config, null: false, default: {}
      t.json :conditions, null: false, default: []
      t.json :actions, null: false, default: []
      t.timestamps
    end
    add_index :automation_rules, [ :workspace_id, :trigger_type ]
  end
end
