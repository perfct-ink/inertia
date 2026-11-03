# A record that can belong to a project (a folder). Lists are filtered to the
# project the client names in X-Project-Id (see ProjectScoped).
module ProjectItem
  extend ActiveSupport::Concern
  include SameWorkspace

  included do
    belongs_to :folder, optional: true
    validates_same_workspace :folder
  end
end
