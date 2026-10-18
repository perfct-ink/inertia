# `validates_same_workspace :milestone, :initiative` rejects records that point
# at a parent in another workspace. Reparenting anywhere in the planning tree
# (PM-06) goes through these associations, so the check lives in one place.
module SameWorkspace
  extend ActiveSupport::Concern

  class_methods do
    def validates_same_workspace(*associations)
      associations.each do |name|
        validate do
          parent = public_send(name)
          next if parent.nil? || parent.workspace_id == workspace_id
          errors.add(name, "must belong to the same workspace")
        end
      end
    end
  end
end
