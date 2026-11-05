module Api
  module V1
    # A check-in is recorded by KeyResult when current_value changes, so
    # creating one here just updates the value (validations still apply).
    class KeyResultCheckInsController < ApplicationController
      include WorkspaceScoped
      before_action :set_key_result

      def index
        render json: KeyResultCheckInBlueprint.render(@key_result.check_ins.includes(:author))
      end

      def create
        data = params.require(:check_in)
        @key_result.check_in_author = current_user
        @key_result.check_in_note = data[:note]
        value = data.require(:value)
        # An unchanged value is still a dated check-in ("still 30"), which update would skip.
        if @key_result.current_value == value.to_d
          @key_result.record_check_in
          render json: KeyResultCheckInBlueprint.render(@key_result.check_ins.first), status: :created
        elsif @key_result.update(current_value: value)
          render json: KeyResultCheckInBlueprint.render(@key_result.check_ins.first), status: :created
        else
          render json: { errors: @key_result.errors.full_messages }, status: :unprocessable_entity
        end
      end

      private

      def set_key_result
        @key_result = KeyResult.joins(:objective).where(objectives: { workspace_id: current_workspace.id }).find(params[:key_result_id])
      end
    end
  end
end
