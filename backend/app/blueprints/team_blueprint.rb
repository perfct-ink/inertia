class TeamBlueprint < Blueprinter::Base
  identifier :id
  fields :name, :role, :workspace_id

  # The people on the team; `id` is the team membership to remove.
  field :members do |team|
    team.memberships.sort_by(&:id).map do |membership|
      { id: membership.id, user_id: membership.user_id,
        user: { id: membership.user.id, name: membership.user.name, email: membership.user.email } }
    end
  end
end
