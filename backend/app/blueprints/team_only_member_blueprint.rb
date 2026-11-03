# A person who is on the workspace only through teams (see TeamOnlyMember), in
# the shape of WorkspaceMembershipBlueprint so one list can hold both. `id` is
# null because there is no membership to edit, and the weekly capacity (which
# belongs to a membership) is 0.
class TeamOnlyMemberBlueprint < Blueprinter::Base
  field(:id) { nil }
  field :role
  field(:user_id) { |member| member.user.id }
  field(:weekly_capacity_hours) { 0.0 }

  field :user do |member|
    { id: member.user.id, name: member.user.name, email: member.user.email }
  end

  # The teams that give the access.
  field :teams do |member|
    member.teams.map { |team| { id: team.id, name: team.name } }
  end
end
