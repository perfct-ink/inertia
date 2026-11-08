module Api
  module V1
    # The project types a Space saved from its own projects. The built-in types
    # (software, music release, ...) live in the web app. Any member who can
    # write may save or delete one; viewers only read. A new project starts from
    # a type through POST /folders (see FoldersController#create).
    class ProjectTypesController < ApplicationController
      include WorkspaceScoped
      before_action :set_project_type, only: [ :destroy ]

      def index
        render json: ProjectTypeBlueprint.render(current_workspace.project_types.order(:name))
      end

      # Saves a project of this Space as a type: its documents, Collections and
      # tasks become the template.
      def create
        attrs = params.require(:project_type).permit(:name, :description, :icon, :from_folder_id)
        source = current_workspace.folders.find(attrs.delete(:from_folder_id))
        return render_errors([ "Only a project can be saved as a type." ]) unless source.project?

        project_type = current_workspace.project_types.build(attrs.to_h.merge(template: ProjectTemplate.snapshot(source)))
        if project_type.save
          render json: ProjectTypeBlueprint.render(project_type), status: :created
        else
          render_errors(project_type.errors.full_messages)
        end
      rescue ProjectTemplate::Invalid => e
        render_errors([ e.message ])
      end

      # The projects started from it keep everything it put in them and read as
      # plain projects (see ProjectType).
      def destroy
        @project_type.destroy
        head :no_content
      end

      private

      def set_project_type
        @project_type = current_workspace.project_types.find(params[:id])
      end

      def render_errors(messages)
        render json: { errors: messages }, status: :unprocessable_entity
      end
    end
  end
end
