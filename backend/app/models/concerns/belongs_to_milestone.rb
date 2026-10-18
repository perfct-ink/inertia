# Initiatives, epics and tasks can each sit under a milestone. Whatever has
# none of its own inherits its parent's (see MilestoneRollup).
module BelongsToMilestone
  extend ActiveSupport::Concern
  include SameWorkspace

  included do
    belongs_to :milestone, optional: true
    validates_same_workspace :milestone
  end
end
