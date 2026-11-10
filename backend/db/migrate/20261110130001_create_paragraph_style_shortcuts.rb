# A keystroke a person assigned to a paragraph style, built-in ("quote") or one
# of their own ("custom-12"). Per person, so it is the same in every document
# they edit. See docs/features/paragraph_styles.md.
class CreateParagraphStyleShortcuts < ActiveRecord::Migration[8.1]
  def change
    create_table :paragraph_style_shortcuts do |t|
      t.references :user, null: false, foreign_key: true
      t.string :style, null: false
      t.string :keys, null: false
      t.timestamps
      t.index %i[user_id style], unique: true
      t.index %i[user_id keys], unique: true
    end
  end
end
