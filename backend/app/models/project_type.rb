# A project type the Space saved from one of its own projects: a name and the
# template (documents, Collections and tasks) a new project of the type starts
# with. See ProjectTemplate and docs/features/project_types.md.
#
# The built-in types (software, music release, ...) are not rows. Their keys are
# BUILT_IN here and their templates are in frontend/src/data/projectType.ts, so
# keep the two lists the same. A project holds its type as a key in
# folders.project_type: a built-in key, or "custom_<id>" for a saved type.
class ProjectType < ApplicationRecord
  BUILT_IN = %w[blank software music_release video event marketing_campaign writing personal].freeze
  BLANK = "blank".freeze
  CUSTOM_KEY = /\Acustom_(\d+)\z/

  belongs_to :workspace

  validates :name, presence: true, length: { maximum: 60 }, uniqueness: { scope: :workspace_id, case_sensitive: false }
  validates :description, length: { maximum: 500 }
  validates :icon, length: { maximum: 16 }
  validate :template_is_valid

  before_validation { self.name = name.strip if name }
  # The projects started from a type that is gone read as plain projects; what
  # the type put in them stays, because it was copied when they were created.
  after_destroy { workspace.folders.where(project_type: key).update_all(project_type: BLANK) }

  # The key a project holds: "custom_12".
  def key
    "custom_#{id}"
  end

  # Whether `key` names a built-in type or a type saved in `workspace`.
  def self.known_key?(key, workspace)
    return true if BUILT_IN.include?(key)

    id = key.to_s[CUSTOM_KEY, 1]
    id.present? && workspace.present? && workspace.project_types.exists?(id: id)
  end

  # The saved type a key names in `workspace`, or nil (built-in keys have none).
  def self.for_key(key, workspace)
    id = key.to_s[CUSTOM_KEY, 1]
    id && workspace.project_types.find_by(id: id)
  end

  # `key` if the Space can use it, else blank: what a project keeps when it is
  # copied or moved into another Space, which does not have the saved type.
  def self.key_for(key, workspace)
    known_key?(key, workspace) ? key : BLANK
  end

  private

  def template_is_valid
    ProjectTemplate.clean(template)
  rescue ProjectTemplate::Invalid => e
    errors.add(:template, e.message)
  end
end
