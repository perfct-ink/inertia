# How one board names and colours a task status. Task#status stays the fixed
# five-value enum that rollups, the Gantt and the AI workers depend on; a row
# only changes the label and colour shown for one of those values.
#
# folder_id nil is the Space default. A folder's rows apply to its own board
# and to the folders nested under it; the client resolves which row wins
# (frontend/src/data/task_status.ts).
class TaskStatusSetting < ApplicationRecord
  include SameWorkspace

  # Keep in step with TASK_STATUS_COLORS in frontend/src/data/task_status.ts.
  COLORS = %w[gray blue yellow green orange red purple].freeze
  LABEL_MAX_LENGTH = 40

  belongs_to :workspace
  belongs_to :folder, optional: true

  # The same values as Task#status; the keys are stored as the same integers.
  enum :status, Task.statuses.to_h, scopes: false, instance_methods: false, validate: true

  normalizes :label, with: ->(label) { label.strip.presence }
  normalizes :color, with: ->(color) { color.strip.presence }

  validates :status, uniqueness: { scope: [ :workspace_id, :folder_id ] }
  validates :label, length: { maximum: LABEL_MAX_LENGTH }
  validates :color, inclusion: { in: COLORS }, allow_nil: true
  validates_same_workspace :folder
  validate :label_or_color_present

  # Replaces everything one board has set with `entries`, each a hash with
  # :status and optionally :label and :color. A status with neither is left
  # out, so it follows the Space default again. Raises RecordInvalid (and
  # changes nothing) if any entry is invalid or names a status twice.
  def self.replace_for!(workspace, folder, entries)
    transaction do
      workspace.task_status_settings.where(folder: folder).delete_all
      entries.each do |entry|
        setting = new(workspace: workspace, folder: folder, status: entry[:status], label: entry[:label], color: entry[:color])
        setting.save! if setting.label || setting.color
      end
    end
  end

  private

  def label_or_color_present
    errors.add(:base, "Add a label or a color") if label.nil? && color.nil?
  end
end
