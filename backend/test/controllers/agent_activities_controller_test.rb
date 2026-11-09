require "test_helper"
require_relative "../support/agent_access"

# /api/v1/agent_activities: what agents changed in a Space, shown as the agent.
class AgentActivitiesControllerTest < ActionDispatch::IntegrationTest
  include AgentAccess

  setup do
    @previous_bypass = ENV["BYPASS_AUTH"]
    ENV["BYPASS_AUTH"] = "false"
    build_agent_space
    @member = create_agent_user("member")
    @space.memberships.create!(user: @member, role: :member)
    @token, @plain = issue_agent_token
  end

  teardown { ENV["BYPASS_AUTH"] = @previous_bypass }

  test "every change shows the agent, never a person, and any member can read it" do
    document = make_document(@plans, "Plan", paragraph_node("Words"))
    AgentTools.call(@token, "replace_text", { "id" => document.id, "find" => "Words", "replace" => "Better words" })
    AgentTools.call(@token, "create_task", { "title" => "Follow up", "document_id" => document.id })

    get "/api/v1/agent_activities", headers: user_headers(@member, space: @space)
    assert_response :success
    rows = response.parsed_body
    assert_equal %w[created_task edited_document], rows.map { |r| r["action"] }
    assert_equal [ "Claude Code (agent)" ], rows.map { |r| r["agent_name"] }.uniq
    assert_equal [ @token.id ], rows.map { |r| r["agent_token_id"] }.uniq
    assert_not_includes response.body, @plain
    assert_not_includes response.body, @token.token_digest
    assert_not_includes response.body, "Owner"

    get "/api/v1/agent_activities", params: { subject_type: "Document", subject_id: document.id }, headers: user_headers(@member, space: @space)
    assert_equal [ "edited_document" ], response.parsed_body.map { |r| r["action"] }
  end

  test "a revoked agent's history stays" do
    AgentTools.call(@token, "create_task", { "title" => "Follow up" })
    @token.revoke!
    get "/api/v1/agent_activities", headers: user_headers(@owner, space: @space)
    assert_equal [ "created_task" ], response.parsed_body.map { |r| r["action"] }
  end

  test "another space's agents are not listed, and non-members get nothing" do
    other_token, = issue_agent_token(space: @elsewhere, by: @stranger, name: "Elsewhere bot")
    AgentTools.call(other_token, "create_task", { "title" => "Theirs" })
    AgentTools.call(@token, "create_task", { "title" => "Ours" })

    get "/api/v1/agent_activities", headers: user_headers(@owner, space: @space)
    assert_equal [ "Claude Code (agent)" ], response.parsed_body.map { |r| r["agent_name"] }

    get "/api/v1/agent_activities", headers: user_headers(@stranger, space: @space)
    assert_response :not_found
  end

  test "the task history names the agent that changed a task" do
    task = @space.tasks.create!(title: "Ship it")
    AgentTools.call(@token, "update_task", { "id" => task.id, "status" => "done" })

    get "/api/v1/tasks/#{task.id}/status_changes", headers: user_headers(@owner, space: @space)
    assert_response :success
    last = response.parsed_body.last
    assert_equal [ "Claude Code (agent)", true ], [ last["changed_by_name"], last["by_agent"] ]
  end
end
