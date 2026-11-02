module Api
  module V1
    class IoNodesController < ApplicationController
      include WorkspaceScoped
      before_action :set_node, only: [ :update, :destroy ]

      def index
        render_nodes
      end

      # Creating a goal needs no parent; a csf or nc names its parent_id.
      def create
        node = current_workspace.io_nodes.build(node_params)
        # Raises RecordNotFound (404) for a parent in another Space or that doesn't exist.
        parent = current_workspace.io_nodes.find(node.parent_id) if node.parent_id
        node.kind = IoNode::CHILD_KIND[parent&.kind] || "goal"
        if node.save
          render_nodes(status: :created)
        else
          render json: { errors: node.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def update
        if @node.update(node_params.except(:parent_id))
          render_nodes
        else
          render json: { errors: @node.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def destroy
        @node.destroy
        render_nodes
      end

      private

      # The whole map every time: nodes are few and progress depends on the tree.
      def render_nodes(status: :ok)
        nodes = current_workspace.io_nodes.order(:position, :id)
        render json: IoNodeBlueprint.render(nodes, progress: IoMap.progress_by_id(current_workspace)), status: status
      end

      def set_node
        @node = current_workspace.io_nodes.find(params[:id])
      end

      def node_params
        params.require(:io_node).permit(:title, :description, :position, :parent_id, :objective_id, :initiative_id)
      end
    end
  end
end
