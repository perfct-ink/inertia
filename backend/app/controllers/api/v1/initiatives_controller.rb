module Api
  module V1
    class InitiativesController < ApplicationController
      include WorkspaceScoped
      before_action :set_initiative, only: [ :update, :destroy ]

      def index
        render json: InitiativeBlueprint.render(current_workspace.initiatives)
      end

      def create
        initiative = current_workspace.initiatives.build(initiative_params)
        if initiative.save
          render json: InitiativeBlueprint.render(initiative), status: :created
        else
          render json: { errors: initiative.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def update
        if @initiative.update(initiative_params)
          render json: InitiativeBlueprint.render(@initiative)
        else
          render json: { errors: @initiative.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def destroy
        @initiative.destroy
        head :no_content
      end

      private

      def set_initiative
        @initiative = current_workspace.initiatives.find(params[:id])
      end

      def initiative_params
        params.require(:initiative).permit(:title, :description, :status, :owner_id, :milestone_id, :start_date, :target_date, :horizon)
      end
    end
  end
end
