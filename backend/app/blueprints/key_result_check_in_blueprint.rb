class KeyResultCheckInBlueprint < Blueprinter::Base
  identifier :id
  fields :key_result_id, :note, :created_at
  field(:value) { |check_in| check_in.value.to_f }
  field(:author_name) { |check_in| check_in.author&.name }
end
