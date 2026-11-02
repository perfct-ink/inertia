module Api
  module V1
    # One public, read-only roadmap link per Space, built on the Share model
    # (token, created_by); anyone with the token reads GET /api/v1/shared/:token.
    class RoadmapSharesController < ApplicationController
      include WorkspaceScoped

      def show
        share = current_workspace.roadmap_share
        render json: share ? ShareBlueprint.render(share) : nil
      end

      def create
        share = current_workspace.roadmap_share || current_workspace.shares.create!(permission: :view, created_by: current_user)
        render json: ShareBlueprint.render(share), status: :created
      end

      def destroy
        current_workspace.roadmap_share&.destroy
        head :no_content
      end
    end
  end
end
