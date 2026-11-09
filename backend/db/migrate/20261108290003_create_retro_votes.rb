# One vote per person per card. The unique index also serves lookups by card,
# so the card reference carries no index of its own.
class CreateRetroVotes < ActiveRecord::Migration[7.2]
  def change
    create_table :retro_votes do |t|
      t.references :retro_card, null: false, foreign_key: true, index: false
      t.references :user, null: false, foreign_key: { on_delete: :cascade }

      t.timestamps
    end
    add_index :retro_votes, [ :retro_card_id, :user_id ], unique: true
  end
end
