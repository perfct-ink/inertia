# The four actions of a list that belongs to a Space: everyone in the Space
# reads it, only admins and owners add, change or remove entries. The
# controller that includes this names its records (a scope on
# `current_workspace`), the blueprint that renders them and the permitted
# params; `render_options` can pass options to the blueprint.
module AdminManagedList
  extend ActiveSupport::Concern

  included do
    include WorkspaceScoped
    before_action :require_current_workspace_manage!, unless: :read_request?
    before_action :set_record, only: [ :update, :destroy ]
  end

  def index
    render json: blueprint.render(records.order(:start_date, :id), **render_options)
  end

  def create
    record = records.build(record_params)
    if record.save
      render json: blueprint.render(record, **render_options), status: :created
    else
      render json: { errors: record.errors.full_messages }, status: :unprocessable_entity
    end
  end

  def update
    if @record.update(record_params)
      render json: blueprint.render(@record, **render_options)
    else
      render json: { errors: @record.errors.full_messages }, status: :unprocessable_entity
    end
  end

  def destroy
    @record.destroy
    head :no_content
  end

  private

  def render_options
    {}
  end

  def require_current_workspace_manage!
    require_manage_in!(current_workspace.id)
  end

  def set_record
    @record = records.find(params[:id])
  end
end
