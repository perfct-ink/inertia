module Api
  module V1
    # Who is planned onto which project, for how many hours a week. Anyone in
    # the space can read the plan; only admins and owners change it.
    class ResourceAllocationsController < ApplicationController
      include WorkspaceScoped
      before_action :require_current_workspace_manage!, unless: :read_request?
      before_action :set_allocation, only: [ :update, :destroy ]

      def index
        render json: ResourceAllocationBlueprint.render(current_workspace.resource_allocations.order(:id))
      end

      def create
        allocation = current_workspace.resource_allocations.build(allocation_params)
        if allocation.save
          render json: ResourceAllocationBlueprint.render(allocation), status: :created
        else
          render json: { errors: allocation.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def update
        if @allocation.update(allocation_params)
          render json: ResourceAllocationBlueprint.render(@allocation)
        else
          render json: { errors: @allocation.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def destroy
        @allocation.destroy
        head :no_content
      end

      private

      def require_current_workspace_manage!
        require_manage_in!(current_workspace.id)
      end

      def set_allocation
        @allocation = current_workspace.resource_allocations.find(params[:id])
      end

      def allocation_params
        params.require(:resource_allocation).permit(:user_id, :folder_id, :hours_per_week, :start_date, :end_date)
      end
    end
  end
end
