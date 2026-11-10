class ApplicationController < ActionController::API
  include Pundit::Authorization

  before_action :authenticate_user!

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

  def bypass_auth?
    AppSettings.bypass_auth?
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
