class ApplicationController < ActionController::API
  include Pundit::Authorization

  before_action :authenticate_user!
  before_action :set_current_user

  rescue_from Pundit::NotAuthorizedError, with: :forbidden
  rescue_from ActiveRecord::RecordNotFound, with: :not_found

  private

  def authenticate_user!
    return bypass_auth! if bypass_auth?
    super
  end

  def current_user
    @bypass_user || super
  end

  # Who the activity log (Auditable) attributes this request's edits to.
  def set_current_user
    Current.user = current_user
  end

  def bypass_auth?
    ENV["BYPASS_AUTH"] == "true"
  end

  def bypass_auth!
    @bypass_user = User.first
    render json: { error: "No users found — run db:seed or create a user first" }, status: :unauthorized unless @bypass_user
  end

  def forbidden
    render json: { error: "Forbidden" }, status: :forbidden
  end

  def not_found
    render json: { error: "Not found" }, status: :not_found
  end
end
