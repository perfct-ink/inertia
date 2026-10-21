class WorkspaceInvitationBlueprint < Blueprinter::Base
  identifier :id
  fields :email, :role, :token, :created_at
end
