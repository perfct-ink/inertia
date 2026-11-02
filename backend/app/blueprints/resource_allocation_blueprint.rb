class ResourceAllocationBlueprint < Blueprinter::Base
  identifier :id
  fields :user_id, :folder_id, :start_date, :end_date, :created_at, :updated_at

  # A decimal column would render as a string.
  field :hours_per_week do |allocation|
    allocation.hours_per_week.to_f
  end
end
