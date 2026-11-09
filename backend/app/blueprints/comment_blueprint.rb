class CommentBlueprint < Blueprinter::Base
  identifier :id
  fields :commentable_type, :commentable_id, :parent_id, :body, :author_id, :edited_at, :created_at

  field :author do |comment|
    comment.author && { id: comment.author.id, name: comment.author.name }
  end

  field :mentioned_users do |comment|
    comment.mentioned_users.map { |user| { id: user.id, name: user.name } }
  end
end
