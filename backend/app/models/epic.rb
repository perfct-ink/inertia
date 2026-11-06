class Epic < ApplicationRecord
  include SameWorkspace
  include BelongsToMilestone
  include RoadmapHorizon
  include Positioned

  belongs_to :workspace
  belongs_to :folder, optional: true
  belongs_to :initiative, optional: true
  # The requirements document (docs/features/feature_requirements_docs.md): every
  # feature starts with one, made from the requirements template. Optional in the
  # association because a document deleted along with its folder leaves the
  # feature without one; creating a feature always makes it.
  belongs_to :document, optional: true
  has_many :tasks, dependent: :nullify

  # Who made the feature (the controller sets it); the new document is theirs.
  # Falls back to the Space's creator.
  attr_accessor :creator

  before_validation :build_requirements_document, on: :create
  after_destroy :destroy_requirements_document

  validates :title, presence: true
  validates :document, presence: true, on: :create
  validates_same_workspace :initiative
  validate :target_date_not_before_start_date
  validate :document_stays_in_the_space

  # One grouped query for every epic's task counts (the CASE/SUM, not FILTER,
  # is MySQL-compatible), instead of a COUNT per epic.
  scope :with_task_counts, lambda {
    left_joins(:tasks)
      .group("epics.id")
      .select(
        "epics.*",
        "COUNT(tasks.id) AS tasks_count",
        ActiveRecord::Base.sanitize_sql_array([ "SUM(CASE WHEN tasks.status = ? THEN 1 ELSE 0 END) AS done_tasks_count", Task.statuses[:done] ])
      )
  }

  # EpicsController#index preloads these via a grouped join (see there) so
  # listing epics doesn't run one COUNT query per epic. Falls back to a
  # real query so the model still works standalone (e.g. right after
  # create, or in tests) where that select never ran.
  def tasks_count
    attributes["tasks_count"]&.to_i || tasks.count
  end

  def done_tasks_count
    attributes["done_tasks_count"]&.to_i || tasks.where(status: :done).count
  end

  private

  # The requirements document goes in the feature's folder (its project, when it
  # was made in one), else in the Space's Personal Project, built from the
  # requirements template and titled like the feature.
  def build_requirements_document
    return if document || workspace.nil? || title.blank?

    parent = folder || workspace.personal_project
    self.document = Document.new(
      title: title,
      folder: parent,
      created_by: creator || workspace.user,
      content: RequirementsTemplate.content(title)
    )
  end

  # Deleting a feature takes its requirements document, and the tasks written in
  # it, with it.
  def destroy_requirements_document
    Document.find_by(id: document_id)&.destroy
  end

  # A feature's document can't be taken away, or live in another Space.
  def document_stays_in_the_space
    errors.add(:document, "can't be removed from a feature") if persisted? && document_id.nil? && document_id_in_database
    return if document.nil? || document.workspace_id == workspace_id

    errors.add(:document, "must belong to the same workspace")
  end

  # Matches the same rule the local .inertia-tasks file format already
  # enforces (docs/task-file-format.md) — and keeps EpicsPage.tsx's Timeline
  # view from having to render a bar with a negative span.
  def target_date_not_before_start_date
    return unless start_date && target_date
    errors.add(:target_date, "can't be before the start date") if target_date < start_date
  end
end
