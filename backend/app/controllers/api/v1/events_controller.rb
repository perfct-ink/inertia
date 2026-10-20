module Api
  module V1
    class EventsController < ApplicationController
      include WorkspaceScoped
      before_action :set_event, only: [ :update, :destroy ]

      def index
        events = current_workspace.events.includes(tasks: :document).order(:date)
        events = events.where(folder_id: params[:folder_id]) if params[:folder_id]
        events = events.where(document_id: params[:document_id]) if params[:document_id]
        render json: EventBlueprint.render(events, view: :with_tasks)
      end

      def create
        event = current_workspace.events.build(event_params)
        if event.save
          render json: EventBlueprint.render(event.reload.tap { |e| e.association(:tasks).load }, view: :with_tasks), status: :created
        else
          render json: { errors: event.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def update
        if @event.update(event_params)
          render json: EventBlueprint.render(@event, view: :with_tasks)
        else
          render json: { errors: @event.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def destroy
        @event.destroy
        head :no_content
      end

      private

      def set_event
        @event = current_workspace.events.includes(tasks: :document).find(params[:id])
      end

      def event_params
        params.require(:event).permit(:title, :description, :date, :event_type, :start_time, :end_time, :folder_id, :document_id)
      end
    end
  end
end
