# One @mentioned person on a comment.
class CommentMention < ApplicationRecord
  belongs_to :comment
  belongs_to :user

  validates :user_id, uniqueness: { scope: :comment_id }
end
