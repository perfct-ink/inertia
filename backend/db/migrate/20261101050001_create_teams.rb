# Teams: a named group of people inside a Space that holds one role there.
# Everyone on the team gets that role in the Space (their own membership may
# give them more). The role is the same integer scale as
# workspace_memberships.role (0 viewer, 1 member, 2 admin); a team is never
# an owner (see Team::ROLES).
class CreateTeams < ActiveRecord::Migration[7.2]
  def change
    create_table :teams do |t|
      t.references :workspace, null: false, foreign_key: true
      t.string :name, null: false
      t.integer :role, null: false, default: 1
      t.timestamps
    end
    add_index :teams, [ :workspace_id, :name ], unique: true
  end
end
