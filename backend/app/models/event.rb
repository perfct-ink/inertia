class Event < ApplicationRecord
  belongs_to :workspace
  belongs_to :folder, optional: true
  # The document an event was made in (shown there as an inline chip).
  belongs_to :document, optional: true
  has_many :event_tasks, dependent: :destroy
  has_many :tasks, through: :event_tasks

  enum :event_type, { deadline: 0, milestone: 1 }

  validates :title, presence: true
  validates :date, presence: true
  validate :document_in_same_workspace

  scope :upcoming, -> { where("date >= ?", Date.today).order(:date) }
  scope :past, -> { where("date < ?", Date.today).order(date: :desc) }

  private

  def document_in_same_workspace
    return if document.nil? || document.folder.workspace_id == workspace_id
    errors.add(:document, "must be in the same space")
  end
end
