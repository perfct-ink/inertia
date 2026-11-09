require "test_helper"

class PublicFormsControllerTest < ActionDispatch::IntegrationTest
  setup do
    @previous_public = Rails.configuration.x.public_forms_enabled
    Rails.configuration.x.public_forms_enabled = true
    Api::V1::PublicFormsController::RATE_LIMIT_STORE.clear
    @owner = User.create!(name: "Owner", email: "owner-public-forms@example.com", password: "password123")
    @team = Workspace.create!(name: "Team", user: @owner)
    @form = @team.task_forms.create!(title: "Request a feature", description: "Tell us what you need", default_status: "backlog")
    @form.update!(public_access: true)
  end

  teardown do
    Rails.configuration.x.public_forms_enabled = @previous_public
    Api::V1::PublicFormsController::RATE_LIMIT_STORE.clear
  end

  test "anyone with the link sees the questions and nothing about where tasks go" do
    get "/api/v1/public_forms/#{@form.token}"
    assert_response :success
    body = response.parsed_body
    assert_equal [ "Request a feature", "Tell us what you need" ], [ body["title"], body["description"] ]
    assert_equal %w[title details], body["questions"].map { |q| q["id"] }
    assert_equal %w[id kind label options required], body["questions"].first.keys.sort
    assert_nil body["epic_id"]
    assert_nil body["token"]
  end

  test "filling in a public form with no account makes a task in the space" do
    assert_difference "@team.tasks.count", 1 do
      post "/api/v1/public_forms/#{@form.token}/submissions", params: { answers: { title: "Dark mode", details: "Please" } }, as: :json
    end
    assert_response :created
    assert_equal({ "submitted" => true }, response.parsed_body)
    task = @team.tasks.find_by!(title: "Dark mode")
    assert_equal "backlog", task.status
    assert_nil @form.submissions.first.submitted_by
  end

  test "wrong answers are a 422" do
    post "/api/v1/public_forms/#{@form.token}/submissions", params: { answers: { details: "no title" } }, as: :json
    assert_response :unprocessable_entity
    assert_equal [ "Title can't be blank" ], response.parsed_body["errors"]
  end

  test "a filled-in honeypot says thanks and makes nothing" do
    assert_no_difference "Task.count" do
      post "/api/v1/public_forms/#{@form.token}/submissions", params: { answers: { title: "Spam" }, website: "http://spam.example" }, as: :json
    end
    assert_response :created
  end

  test "too many public responses in an hour is a 429" do
    TaskForm::PUBLIC_HOURLY_LIMIT.times { @form.submissions.create!(task: @team.tasks.create!(title: "t"), answers: []) }
    assert_no_difference "Task.count" do
      post "/api/v1/public_forms/#{@form.token}/submissions", params: { answers: { title: "One more" } }, as: :json
    end
    assert_response :too_many_requests
    assert_match(/try again later/i, response.parsed_body["error"])
  end

  test "one address can send only a few public responses an hour" do
    limit = Api::V1::PublicFormsController::PER_IP_LIMIT
    limit.times do |n|
      post "/api/v1/public_forms/#{@form.token}/submissions", params: { answers: { title: "Task #{n}" } }, as: :json
      assert_response :created
    end

    assert_no_difference "Task.count" do
      post "/api/v1/public_forms/#{@form.token}/submissions", params: { answers: { title: "One too many" } }, as: :json
    end
    assert_response :too_many_requests
    assert_match(/try again later/i, response.parsed_body["error"])
    assert_equal limit, @form.submissions.count
  end

  test "guessing tokens counts against the same limit" do
    Api::V1::PublicFormsController::PER_IP_LIMIT.times do
      post "/api/v1/public_forms/not-a-real-token/submissions", params: { answers: { title: "x" } }, as: :json
      assert_response :not_found
    end
    post "/api/v1/public_forms/#{@form.token}/submissions", params: { answers: { title: "x" } }, as: :json
    assert_response :too_many_requests
  end

  test "an unknown, closed, private or server-disabled link is a plain 404" do
    get "/api/v1/public_forms/not-a-real-token"
    assert_response :not_found

    @form.update!(enabled: false)
    get "/api/v1/public_forms/#{@form.token}"
    assert_response :not_found
    post "/api/v1/public_forms/#{@form.token}/submissions", params: { answers: { title: "x" } }, as: :json
    assert_response :not_found

    @form.update!(enabled: true, public_access: false)
    get "/api/v1/public_forms/#{@form.token}"
    assert_response :not_found

    @form.update!(public_access: true)
    Rails.configuration.x.public_forms_enabled = false
    get "/api/v1/public_forms/#{@form.token}"
    assert_response :not_found
  end

  test "the token of a private form works for nobody" do
    private_form = @team.task_forms.create!(title: "Internal only")
    get "/api/v1/public_forms/#{private_form.token}"
    assert_response :not_found
  end
end
