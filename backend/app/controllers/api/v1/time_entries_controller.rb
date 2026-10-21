module Api
  module V1
    # Time logged on a task. Anyone who can write in the Space can start a
    # timer or log time; only the person who made an entry can stop or delete it.
    class TimeEntriesController < ApplicationController
      include WorkspaceScoped
      before_action :set_task, only: [ :index, :create ]
      before_action :set_entry, only: [ :stop, :destroy ]

      def index
        render json: TimeEntryBlueprint.render(@task.time_entries.includes(:user).order(:started_at))
      end

      # Starts a timer, or logs finished time when `minutes` is given.
      def create
        entry = @task.time_entries.build(user: current_user, started_at: Time.current)
        if params.dig(:time_entry, :minutes).present?
          minutes = params.dig(:time_entry, :minutes).to_i
          return render json: { errors: [ "Minutes must be greater than 0" ] }, status: :unprocessable_entity unless minutes.positive?

          entry.ended_at = entry.started_at
          entry.started_at -= minutes.minutes
        end
        if entry.save
          render json: TimeEntryBlueprint.render(entry), status: :created
        else
          render json: { errors: entry.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def stop
        return render json: { errors: [ "That timer is not running" ] }, status: :unprocessable_entity unless @entry.running?

        @entry.stop!
        render json: TimeEntryBlueprint.render(@entry)
      end

      def destroy
        @entry.destroy
        head :no_content
      end

      private

      def set_task
        @task = current_workspace.tasks.find(params[:task_id])
      end

      def set_entry
        @entry = TimeEntry.joins(:task).where(tasks: { workspace_id: current_workspace.id }, user_id: current_user.id).find(params[:id])
      end
    end
  end
end
