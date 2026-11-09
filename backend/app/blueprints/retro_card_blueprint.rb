# Votes are anonymous: the board gets a count and whether the caller voted
# (pass `user_id: current_user.id`), never who else did.
class RetroCardBlueprint < Blueprinter::Base
  identifier :id
  fields :retrospective_id, :column_key, :body, :author_id, :task_id, :created_at, :updated_at
  field :votes_count

  field :voted do |card, options|
    card.voted_by?(options[:user_id])
  end
end
