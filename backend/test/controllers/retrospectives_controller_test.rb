require "test_helper"

class RetrospectivesControllerTest < ActionDispatch::IntegrationTest
  setup do
    @previous_bypass = ENV["BYPASS_AUTH"]
    ENV["BYPASS_AUTH"] = "false"
    @user = User.create!(name: "Pat", email: "pat-retro-api@example.com", password: "password123")
    @teammate = User.create!(name: "Tam", email: "tam-retro-api@example.com", password: "password123")
    @viewer = User.create!(name: "Vi", email: "viewer-retro-api@example.com", password: "password123")
    @team = Workspace.create!(name: "Team", user: @user)
    @team.memberships.create!(user: @teammate, role: :member)
    @team.memberships.create!(user: @viewer, role: :viewer)
    @headers = headers_for(@user)
  end

  teardown { ENV["BYPASS_AUTH"] = @previous_bypass }

  def headers_for(user, workspace: nil)
    token, = Warden::JWTAuth::UserEncoder.new.call(user, :user, nil)
    headers = { "Authorization" => "Bearer #{token}" }
    headers["X-Workspace-Id"] = workspace.id.to_s if workspace
    headers
  end

  def create_retro(**attrs)
    post "/api/v1/retrospectives", params: { retrospective: { title: "Sprint 1 retro" }.merge(attrs) }, headers: @headers, as: :json
    response.parsed_body
  end

  test "create a board from a template, list it and open it" do
    sprint = @user.workspace.sprints.create!(title: "Sprint 1")
    body = create_retro(template: "start_stop_continue", sprint_id: sprint.id)
    assert_response :created
    assert_equal "start_stop_continue", body["template"]
    assert_equal sprint.id, body["sprint_id"]
    assert_equal @user.id, body["created_by_id"]
    assert_equal 0, body["cards_count"]

    get "/api/v1/retrospectives", headers: @headers
    assert_equal [ "Sprint 1 retro" ], response.parsed_body.map { |r| r["title"] }

    get "/api/v1/retrospectives/#{body['id']}", headers: @headers
    assert_response :success
    assert_equal [], response.parsed_body["cards"]
  end

  test "the template defaults to went well and an unknown one is rejected" do
    assert_equal "went_well", create_retro["template"]
    create_retro(template: "nope")
    assert_response :unprocessable_entity
    assert_predicate response.parsed_body["errors"], :present?
    create_retro(title: "")
    assert_response :unprocessable_entity
  end

  test "the title can change but the template cannot" do
    id = create_retro(template: "four_ls")["id"]
    patch "/api/v1/retrospectives/#{id}", params: { retrospective: { title: "Renamed", template: "mad_sad_glad" } }, headers: @headers, as: :json
    assert_response :success
    assert_equal "Renamed", response.parsed_body["title"]
    assert_equal "four_ls", response.parsed_body["template"]
  end

  test "a sprint from another space is rejected" do
    foreign = @team.sprints.create!(title: "Team sprint")
    create_retro(sprint_id: foreign.id)
    assert_response :unprocessable_entity
  end

  test "cards are added to the template's columns, edited, moved and deleted" do
    id = create_retro["id"]
    post "/api/v1/retro_cards", params: { retro_card: { retrospective_id: id, column_key: "went_well", body: "Shipped on time" } }, headers: @headers, as: :json
    assert_response :created
    card = response.parsed_body
    assert_equal @user.id, card["author_id"]
    assert_equal 0, card["votes_count"]
    assert_equal false, card["voted"]

    post "/api/v1/retro_cards", params: { retro_card: { retrospective_id: id, column_key: "start", body: "Wrong column" } }, headers: @headers, as: :json
    assert_response :unprocessable_entity

    patch "/api/v1/retro_cards/#{card['id']}", params: { retro_card: { body: "Shipped early", column_key: "to_improve" } }, headers: @headers, as: :json
    assert_response :success
    assert_equal [ "Shipped early", "to_improve" ], response.parsed_body.values_at("body", "column_key")

    get "/api/v1/retrospectives/#{id}", headers: @headers
    assert_equal [ "Shipped early" ], response.parsed_body["cards"].map { |c| c["body"] }
    assert_equal 1, response.parsed_body["cards_count"]

    delete "/api/v1/retro_cards/#{card['id']}", headers: @headers
    assert_response :no_content
    assert_equal 0, RetroCard.count
  end

  test "votes are one per person, anonymous, and can be taken back" do
    card = @team.retrospectives.create!(title: "Team retro").cards.create!(column_key: "went_well", body: "Pairing helped")

    post "/api/v1/retro_cards/#{card.id}/vote", headers: headers_for(@user, workspace: @team)
    assert_response :created
    post "/api/v1/retro_cards/#{card.id}/vote", headers: headers_for(@user, workspace: @team)
    assert_response :created
    assert_equal 1, response.parsed_body["votes_count"]
    assert_equal true, response.parsed_body["voted"]

    post "/api/v1/retro_cards/#{card.id}/vote", headers: headers_for(@teammate, workspace: @team)
    assert_equal 2, response.parsed_body["votes_count"]

    get "/api/v1/retrospectives/#{card.retrospective_id}", headers: headers_for(@user, workspace: @team)
    board_card = response.parsed_body["cards"].first
    assert_equal 2, board_card["votes_count"]
    assert_equal true, board_card["voted"]
    assert_not_includes board_card.keys, "voter_ids"

    delete "/api/v1/retro_cards/#{card.id}/vote", headers: headers_for(@user, workspace: @team)
    assert_response :success
    assert_equal 1, response.parsed_body["votes_count"]
    assert_equal false, response.parsed_body["voted"]
  end

  test "an action item becomes a backlog task once; other cards cannot" do
    retro_id = create_retro["id"]
    post "/api/v1/retro_cards", params: { retro_card: { retrospective_id: retro_id, column_key: "action_items", body: "Write the runbook" } }, headers: @headers, as: :json
    card_id = response.parsed_body["id"]

    assert_difference -> { @user.workspace.tasks.count }, 1 do
      post "/api/v1/retro_cards/#{card_id}/task", headers: @headers
    end
    assert_response :created
    task = @user.workspace.tasks.find(response.parsed_body["task_id"])
    assert_equal "Write the runbook", task.title
    assert task.backlog?

    assert_no_difference -> { @user.workspace.tasks.count } do
      post "/api/v1/retro_cards/#{card_id}/task", headers: @headers
    end
    assert_response :unprocessable_entity
    assert_equal [ "This action item already has a task" ], response.parsed_body["errors"]

    post "/api/v1/retro_cards", params: { retro_card: { retrospective_id: retro_id, column_key: "went_well", body: "Nice" } }, headers: @headers, as: :json
    post "/api/v1/retro_cards/#{response.parsed_body['id']}/task", headers: @headers
    assert_response :unprocessable_entity
  end

  test "boards and cards of another space are not found" do
    theirs = @team.retrospectives.create!(title: "Theirs")
    card = theirs.cards.create!(column_key: "went_well", body: "x")

    get "/api/v1/retrospectives/#{theirs.id}", headers: @headers
    assert_response :not_found
    patch "/api/v1/retrospectives/#{theirs.id}", params: { retrospective: { title: "Mine now" } }, headers: @headers, as: :json
    assert_response :not_found
    post "/api/v1/retro_cards", params: { retro_card: { retrospective_id: theirs.id, column_key: "went_well", body: "y" } }, headers: @headers, as: :json
    assert_response :not_found
    patch "/api/v1/retro_cards/#{card.id}", params: { retro_card: { body: "z" } }, headers: @headers, as: :json
    assert_response :not_found
    post "/api/v1/retro_cards/#{card.id}/vote", headers: @headers
    assert_response :not_found
    post "/api/v1/retro_cards/#{card.id}/task", headers: @headers
    assert_response :not_found
    delete "/api/v1/retrospectives/#{theirs.id}", headers: @headers
    assert_response :not_found
  end

  test "boards are listed per space and viewers can read but not change them" do
    @team.retrospectives.create!(title: "Team retro")
    @user.workspace.retrospectives.create!(title: "Mine")
    card = @team.retrospectives.first.cards.create!(column_key: "went_well", body: "x")

    get "/api/v1/retrospectives", headers: headers_for(@user, workspace: @team)
    assert_equal [ "Team retro" ], response.parsed_body.map { |r| r["title"] }

    viewer = headers_for(@viewer, workspace: @team)
    get "/api/v1/retrospectives", headers: viewer
    assert_response :success
    post "/api/v1/retrospectives", params: { retrospective: { title: "Nope" } }, headers: viewer, as: :json
    assert_response :forbidden
    post "/api/v1/retro_cards", params: { retro_card: { retrospective_id: card.retrospective_id, column_key: "went_well", body: "Nope" } }, headers: viewer, as: :json
    assert_response :forbidden
    post "/api/v1/retro_cards/#{card.id}/vote", headers: viewer
    assert_response :forbidden
  end

  test "deleting a board removes it" do
    id = create_retro["id"]
    delete "/api/v1/retrospectives/#{id}", headers: @headers
    assert_response :no_content
    assert_not Retrospective.exists?(id)
  end
end
