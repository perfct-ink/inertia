require "test_helper"

class AutomationRulesControllerTest < ActionDispatch::IntegrationTest
  setup do
    @previous_bypass = ENV["BYPASS_AUTH"]
    ENV["BYPASS_AUTH"] = "false"
    @owner = User.create!(name: "Owner", email: "rules-owner@example.com", password: "password123")
    @admin = User.create!(name: "Admin", email: "rules-admin@example.com", password: "password123")
    @member = User.create!(name: "Member", email: "rules-member@example.com", password: "password123")
    @viewer = User.create!(name: "Viewer", email: "rules-viewer@example.com", password: "password123")
    @outsider = User.create!(name: "Outsider", email: "rules-outsider@example.com", password: "password123")
    @space = Workspace.create!(name: "Studio", user: @owner)
    @space.memberships.create!(user: @admin, role: :admin)
    @space.memberships.create!(user: @member, role: :member)
    @space.memberships.create!(user: @viewer, role: :viewer)
    @other_space = Workspace.create!(name: "Other", user: @owner)
    @rule = @space.automation_rules.create!(
      name: "Done goes to Member", trigger_type: "task_status_changed", trigger_config: { "to" => "done" },
      conditions: [], actions: [ { "type" => "assign", "config" => { "user_id" => @member.id } } ], created_by: @owner
    )
  end

  teardown { ENV["BYPASS_AUTH"] = @previous_bypass }

  def headers_for(user, workspace: @space)
    token, = Warden::JWTAuth::UserEncoder.new.call(user, :user, nil)
    { "Authorization" => "Bearer #{token}", "X-Workspace-Id" => workspace.id.to_s }
  end

  def rule_params(**over)
    {
      name: "Urgent goes to Admin", trigger_type: "task_status_changed", trigger_config: { to: "in_review" },
      conditions: [ { field: "priority", operator: "in", value: %w[high urgent] } ],
      actions: [ { type: "assign", config: { user_id: @admin.id } } ]
    }.merge(over)
  end

  def create_rule(user, **over)
    post "/api/v1/automation_rules", params: { automation_rule: rule_params(**over) }, headers: headers_for(user), as: :json
  end

  test "a member lists the Space's automations" do
    get "/api/v1/automation_rules", headers: headers_for(@member)
    assert_response :success
    rule = response.parsed_body.sole
    assert_equal "Done goes to Member", rule["name"]
    assert_equal true, rule["enabled"]
    assert_equal "task_status_changed", rule["trigger_type"]
    assert_equal({ "to" => "done" }, rule["trigger_config"])
    assert_equal [ { "type" => "assign", "config" => { "user_id" => @member.id } } ], rule["actions"]
    assert_equal @owner.id, rule["created_by_id"]
  end

  test "another Space's automations are not listed" do
    @other_space.automation_rules.create!(name: "Elsewhere", trigger_type: "task_status_changed", actions: [ { "type" => "set_status", "config" => { "value" => "done" } } ])
    get "/api/v1/automation_rules", headers: headers_for(@member)
    assert_equal [ "Done goes to Member" ], response.parsed_body.map { |r| r["name"] }
  end

  test "a viewer cannot read automations and someone outside the Space cannot find them" do
    get "/api/v1/automation_rules", headers: headers_for(@viewer)
    assert_response :forbidden

    get "/api/v1/automation_rules", headers: headers_for(@outsider)
    assert_response :not_found
  end

  test "an admin and an owner create an automation, recording who made it" do
    create_rule(@admin)
    assert_response :created
    body = response.parsed_body
    assert_equal "Urgent goes to Admin", body["name"]
    assert_equal({ "to" => "in_review" }, body["trigger_config"])
    assert_equal [ { "field" => "priority", "operator" => "in", "value" => %w[high urgent] } ], body["conditions"]
    assert_equal [ { "type" => "assign", "config" => { "user_id" => @admin.id } } ], body["actions"]
    assert_equal @admin.id, body["created_by_id"]
    assert_equal true, body["enabled"]

    create_rule(@owner, name: "Second")
    assert_response :created
    assert_equal 3, @space.automation_rules.count
  end

  test "a condition on nobody and an unassign action are kept as null" do
    create_rule(@owner, conditions: [ { field: "assignee_id", operator: "equals", value: nil } ], actions: [ { type: "assign", config: { user_id: nil } } ])
    assert_response :created
    assert_nil response.parsed_body["conditions"].first["value"]
    assert_nil response.parsed_body["actions"].first["config"]["user_id"]
  end

  test "a member or viewer cannot create, change or delete automations" do
    [ @member, @viewer ].each do |user|
      create_rule(user)
      assert_response :forbidden

      patch "/api/v1/automation_rules/#{@rule.id}", params: { automation_rule: { enabled: false } }, headers: headers_for(user), as: :json
      assert_response :forbidden

      delete "/api/v1/automation_rules/#{@rule.id}", headers: headers_for(user)
      assert_response :forbidden
    end
    assert_equal 1, @space.automation_rules.count
    assert @rule.reload.enabled
  end

  test "an invalid automation is refused with what is wrong" do
    create_rule(@admin, name: "", trigger_type: "nonsense", actions: [])
    assert_response :unprocessable_entity
    errors = response.parsed_body["errors"]
    assert_includes errors, "Name can't be blank"
    assert_includes errors, "Pick what starts the automation"
    assert_includes errors, "Add an action"
    assert_equal 1, @space.automation_rules.count
  end

  test "an automation cannot name someone who is not in the Space" do
    create_rule(@admin, actions: [ { type: "assign", config: { user_id: @outsider.id } } ])
    assert_response :unprocessable_entity
    assert_includes response.parsed_body["errors"], "Choose people who are in this Space"
  end

  test "a Space stops at the limit on automations" do
    (Automations::Registry::MAX_RULES_PER_SPACE - 1).times { |i| @space.automation_rules.create!(name: "Rule #{i}", trigger_type: "task_status_changed", actions: [ { "type" => "set_status", "config" => { "value" => "done" } } ]) }
    create_rule(@admin)
    assert_response :unprocessable_entity
    assert_includes response.parsed_body["errors"], "A Space can have at most #{Automations::Registry::MAX_RULES_PER_SPACE} automations"
  end

  test "an admin edits an automation and switches it off and on" do
    patch "/api/v1/automation_rules/#{@rule.id}", params: { automation_rule: { name: "Renamed", conditions: [ { field: "status", operator: "not_equals", value: "backlog" } ] } }, headers: headers_for(@admin), as: :json
    assert_response :success
    assert_equal "Renamed", response.parsed_body["name"]
    assert_equal "not_equals", @rule.reload.conditions.first["operator"]
    assert_equal({ "to" => "done" }, @rule.trigger_config, "settings that were not sent are kept")

    patch "/api/v1/automation_rules/#{@rule.id}", params: { automation_rule: { enabled: false } }, headers: headers_for(@admin), as: :json
    assert_response :success
    assert_equal false, response.parsed_body["enabled"]
    assert_not @rule.reload.enabled

    patch "/api/v1/automation_rules/#{@rule.id}", params: { automation_rule: { enabled: true } }, headers: headers_for(@owner), as: :json
    assert @rule.reload.enabled
  end

  test "an edit that makes the automation invalid is refused and changes nothing" do
    patch "/api/v1/automation_rules/#{@rule.id}", params: { automation_rule: { actions: [] } }, headers: headers_for(@admin), as: :json
    assert_response :unprocessable_entity
    assert_equal 1, @rule.reload.actions.size
  end

  test "an admin deletes an automation" do
    delete "/api/v1/automation_rules/#{@rule.id}", headers: headers_for(@admin)
    assert_response :no_content
    assert_equal 0, @space.automation_rules.count
  end

  test "an automation of another Space cannot be changed or deleted from this one" do
    other = @other_space.automation_rules.create!(name: "Elsewhere", trigger_type: "task_status_changed", actions: [ { "type" => "set_status", "config" => { "value" => "done" } } ])
    patch "/api/v1/automation_rules/#{other.id}", params: { automation_rule: { name: "Mine now" } }, headers: headers_for(@admin), as: :json
    assert_response :not_found
    delete "/api/v1/automation_rules/#{other.id}", headers: headers_for(@admin)
    assert_response :not_found
    assert_equal "Elsewhere", other.reload.name
  end

  test "an admin through a team can manage automations" do
    team_member = User.create!(name: "Team", email: "rules-team@example.com", password: "password123")
    @space.teams.create!(name: "Leads", role: :admin).memberships.create!(user: team_member)
    create_rule(team_member)
    assert_response :created
  end
end
