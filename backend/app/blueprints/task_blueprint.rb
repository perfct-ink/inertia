class TaskBlueprint < Blueprinter::Base
  identifier :id
  fields :title, :description, :status, :kind, :start_date, :due_date, :position, :created_at, :updated_at

  field :document_id
  field :assignee_id
  field :assignee_ids
  field :watcher_ids
  field :epic_id
  field :sprint_id
  field :milestone_id
  field :folder_id
  field :parent_id
  field :priority
  field(:estimate_hours) { |task| task.estimate_hours&.to_f }
  field :story_points
  field :actual_story_points
  field :recurrence
  field :recurrence_from

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

  # Values of the Space's custom task fields, keyed by the field's id. Fields
  # the task has no value for are left out. Preload `field_values` when
  # rendering a list.
  view :with_field_values do
    field :field_values do |task, _options|
      task.field_values.to_h { |field_value| [ field_value.task_field_id.to_s, field_value.value ] }
    end
  end

  # Ids of the uploaded files (file items) attached to the task. Preload
  # `task_files` when rendering a list.
  view :with_files do
    field :file_ids do |task, _options|
      task.task_files.map(&:file_id)
    end
  end

  view :with_document_and_field_values do
    include_view :with_document
    include_view :with_field_values
    include_view :with_files
  end
end
