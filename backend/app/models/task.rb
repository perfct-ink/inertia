class Task < ApplicationRecord
  include SameWorkspace
  include BelongsToMilestone

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
  # Gantt links (PM-13), removed with either end.
  has_many :successor_links, class_name: "TaskDependency", foreign_key: :predecessor_id, dependent: :destroy, inverse_of: :predecessor
  has_many :predecessor_links, class_name: "TaskDependency", foreign_key: :successor_id, dependent: :destroy, inverse_of: :successor

  enum :status, { todo: 0, in_progress: 1, in_review: 2, done: 3, backlog: 4 }

  has_many :check_ins, -> { order(:created_at, :id) }, class_name: "TaskCheckIn", dependent: :destroy, inverse_of: :task

  validates :title, presence: true
  validates :check_in_every_days, numericality: { only_integer: true, greater_than: 0 }, if: :ongoing?
  validate :ongoing_tasks_are_not_done
  validates :status, presence: true
  validates_same_workspace :epic, :parent
  validate :parent_is_not_self_or_a_descendant
  validate :due_date_not_before_start_date

  # Who is making the change being saved (set by the controller), so a person
  # is not notified about their own action.
  attr_accessor :actor

  after_save :notify_new_assignee, if: :saved_change_to_assignee_id?

  default_scope { order(:position) }

  # When the next update is due: the interval after the last check-in (or after
  # the task was created, if none yet). Nil for tasks that aren't ongoing.
  def check_in_due_at
    return nil unless ongoing? && check_in_every_days
    (check_ins.maximum(:created_at) || created_at) + check_in_every_days.days
  end

  # An ongoing task whose update is overdue.
  def check_in_stale?(now = Time.current)
    due = check_in_due_at
    !due.nil? && due < now
  end

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

  private

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

  def ongoing_tasks_are_not_done
    errors.add(:status, "of an ongoing task can't be done; it is checked in on instead. Turn off ongoing first.") if ongoing? && done?
  end

  def due_date_not_before_start_date
    return unless start_date && due_date
    errors.add(:due_date, "can't be before the start date") if due_date < start_date
  end
end
