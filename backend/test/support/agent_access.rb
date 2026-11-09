# Shared setup for the agent access tests (tokens, tools, MCP, REST): a team
# Space with an owner, a folder tree (Root > Plans > Drafts, Root > Other), and a
# second Space an agent must never reach.
module AgentAccess
  def build_agent_space
    @owner = create_agent_user("owner")
    @space = Workspace.create!(name: "Agent Space", user: @owner)
    @plans = @space.folders.create!(name: "Plans")
    @drafts = @space.folders.create!(name: "Drafts", parent: @plans)
    @other_folder = @space.folders.create!(name: "Other")

    @stranger = create_agent_user("stranger")
    @elsewhere = @stranger.workspace
    @elsewhere_folder = @elsewhere.folders.create!(name: "Private")
  end

  def create_agent_user(label)
    User.create!(name: label.capitalize, email: "agent-#{label}-#{SecureRandom.hex(4)}@example.com", password: "password123")
  end

  # [AgentToken, the plain token string]
  def issue_agent_token(permission: :write, folder: nil, name: "Claude Code", space: @space, by: @owner)
    AgentToken.issue!(workspace: space, name: name, created_by: by, permission: permission, folder: folder)
  end

  def agent_headers(plain)
    { "Authorization" => "Bearer #{plain}" }
  end

  def user_headers(user, space: nil)
    token, = Warden::JWTAuth::UserEncoder.new.call(user, :user, nil)
    headers = { "Authorization" => "Bearer #{token}" }
    headers["X-Workspace-Id"] = space.id.to_s if space
    headers
  end

  # ---- TipTap content ------------------------------------------------------

  def text_node(string)
    { "type" => "text", "text" => string }
  end

  def heading_node(string, level: 1)
    { "type" => "heading", "attrs" => { "level" => level }, "content" => [ text_node(string) ] }
  end

  def paragraph_node(string)
    { "type" => "paragraph", "content" => [ text_node(string) ] }
  end

  def task_list_node(*lines)
    items = lines.map do |task_id, string|
      { "type" => "workspaceTaskItem", "attrs" => { "taskId" => task_id }, "content" => [ paragraph_node(string) ] }
    end
    { "type" => "workspaceTaskList", "content" => items }
  end

  def doc_content(*blocks)
    { "type" => "doc", "content" => blocks }
  end

  def make_document(folder, title, *blocks, by: @owner)
    folder.documents.create!(title: title, created_by: by, content: doc_content(heading_node(title), *blocks))
  end

  def make_collection(folder, title, by: @owner)
    folder.documents.create!(title: title, doc_type: :table, created_by: by)
  end
end
