class HolidayBlueprint < Blueprinter::Base
  identifier :id
  fields :name, :start_date, :end_date, :created_at, :updated_at
end
