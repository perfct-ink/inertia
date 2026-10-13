class WorkspaceMembershipBlueprint < Blueprinter::Base
  identifier :id
  fields :role, :user_id

  field :user do |membership|
    { id: membership.user.id, name: membership.user.name, email: membership.user.email }
  end
end
