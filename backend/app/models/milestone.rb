class Milestone < ApplicationRecord
  include PlanningItem
  include PlanningHealth
  include SameWorkspace

  belongs_to :workspace
  belongs_to :folder, optional: true
  # The calendar event this milestone was copied from, if any (set only by
  # MilestoneEventMigration; see docs/features/milestones_and_rollups.md).
  belongs_to :source_event, class_name: "Event", optional: true
  has_many :initiatives, dependent: :nullify
  has_many :epics, dependent: :nullify
  has_many :tasks, dependent: :nullify

  validates :title, presence: true
  validates_same_workspace :folder, :source_event
end
