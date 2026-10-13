ENV["RAILS_ENV"] ||= "test"
# Configure signing before Devise boots so tests need no deployment credentials.
ENV["JWT_SECRET_KEY"] ||= "inertia-test-only-jwt-signing-key"
require_relative "../config/environment"
require "rails/test_help"

module ActiveSupport
  class TestCase
    parallelize(workers: :number_of_processors)
    fixtures :all
  end
end
