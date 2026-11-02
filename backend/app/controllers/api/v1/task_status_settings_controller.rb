module Api
  module V1
    # How a board labels and colours the task statuses (see TaskStatusSetting).
    # A board is a folder, or the whole Space when no folder_id is given.
    class TaskStatusSettingsController < ApplicationController
      include WorkspaceScoped
      before_action :set_folder, only: [ :update, :destroy ]

      # Every setting in the Space; the client works out which one applies to
      # a given board.
      def index
        render json: TaskStatusSettingBlueprint.render(settings)
      end

      # Replaces one board's settings with the statuses sent.
      def update
        TaskStatusSetting.replace_for!(current_workspace, @folder, entries)
        render json: TaskStatusSettingBlueprint.render(settings)
      rescue ActiveRecord::RecordInvalid => e
        render json: { errors: e.record.errors.full_messages }, status: :unprocessable_entity
      end

      # Clears one board's settings so it follows the defaults again.
      def destroy
        current_workspace.task_status_settings.where(folder: @folder).delete_all
        head :no_content
      end

      private

      def settings
        current_workspace.task_status_settings.order(:id)
      end

      # Root stands for the whole Space, so its settings are the Space default.
      def set_folder
        return if params[:folder_id].blank?

        folder = current_workspace.folders.find(params[:folder_id])
        @folder = folder unless folder.root?
      end

      def entries
        Array(params[:statuses]).filter_map { |entry| entry.permit(:status, :label, :color) if entry.respond_to?(:permit) }
      end
    end
  end
end
