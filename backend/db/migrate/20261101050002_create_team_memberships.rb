# The people on a team (see CreateTeams). One row per user per team.
class CreateTeamMemberships < ActiveRecord::Migration[7.2]
  def change
    create_table :team_memberships do |t|
      t.references :team, null: false, foreign_key: true
      t.references :user, null: false, foreign_key: true
      t.timestamps
    end
    add_index :team_memberships, [ :team_id, :user_id ], unique: true
  end
end
