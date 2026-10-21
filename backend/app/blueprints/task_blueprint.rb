class TaskBlueprint < Blueprinter::Base
  identifier :id
  fields :title, :description, :status, :start_date, :due_date, :position, :created_at, :updated_at

  field :document_id
  field :assignee_id
  field :epic_id
  field :sprint_id
  field :milestone_id
  field :folder_id
  field :parent_id

  # Finished time from everyone, in minutes.
  field :logged_minutes do |task|
    task.time_entries.select(&:ended_at).sum(&:minutes)
  end

  # The signed-in user's running timer on this task, if any (its id, to stop
  # it, and when it started). Needs `current_user:` passed to render; without
  # it no timer shows.
  field :timer_entry_id do |task, options|
    running_timer(task, options[:current_user])&.id
  end

  field :timer_started_at do |task, options|
    running_timer(task, options[:current_user])&.started_at
  end

  def self.running_timer(task, user)
    user && task.time_entries.find { |e| e.user_id == user.id && e.ended_at.nil? }
  end

  view :with_document do
    association :document, blueprint: DocumentBlueprint do |task, _options|
      task.document
    end
  end
end
