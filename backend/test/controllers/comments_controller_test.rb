require "test_helper"

class CommentsControllerTest < ActionDispatch::IntegrationTest
  setup do
    @previous_bypass = ENV["BYPASS_AUTH"]
    ENV["BYPASS_AUTH"] = "false"
    @owner = User.create!(name: "Owner", email: "owner-comments@example.com", password: "password123")
    @admin = User.create!(name: "Admin", email: "admin-comments@example.com", password: "password123")
    @member = User.create!(name: "Sam Lee", email: "member-comments@example.com", password: "password123")
    @viewer = User.create!(name: "Vic", email: "viewer-comments@example.com", password: "password123")
    @team = Workspace.create!(name: "Team", user: @owner)
    @team.memberships.create!(user: @admin, role: :admin)
    @team.memberships.create!(user: @member, role: :member)
    @team.memberships.create!(user: @viewer, role: :viewer)
    @task = @team.tasks.create!(title: "Ship it")
  end

  teardown { ENV["BYPASS_AUTH"] = @previous_bypass }

  def headers_for(user, workspace = @team)
    token, = Warden::JWTAuth::UserEncoder.new.call(user, :user, nil)
    { "Authorization" => "Bearer #{token}", "X-Workspace-Id" => workspace.id.to_s }
  end

  def post_comment(user, body, item: @task, **extra)
    comment = { commentable_type: item.class.name, commentable_id: item.id, body: body }.merge(extra)
    post "/api/v1/comments", params: { comment: comment }, headers: headers_for(user), as: :json
  end

  test "post a comment with a mention and a reply, then list the conversation" do
    post_comment(@member, "Hi @Owner, can you look?", mentioned_user_ids: [ @owner.id ])
    assert_response :created
    assert_equal({ "id" => @member.id, "name" => "Sam Lee" }, response.parsed_body["author"])
    assert_equal [ @owner.id ], response.parsed_body["mentioned_users"].map { |u| u["id"] }
    root_id = response.parsed_body["id"]

    post_comment(@owner, "On it", parent_id: root_id)
    assert_response :created
    assert_equal root_id, response.parsed_body["parent_id"]

    get "/api/v1/comments", params: { commentable_type: "Task", commentable_id: @task.id }, headers: headers_for(@viewer)
    assert_response :success
    assert_equal [ "Hi @Owner, can you look?", "On it" ], response.parsed_body.map { |c| c["body"] }
    assert_equal [ nil, root_id ], response.parsed_body.map { |c| c["parent_id"] }
  end

  test "comments work on epics, initiatives and milestones" do
    [ @team.epics.create!(title: "E"), @team.initiatives.create!(title: "I"), @team.milestones.create!(title: "M") ].each do |item|
      post_comment(@member, "Update on #{item.title}", item: item)
      assert_response :created
      assert_equal item.class.name, response.parsed_body["commentable_type"]
    end
  end

  test "a mention of someone who is not named in the text or not in the space is dropped" do
    stranger = User.create!(name: "Stranger", email: "stranger-comments@example.com", password: "password123")
    post_comment(@member, "Hi @Owner and @Stranger", mentioned_user_ids: [ @owner.id, stranger.id, @admin.id ])
    assert_equal [ @owner.id ], response.parsed_body["mentioned_users"].map { |u| u["id"] }
  end

  test "an empty comment is rejected" do
    post_comment(@member, "   ")
    assert_response :unprocessable_entity
    assert_match(/Body/, response.parsed_body["errors"].join)
  end

  test "a reply to another item's comment is rejected and a reply to a reply joins the thread" do
    post_comment(@member, "Root")
    root_id = response.parsed_body["id"]
    other = @team.tasks.create!(title: "Other")
    post_comment(@member, "Wrong thread", item: other, parent_id: root_id)
    assert_response :unprocessable_entity

    post_comment(@owner, "Reply", parent_id: root_id)
    reply_id = response.parsed_body["id"]
    post_comment(@member, "Reply to the reply", parent_id: reply_id)
    assert_response :created
    assert_equal root_id, response.parsed_body["parent_id"]
  end

  test "viewers read but cannot write" do
    post_comment(@viewer, "Can I?")
    assert_response :forbidden
  end

  test "another space's item, or an unknown type, is not found" do
    foreign = User.create!(name: "O", email: "o-comments@example.com", password: "password123").workspace.tasks.create!(title: "X")
    post_comment(@member, "Hi", item: foreign)
    assert_response :not_found

    get "/api/v1/comments", params: { commentable_type: "Kernel", commentable_id: 1 }, headers: headers_for(@member)
    assert_response :not_found

    get "/api/v1/comments", params: { commentable_type: "Task", commentable_id: @task.id }, headers: headers_for(@member, @member.workspace)
    assert_response :not_found
  end

  test "only the author edits a comment, and the edit is stamped" do
    post_comment(@member, "First draft")
    id = response.parsed_body["id"]
    assert_nil response.parsed_body["edited_at"]

    patch "/api/v1/comments/#{id}", params: { comment: { body: "Second draft" } }, headers: headers_for(@admin), as: :json
    assert_response :forbidden

    patch "/api/v1/comments/#{id}", params: { comment: { body: "Second draft" } }, headers: headers_for(@member), as: :json
    assert_response :success
    assert_equal "Second draft", response.parsed_body["body"]
    assert_not_nil response.parsed_body["edited_at"]
  end

  test "editing keeps mentions the text still names and can add or drop them" do
    post_comment(@member, "Hi @Owner", mentioned_user_ids: [ @owner.id ])
    id = response.parsed_body["id"]

    patch "/api/v1/comments/#{id}", params: { comment: { body: "Hi again @Owner" } }, headers: headers_for(@member), as: :json
    assert_equal [ @owner.id ], response.parsed_body["mentioned_users"].map { |u| u["id"] }

    patch "/api/v1/comments/#{id}", params: { comment: { body: "Hi @Admin", mentioned_user_ids: [ @admin.id ] } }, headers: headers_for(@member), as: :json
    assert_equal [ @admin.id ], response.parsed_body["mentioned_users"].map { |u| u["id"] }

    patch "/api/v1/comments/#{id}", params: { comment: { body: "Nobody" } }, headers: headers_for(@member), as: :json
    assert_empty response.parsed_body["mentioned_users"]

    patch "/api/v1/comments/#{id}", params: { comment: { body: "" } }, headers: headers_for(@member), as: :json
    assert_response :unprocessable_entity
  end

  test "the author or an admin deletes a comment with its replies; other members cannot" do
    post_comment(@member, "Mine")
    mine = response.parsed_body["id"]
    post_comment(@owner, "A reply", parent_id: mine)

    delete "/api/v1/comments/#{mine}", headers: headers_for(@viewer)
    assert_response :forbidden
    delete "/api/v1/comments/#{mine}", headers: headers_for(@owner)
    assert_response :no_content
    assert_equal 0, Comment.count

    post_comment(@owner, "Owner's")
    theirs = response.parsed_body["id"]
    delete "/api/v1/comments/#{theirs}", headers: headers_for(@member)
    assert_response :forbidden

    post_comment(@member, "Another")
    delete "/api/v1/comments/#{response.parsed_body['id']}", headers: headers_for(@admin)
    assert_response :no_content
  end
end
