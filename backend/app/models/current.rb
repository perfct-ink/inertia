# Per-request state: who is making the change being saved. ApplicationController
# sets it for every signed-in request so models (Auditable) can attribute edits
# without each controller passing the user down. Background work has no user.
class Current < ActiveSupport::CurrentAttributes
  attribute :user
end
