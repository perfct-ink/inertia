module Api
  module V1
    # Saved views for a page. Everyone in the Space sees their own views and the
    # Space's shared ones. Changing or deleting a view needs ownership, or admin
    # rights when the view is shared; a private view of someone else is never
    # visible, so it is "not found". Alex decided 2026-11-09 that every member
    # of the Space, viewers included, may save a view (private or shared) and
    # change their own, so this controller skips WorkspaceScoped's member-role
    # check for writes: the Space comes from the header, which only reaches
    # Spaces the person belongs to, and set_view checks ownership.
    class SavedViewsController < ApplicationController
      include WorkspaceScoped
      skip_before_action :require_current_workspace_write!
      before_action :set_view, only: [ :update, :destroy ]

      def index
        views = current_workspace.saved_views.visible_to(current_user).includes(:user).order(:name, :id)
        views = views.where(page: params[:page]) if params[:page].present?
        render json: SavedViewBlueprint.render(views)
      end

      def create
        view = current_workspace.saved_views.build(view_params(:page))
        view.user = current_user
        save_and_render(view, :created)
      end

      def update
        @view.assign_attributes(view_params)
        save_and_render(@view, :ok)
      end

      def destroy
        @view.destroy
        head :no_content
      end

      private

      def save_and_render(view, status)
        if view.save
          render json: SavedViewBlueprint.render(view), status: status
        else
          render json: { errors: view.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def set_view
        @view = current_workspace.saved_views.visible_to(current_user).includes(:user).find(params[:id])
        raise Pundit::NotAuthorizedError unless @view.changeable_by?(current_user, membership_in(current_workspace.id))
      end

      # `page` is chosen when the view is made and never changes after.
      def view_params(*extra)
        saved_view = params.require(:saved_view)
        permitted = saved_view.permit(:name, :shared, *extra)
        if saved_view.key?(:config)
          config = saved_view[:config]
          permitted[:config] = config.respond_to?(:to_unsafe_h) ? config.to_unsafe_h : config
        end
        permitted
      end
    end
  end
end
