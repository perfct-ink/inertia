module Api
  module V1
    class QuipImportsController < ApplicationController
      include WorkspaceScoped
      # The Quip API token passes through this one request and into the
      # background job's arguments — it is never written to quip_imports or
      # any other table. Logging it (Rails' default param filtering already
      # covers this — see config/initializers/filter_parameter_logging.rb —
      # but call it out here since it's easy to accidentally echo back).
      def create
        quip_import = current_workspace.quip_imports.create!(
          domain: params[:domain].presence || "quip.com",
          destination_folder_id: params[:destination_folder_id].presence
        )
        QuipImportJob.perform_later(quip_import.id, params.require(:token))
        render json: QuipImportBlueprint.render(quip_import), status: :created
      end

      def show
        render json: QuipImportBlueprint.render(current_workspace.quip_imports.find(params[:id]))
      end

      def index
        render json: QuipImportBlueprint.render(current_workspace.quip_imports.order(created_at: :desc))
      end
    end
  end
end
