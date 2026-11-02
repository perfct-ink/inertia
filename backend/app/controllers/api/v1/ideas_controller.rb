module Api
  module V1
    class IdeasController < ApplicationController
      include WorkspaceScoped
      before_action :set_idea, only: [ :update, :destroy, :promote ]

      def index
        render json: IdeaBlueprint.render(current_workspace.ideas.includes(:submitted_by).order(created_at: :desc))
      end

      def create
        idea = current_workspace.ideas.build(idea_params.merge(submitted_by: current_user))
        save_and_render(idea, :created)
      end

      def update
        @idea.assign_attributes(idea_params)
        save_and_render(@idea, :ok)
      end

      def destroy
        @idea.destroy
        head :no_content
      end

      # POST /ideas/:id/promote { to: "epic" | "initiative" }
      def promote
        created = @idea.promote!(params.require(:to))
        render json: { idea: IdeaBlueprint.render_as_hash(@idea.reload), kind: params[:to], id: created.id }, status: :created
      rescue ArgumentError => e
        render json: { errors: [ e.message ] }, status: :unprocessable_entity
      rescue ActiveRecord::RecordInvalid => e
        render json: { errors: e.record.errors.full_messages }, status: :unprocessable_entity
      end

      private

      def save_and_render(idea, status)
        if idea.save
          render json: IdeaBlueprint.render(idea), status: status
        else
          render json: { errors: idea.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def set_idea
        @idea = current_workspace.ideas.find(params[:id])
      end

      # Status can be set to declined or reopened by hand; promotion goes through #promote.
      def idea_params
        permitted = params.require(:idea).permit(:title, :description, :status)
        permitted.delete(:status) unless %w[open declined].include?(permitted[:status])
        permitted
      end
    end
  end
end
