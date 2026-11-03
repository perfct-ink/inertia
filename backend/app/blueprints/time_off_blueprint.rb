class TimeOffBlueprint < Blueprinter::Base
  identifier :id
  fields :user_id, :start_date, :end_date, :created_at, :updated_at

  # A note about why someone is away can be private, so only admins and
  # owners get it (the controller passes `show_note: true` for them).
  field :note do |time_off, options|
    time_off.note if options[:show_note]
  end
end
