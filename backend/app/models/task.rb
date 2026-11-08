class Task < ApplicationRecord
  include SameWorkspace
  include BelongsToMilestone
  include HasParticipants

  belongs_to :workspace
  belongs_to :document, optional: true
  belongs_to :assignee, class_name: "User", optional: true
  belongs_to :epic, optional: true
  belongs_to :sprint, optional: true
  # Separate from document_id: lets a task scope to a folder even when it
  # has no parent document at all ("just a task", not tied to a doc).
  belongs_to :folder, optional: true

  # Subtasks, to any depth (top-level -> subtask -> sub-subtask -> ...).
  # Destroying a task takes its own subtasks with it — they don't have much
  # meaning floating around detached from the task they broke down.
  belongs_to :parent, class_name: "Task", optional: true
  has_many :subtasks, class_name: "Task", foreign_key: :parent_id, dependent: :destroy, inverse_of: :parent
  has_many :ai_runs, dependent: :destroy
  # Values of the Space's custom task fields (tags, dropdown, ...).
  has_many :field_values, class_name: "TaskFieldValue", dependent: :destroy, inverse_of: :task
  has_many :time_entries, dependent: :destroy
  has_many :status_changes, -> { order(:created_at, :id) }, class_name: "TaskStatusChange", dependent: :destroy, inverse_of: :task
  has_many :baseline_tasks, dependent: :destroy
  # Gantt links (PM-13), removed with either end.
  has_many :successor_links, class_name: "TaskDependency", foreign_key: :predecessor_id, dependent: :destroy, inverse_of: :predecessor
  has_many :predecessor_links, class_name: "TaskDependency", foreign_key: :successor_id, dependent: :destroy, inverse_of: :successor

  enum :status, { todo: 0, in_progress: 1, in_review: 2, done: 3, backlog: 4 }

  # How urgent it is; none means nobody has said.
  enum :priority, { none: 0, low: 1, medium: 2, high: 3, urgent: 4 }, prefix: :priority, validate: true

  # Counted from the due date ("schedule") or from the day it is completed.
  enum :recurrence_from, { schedule: 0, completion: 1 }, prefix: :recurs_from

  # What sort of work item this is. A bug shows up in the bugs queue (the
  # task list filtered to kind = bug); a story is a user-facing slice of work.
  enum :kind, { task: 0, bug: 1, story: 2 }, prefix: true, scopes: false, validate: true

  validates :title, presence: true
  validates :estimate_hours, numericality: { greater_than_or_equal_to: 0, allow_nil: true }
  validates :story_points, :actual_story_points, numericality: { only_integer: true, greater_than_or_equal_to: 0, allow_nil: true }
  validate :recurrence_is_valid
  validates :status, presence: true
  validates_same_workspace :epic, :parent
  validate :parent_is_not_self_or_a_descendant
  validate :due_date_not_before_start_date

  # A task written in a feature's requirements document belongs to that feature.
  before_validation :inherit_feature_epic, on: :create

  after_update :create_next_occurrence, if: :repeats_after_completion?

  # Who made the change being saved, for the status history (set by the controller).
  attr_accessor :status_changed_by

  after_create { record_status_change(nil) }
  after_update { record_status_change(status_before_last_save) if saved_change_to_status? }

  # Who is making the change being saved (set by the controller), so a person
  # is not notified about their own action.
  attr_accessor :actor

  after_save :notify_new_assignee, if: :saved_change_to_assignee_id?

  default_scope { order(:position) }

  # Case-insensitive title search. Arel's matches is ILIKE on PostgreSQL (and
  # LIKE on MySQL), and the input is escaped so % and _ match literally.
  scope :title_matching, ->(query) { where(arel_table[:title].matches("%#{sanitize_sql_like(query)}%")) }

  # How many levels below a top-level task this one sits (0 = top-level,
  # 1 = subtask, 2 = sub-subtask, ...) — what TasksPage.tsx's "hide level 2
  # / level 3" controls filter on. A plain Ruby walk up :parent, not a
  # recursive SQL query — same reasoning as Folder#self_and_descendant_ids:
  # simpler than a CTE, and task hierarchies are shallow in practice.
  def depth
    d = 0
    current = parent
    while current
      d += 1
      current = current.parent
    end
    d
  end

  def recurrence_rule
    Recurrence.parse(recurrence)
  end

  private

  def inherit_feature_epic
    return if epic_id || document_id.nil?

    self.epic_id = Epic.where(document_id: document_id, workspace_id: workspace_id).pick(:id)
  end

  def repeats_after_completion?
    saved_change_to_status? && done? && recurrence_rule.present?
  end

  # Completing a repeating task creates the next one and hands the rule to it,
  # so reopening and completing the old one again cannot duplicate it.
  def create_next_occurrence
    rule = recurrence_rule
    next_task = dup
    next_task.status = :todo
    if recurs_from_completion?
      next_task.due_date = rule.next_date(Date.current)
      next_task.start_date = start_date && due_date ? next_task.due_date - (due_date - start_date).to_i : nil
    else
      next_task.due_date = due_date && rule.next_date(due_date)
      next_task.start_date = start_date && rule.next_date(start_date)
    end
    next_task.save!
    update_column(:recurrence, nil)
  end

  def recurrence_is_valid
    errors.add(:recurrence, "isn't a supported repeat rule") if recurrence.present? && recurrence_rule.nil?
  end

  def record_status_change(from)
    status_changes.create!(from_status: from, to_status: status, changed_by: status_changed_by)
  end

  def notify_new_assignee
    Notification.notify(recipient: assignee, workspace: workspace, kind: "task_assigned", title: "You were assigned “#{title}”", subject: self, actor: actor)
  end

  def parent_is_not_self_or_a_descendant
    return unless parent_id

    if parent_id == id
      errors.add(:parent_id, "can't be the task itself")
      return
    end

    ancestor = parent
    while ancestor
      if ancestor.id == id
        errors.add(:parent_id, "can't be one of this task's own subtasks")
        return
      end
      ancestor = ancestor.parent
    end
  end

  def due_date_not_before_start_date
    return unless start_date && due_date
    errors.add(:due_date, "can't be before the start date") if due_date < start_date
  end
end
