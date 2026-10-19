require "test_helper"

class AiRunsControllerTest < ActionDispatch::IntegrationTest
  include ActiveJob::TestHelper

  setup do
    @previous_bypass = ENV["BYPASS_AUTH"]
    ENV["BYPASS_AUTH"] = "false"
    @previous_adapter = ActiveJob::Base.queue_adapter
    ActiveJob::Base.queue_adapter = :test
    @user = User.create!(name: "Pat", email: "pat-ai-api@example.com", password: "password123")
    token, = Warden::JWTAuth::UserEncoder.new.call(@user, :user, nil)
    @headers = { "Authorization" => "Bearer #{token}" }
    @task = @user.workspace.tasks.create!(title: "Draft")
  end

  teardown do
    ENV["BYPASS_AUTH"] = @previous_bypass
    ActiveJob::Base.queue_adapter = @previous_adapter
  end

  test "create a worker, queue a run, and refuse a duplicate" do
    post "/api/v1/ai_workers", params: { ai_worker: { name: "Writer", instructions: "Be brief." } }, headers: @headers, as: :json
    assert_response :created
    worker_id = response.parsed_body["id"]
    assert_equal "claude-opus-5-5", response.parsed_body["model"]

    assert_enqueued_with(job: AiWorkerRunJob) do
      post "/api/v1/ai_runs", params: { ai_run: { ai_worker_id: worker_id, task_id: @task.id } }, headers: @headers, as: :json
    end
    assert_response :created
    assert_equal "queued", response.parsed_body["status"]

    post "/api/v1/ai_runs", params: { ai_run: { ai_worker_id: worker_id, task_id: @task.id } }, headers: @headers, as: :json
    assert_response :unprocessable_entity

    get "/api/v1/ai_runs", params: { task_id: @task.id }, headers: @headers
    assert_equal 1, response.parsed_body.size
  end

  test "another workspace's worker is not found" do
    bob = User.create!(name: "Bob", email: "bob-ai-api@example.com", password: "password123")
    foreign = bob.workspace.ai_workers.create!(name: "Elsewhere")

    post "/api/v1/ai_runs", params: { ai_run: { ai_worker_id: foreign.id, task_id: @task.id } }, headers: @headers, as: :json
    assert_response :not_found
  end
end
