module Api
  module V1
    class FoldersController < ApplicationController
      include WorkspaceScoped
      include SpaceTransferable
      include FolderCollaboration
      before_action :set_folder, only: [ :show, :update, :destroy, :features, :copy, :move ]
      # The folder page also opens folders shared with the user from other Spaces.
      before_action :set_readable_folder, only: [ :contents ]

      def index
        if params[:archived] == "1"
          # Flat, regardless of depth or nesting — an archived subfolder's
          # own (active) parent wouldn't surface it otherwise, and "show me
          # everything archived" is the whole point of this filter.
          folders = current_workspace.folders.archived.order(:name)
          render json: FolderBlueprint.render(folders)
        else
          folders = current_workspace.folders
            .active
            .where(parent_id: nil)
            .includes(children: { children: :documents }, documents: [])
            .order(:position, :name)
          render json: FolderBlueprint.render(folders, view: :with_children)
        end
      end

      # The features (documents in feature folders) under this folder, nested,
      # with task counts that include sub-features and a status for each.
      def features
        render json: FeatureRowBlueprint.render(FeatureRollup.for(@folder))
      end

      def show
        render json: FolderBlueprint.render(@folder, view: :with_children)
      end

      # Everything a folder's detail page needs in one request: the folder
      # itself (for the breadcrumb/name) plus documents/tasks/events/epics
      # scoped to it AND every folder nested underneath it — clicking a
      # folder three levels deep narrows to that subtree, not just its own
      # direct contents. A folder shared with the user (they are not in its
      # Space) answers with the same shape, from the folder's own Space, plus
      # `access` saying what they may do there.
      def contents
        workspace = @folder.workspace
        folder_ids = @folder.self_and_descendant_ids
        documents = Document.where(folder_id: folder_ids).order(:title)

        tasks = @folder.scheduled_tasks.includes(:document)

        events = workspace.events.where(folder_id: folder_ids).order(:date)

        epics = workspace.epics
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
          access: folder_access_json(@folder),
          documents: DocumentBlueprint.render_as_hash(documents),
          tasks: TaskBlueprint.render_as_hash(tasks, view: :with_document),
          events: EventBlueprint.render_as_hash(events),
          epics: EpicBlueprint.render_as_hash(epics.to_a)
        }
      end

      def create
        shared_parent = shared_parent_folder
        return create_in_shared_folder(shared_parent) if shared_parent

        folder = current_workspace.folders.build(folder_params)
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
          render json: { errors: @folder.errors.full_messages.presence || [ "Folder contains a collection referenced elsewhere" ] }, status: :unprocessable_entity
        end
      end

      # Duplicates the folder, its subfolders and their documents into a folder
      # of any Space the user can write in; the original stays where it is.
      def copy
        with_space_transfer do |transfer|
          render json: transferred(transfer.copy_folder(@folder)), status: :created
        end
      end

      # Moves the folder, its subfolders and their documents into a folder of
      # another Space.
      def move
        with_space_transfer do |transfer|
          render json: transferred(transfer.move_folder(@folder))
        end
      end

      private

      def transferred(folder)
        { workspace_id: folder.workspace_id, folder: FolderBlueprint.render_as_hash(folder, root_folder_id: folder.workspace.root_folder_id) }
      end

      def set_folder
        @folder = current_workspace.folders.find(params[:id])
      end

      def set_readable_folder
        @folder = find_folder_or_shared(params[:id])
      end

      # A parent folder outside the active Space that is shared with the user.
      def shared_parent_folder
        id = params.dig(:folder, :parent_id).presence
        return if id.nil? || current_workspace.folders.exists?(id)
        Folder.where(id: shared_folder_ids).find_by(id: id)
      end

      # An editor of a shared folder adds subfolders in it (a name only); renaming,
      # moving, archiving and deleting folders stay with Space members.
      def create_in_shared_folder(parent)
        require_folder_write!(parent)
        folder = parent.workspace.folders.build(name: params.require(:folder)[:name], parent: parent)
        if folder.save
          render json: FolderBlueprint.render(folder), status: :created
        else
          render json: { errors: folder.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def folder_params
        params.require(:folder).permit(:name, :kind, :dependency_mode, :parent_id, :position, :pinned, :archived, :owner_id, :project_status, :start_date, :target_date, :description, :home_document_id, :icon, :image_url)
      end
    end
  end
end
