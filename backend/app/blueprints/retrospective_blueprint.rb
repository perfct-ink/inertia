class RetrospectiveBlueprint < Blueprinter::Base
  identifier :id
  fields :title, :template, :sprint_id, :created_by_id, :created_at, :updated_at
  field :cards_count
  field :tasks_count

  # The board itself; pass `user_id: current_user.id` so each card knows
  # whether the caller has voted for it.
  view :with_cards do
    field :cards do |retrospective, options|
      RetroCardBlueprint.render_as_hash(retrospective.cards, user_id: options[:user_id])
    end
  end
end
