class Milestone < ApplicationRecord
  include PlanningItem
  include PlanningHealth

  belongs_to :workspace
  belongs_to :folder, optional: true
  has_many :initiatives, dependent: :nullify
  has_many :epics, dependent: :nullify
  has_many :tasks, dependent: :nullify

  validates :title, presence: true
  validate :folder_in_same_workspace

  private

  def folder_in_same_workspace
    return if folder.nil? || folder.workspace_id == workspace_id
    errors.add(:folder, "must belong to the same workspace")
  end
end
