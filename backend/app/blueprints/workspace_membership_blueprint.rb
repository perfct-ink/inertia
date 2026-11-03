class WorkspaceMembershipBlueprint < Blueprinter::Base
  identifier :id
  fields :role, :user_id

  # A decimal column would render as a string.
  field :weekly_capacity_hours do |membership|
    membership.weekly_capacity_hours.to_f
  end

  # Always empty for a membership; it is filled for people who are on the
  # workspace through teams alone (see TeamOnlyMemberBlueprint).
  field(:teams) { [] }

  field :user do |membership|
    { id: membership.user.id, name: membership.user.name, email: membership.user.email }
  end
end
