class KeyResultBlueprint < Blueprinter::Base
  identifier :id
  fields :objective_id, :title, :initiative_id, :unit, :position, :created_at, :updated_at
  field(:start_value) { |kr| kr.start_value.to_f }
  field(:target_value) { |kr| kr.target_value&.to_f }
  field(:current_value) { |kr| kr.current_value.to_f }
  field :percent
end
