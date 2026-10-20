# Inertia's MCP server (Model Context Protocol over HTTP, JSON-RPC 2.0). Agents
# such as Claude Code or Claude.ai connect to POST /mcp with an agent token and
# get the AgentTools for their Space.
class McpController < ActionController::API
  include AgentAuthenticated

  PROTOCOL_VERSION = "2025-03-26".freeze

  def handle
    body = JSON.parse(request.raw_post)
    return render(json: rpc_error(nil, -32_600, "Invalid request"), status: :bad_request) unless body.is_a?(Hash) || body.is_a?(Array)

    if body.is_a?(Array)
      replies = body.filter_map { |message| reply_to(message) }
      replies.empty? ? head(:accepted) : render(json: replies)
    else
      reply = reply_to(body)
      reply ? render(json: reply) : head(:accepted)
    end
  rescue JSON::ParserError
    render json: rpc_error(nil, -32_700, "Parse error"), status: :bad_request
  end

  def unsupported
    head :method_not_allowed
  end

  private

  # A JSON-RPC reply, or nil for a notification (which gets none).
  def reply_to(message)
    id = message["id"]
    return nil unless message.key?("id")

    case message["method"]
    when "initialize" then rpc_result(id, initialize_result)
    when "ping" then rpc_result(id, {})
    when "tools/list" then rpc_result(id, { tools: AgentTools.for_token(agent_token).map { |t| { name: t.name, description: t.description, inputSchema: t.schema } } })
    when "tools/call" then rpc_result(id, call_tool(message["params"] || {}))
    else rpc_error(id, -32_601, "Method not found: #{message['method']}")
    end
  end

  def initialize_result
    {
      protocolVersion: PROTOCOL_VERSION,
      capabilities: { tools: {} },
      serverInfo: { name: "inertia", version: "1" },
      instructions: "Inertia documents, tasks and collections for the Space #{agent_token.workspace.name}. Documents are Markdown; keep <!-- task:ID --> comments on task lines."
    }
  end

  # Tool failures are results with isError (so the agent can read them), not protocol errors.
  def call_tool(params)
    result = AgentTools.call(agent_token, params["name"], params["arguments"])
    { content: [ { type: "text", text: JSON.pretty_generate(result.as_json) } ], isError: false }
  rescue AgentTools::Error => e
    { content: [ { type: "text", text: e.message } ], isError: true }
  end

  def rpc_result(id, result)
    { jsonrpc: "2.0", id: id, result: result }
  end

  def rpc_error(id, code, message)
    { jsonrpc: "2.0", id: id, error: { code: code, message: message } }
  end
end
