# Initiatives and epics sit in order among their siblings on the Hierarchy page
# (tasks use the same column and sort by it as their default order). Moving an
# item sends its new parent and position in one update.
module Positioned
  extend ActiveSupport::Concern

  included do
    validates :position, numericality: { only_integer: true, in: -2_147_483_648..2_147_483_647 }
  end
end
