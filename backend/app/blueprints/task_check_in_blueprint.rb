class TaskCheckInBlueprint < Blueprinter::Base
  identifier :id
  fields :body, :created_at
  field(:author_name) { |check_in| check_in.author&.name }
end
