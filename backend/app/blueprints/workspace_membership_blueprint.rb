class WorkspaceMembershipBlueprint < Blueprinter::Base
  identifier :id
  fields :role, :user_id

  # A decimal column would render as a string.
  field :weekly_capacity_hours do |membership|
    membership.weekly_capacity_hours.to_f
  end

  field :user do |membership|
    { id: membership.user.id, name: membership.user.name, email: membership.user.email }
  end
end
