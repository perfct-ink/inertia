# A custom paragraph style a person defines for themselves: a name, the
# built-in style it builds on and a small set of formatting properties. It
# belongs to the user (not to a Space), so it is on their style list in every
# document.
class CreateParagraphStyles < ActiveRecord::Migration[7.2]
  def change
    create_table :paragraph_styles do |t|
      t.references :user, null: false, foreign_key: true
      t.string :name, null: false
      t.string :base, null: false, default: "body"
      t.json :properties, null: false, default: {}

      t.timestamps
    end
    add_index :paragraph_styles, [ :user_id, :name ], unique: true
  end
end
