# Comments ("Updates") on planning items. One polymorphic table, so tasks,
# epics, initiatives and milestones (and later documents) share it. A reply
# points at its comment with parent_id. The author is nullified, not deleted,
# when the user goes away, so a conversation keeps its replies.
class CreateCommentsAndMentions < ActiveRecord::Migration[7.2]
  def change
    create_table :comments do |t|
      t.references :workspace, null: false, foreign_key: true
      t.references :commentable, polymorphic: true, null: false
      t.references :author, foreign_key: { to_table: :users, on_delete: :nullify }
      t.references :parent, foreign_key: { to_table: :comments }
      t.text :body, null: false
      t.datetime :edited_at
      t.timestamps
    end

    # Who a comment @mentions; kept as rows so a notifications inbox can read them.
    create_table :comment_mentions do |t|
      t.references :comment, null: false, foreign_key: true
      t.references :user, null: false, foreign_key: true
      t.timestamps
    end
    add_index :comment_mentions, [ :comment_id, :user_id ], unique: true
  end
end
