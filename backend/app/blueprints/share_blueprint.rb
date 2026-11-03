# A share as its Space's writers see it (the link's token is a credential). What
# a visitor holding the token sees is built in SharedContent instead.
class ShareBlueprint < Blueprinter::Base
  identifier :id
  fields :token, :permission, :expires_at, :created_at

  field :shareable_type
  field :shareable_id
end
