module Api
  module V1
    # Saved views for a page. Everyone sees their own and the Space's shared
    # views; only the owner (or a Space admin, for shared ones) can change or
    # delete a view.
    class SavedViewsController < ApplicationController
      include WorkspaceScoped
      before_action :set_view, only: [ :update, :destroy ]

      def index
        views = current_workspace.saved_views.visible_to(current_user).includes(:user).order(:name)
        views = views.where(page: params[:page]) if params[:page].present?
        render json: SavedViewBlueprint.render(views)
      end

      def create
        view = current_workspace.saved_views.build(view_params.merge(user: current_user))
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

      # Visible views only; changing needs ownership, or admin rights on a shared view.
      def set_view
        @view = current_workspace.saved_views.visible_to(current_user).find(params[:id])
        allowed = @view.user_id == current_user.id || (@view.shared? && membership_in(current_workspace.id).can_manage?)
        raise Pundit::NotAuthorizedError unless allowed
      end

      def view_params
        permitted = params.require(:saved_view).permit(:page, :name, :shared)
        permitted[:config] = params[:saved_view][:config].to_unsafe_h if params[:saved_view][:config].respond_to?(:to_unsafe_h)
        permitted
      end
    end
  end
end
