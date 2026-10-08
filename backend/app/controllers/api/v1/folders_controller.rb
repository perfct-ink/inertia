module Api
  module V1
    class FoldersController < ApplicationController
      before_action :set_folder, only: [ :show, :update, :destroy, :contents ]

      def index
        if params[:archived] == "1"
          # Flat, regardless of depth or nesting — an archived subfolder's
          # own (active) parent wouldn't surface it otherwise, and "show me
          # everything archived" is the whole point of this filter.
          folders = current_user.workspace.folders.archived.order(:name)
          render json: FolderBlueprint.render(folders)
        else
          folders = current_user.workspace.folders
            .active
            .where(parent_id: nil)
            .includes(children: { children: :documents }, documents: [])
            .order(:position, :name)
          render json: FolderBlueprint.render(folders, view: :with_children)
        end
      end

      def show
        render json: FolderBlueprint.render(@folder, view: :with_children)
      end

      # Everything a folder's detail page needs in one request: the folder
      # itself (for the breadcrumb/name) plus documents/tasks/events/epics
      # scoped to it AND every folder nested underneath it — clicking a
      # folder three levels deep narrows to that subtree, not just its own
      # direct contents.
      def contents
        folder_ids = @folder.self_and_descendant_ids
        documents = Document.where(folder_id: folder_ids).order(:title)

        tasks = current_user.workspace.tasks
          .where("tasks.folder_id IN (?) OR tasks.document_id IN (?)", folder_ids, documents.select(:id))
          .includes(:document)

        events = current_user.workspace.events.where(folder_id: folder_ids).order(:date)

        epics = current_user.workspace.epics
          .where(folder_id: folder_ids)
          .left_joins(:tasks)
          .group("epics.id")
          .select(
            "epics.*",
            "COUNT(tasks.id) AS tasks_count",
            ActiveRecord::Base.sanitize_sql_array(
              [ "SUM(CASE WHEN tasks.status = ? THEN 1 ELSE 0 END) AS done_tasks_count", Task.statuses[:done] ]
            )
          )

        render json: {
          folder: FolderBlueprint.render_as_hash(@folder),
          documents: DocumentBlueprint.render_as_hash(documents),
          tasks: TaskBlueprint.render_as_hash(tasks, view: :with_document),
          events: EventBlueprint.render_as_hash(events),
          epics: EpicBlueprint.render_as_hash(epics.to_a)
        }
      end

      def create
        folder = current_user.workspace.folders.build(folder_params)
        if folder.save
          render json: FolderBlueprint.render(folder), status: :created
        else
          render json: { errors: folder.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def update
        attrs = folder_params
        if attrs.key?(:archived)
          archived = ActiveModel::Type::Boolean.new.cast(attrs.delete(:archived))
          @folder.archived_at = archived ? Time.current : nil
        end
        if @folder.update(attrs)
          render json: FolderBlueprint.render(@folder)
        else
          render json: { errors: @folder.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def destroy
        if @folder.destroy
          head :no_content
        else
          render json: { errors: @folder.errors.full_messages.presence || [ "Folder contains a table referenced elsewhere" ] }, status: :unprocessable_entity
        end
      end

      private

      def set_folder
        @folder = current_user.workspace.folders.find(params[:id])
      end

      def folder_params
        params.require(:folder).permit(:name, :parent_id, :position, :pinned, :archived)
      end
    end
  end
end
