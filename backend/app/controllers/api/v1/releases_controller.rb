module Api
  module V1
    class ReleasesController < ApplicationController
      include WorkspaceScoped
      before_action :set_release, only: [ :update, :destroy, :tasks, :add_document, :remove_document ]

      def index
        releases = current_workspace.releases.includes(:release_documents).order(Arel.sql("release_date IS NULL"), :release_date, :title)
        render json: ReleaseBlueprint.render(releases)
      end

      def create
        release = current_workspace.releases.build(release_params)
        save_and_render(release, :created)
      end

      def update
        @release.assign_attributes(release_params)
        save_and_render(@release, :ok)
      end

      def destroy
        @release.destroy
        head :no_content
      end

      # Every task in the release's documents.
      def tasks
        render json: TaskBlueprint.render(@release.tasks.includes(:document), view: :with_document)
      end

      def add_document
        link = @release.release_documents.build(document: find_document)
        if link.save
          render json: ReleaseBlueprint.render(@release.reload), status: :created
        else
          render json: { errors: link.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def remove_document
        @release.release_documents.find_by!(document_id: params[:document_id]).destroy
        render json: ReleaseBlueprint.render(@release.reload)
      end

      private

      def save_and_render(release, status)
        if release.save
          render json: ReleaseBlueprint.render(release), status: status
        else
          render json: { errors: release.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def set_release
        @release = current_workspace.releases.find(params[:id])
      end

      def find_document
        current_workspace.documents.find(params.require(:document_id))
      end

      def release_params
        params.require(:release).permit(:title, :kind, :release_date)
      end
    end
  end
end
