# A node on the Intermediate Objectives Map. The shape is fixed: one goal at
# the top, critical success factors (csf) under it, necessary conditions (nc)
# under those. A node may link to an objective or an initiative for progress.
class IoNode < ApplicationRecord
  PARENT_KIND = { "goal" => nil, "csf" => "goal", "nc" => "csf" }.freeze
  CHILD_KIND = { "goal" => "csf", "csf" => "nc" }.freeze

  belongs_to :workspace
  belongs_to :parent, class_name: "IoNode", optional: true
  belongs_to :objective, optional: true
  belongs_to :initiative, optional: true
  has_many :children, class_name: "IoNode", foreign_key: :parent_id, dependent: :destroy, inverse_of: :parent

  enum :kind, { goal: 0, csf: 1, nc: 2 }, prefix: :kind

  validates :title, presence: true
  validate :parent_matches_kind
  validate :one_goal_per_workspace
  validate :links_in_same_workspace

  private

  def parent_matches_kind
    expected = PARENT_KIND.fetch(kind)
    if expected.nil?
      errors.add(:parent, "a goal has no parent") if parent
    elsif parent.nil? || parent.kind != expected
      errors.add(:parent, "of a #{kind} must be a #{expected}")
    elsif parent.workspace_id != workspace_id
      errors.add(:parent, "must be in this space")
    end
  end

  def one_goal_per_workspace
    return unless kind_goal?
    others = workspace.io_nodes.where(kind: :goal).where.not(id: id)
    errors.add(:kind, "there is already a goal for this space") if others.exists?
  end

  def links_in_same_workspace
    errors.add(:objective, "must be in this space") if objective && objective.workspace_id != workspace_id
    errors.add(:initiative, "must be in this space") if initiative && initiative.workspace_id != workspace_id
  end
end
