# Inertia's MCP server (Model Context Protocol over HTTP, JSON-RPC 2.0). Agents
# such as Claude Code connect to POST /mcp with an agent token and get the
# AgentTools for the token's Space. It answers with plain JSON (the "Streamable
# HTTP" transport allows that), so there is no session and no event stream.
class McpController < ActionController::API
  include AgentAuthenticated

  # Newest first; the client's version is echoed when we speak it.
  PROTOCOL_VERSIONS = %w[2025-06-18 2025-03-26 2024-11-05].freeze
  MAX_BATCH = 50

  def handle
    body = JSON.parse(request.raw_post)
    return render(json: rpc_error(nil, -32_600, "Invalid request"), status: :bad_request) unless body.is_a?(Hash) || (body.is_a?(Array) && body.size.between?(1, MAX_BATCH))

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

  # No server-to-client stream and no sessions to end.
  def unsupported
    head :method_not_allowed
  end

  private

  # A JSON-RPC reply, or nil for a notification (which gets none).
  def reply_to(message)
    return rpc_error(nil, -32_600, "Invalid request") unless message.is_a?(Hash)
    return nil unless message.key?("id")

    id = message["id"]
    params = message["params"].is_a?(Hash) ? message["params"] : {}
    case message["method"]
    when "initialize" then rpc_result(id, initialize_result(params))
    when "ping" then rpc_result(id, {})
    when "tools/list" then rpc_result(id, { tools: AgentTools.for_token(agent_token).map { |t| { name: t.name, description: t.description, inputSchema: t.schema } } })
    when "tools/call" then rpc_result(id, call_tool(params))
    else rpc_error(id, -32_601, "Method not found: #{message['method']}")
    end
  end

  def initialize_result(params)
    requested = params["protocolVersion"]
    {
      protocolVersion: PROTOCOL_VERSIONS.include?(requested) ? requested : PROTOCOL_VERSIONS.first,
      capabilities: { tools: {} },
      serverInfo: { name: "inertia", version: "1" },
      instructions: "Inertia documents, tasks and Collections for the Space “#{agent_token.workspace.name}”#{agent_token.writable? ? '' : ' (read only)'}. " \
                    "Documents are Markdown; keep the <!-- ... --> comments on task lines, headings and tables when you edit."
    }
  end

  # Tool failures are results with isError (so the agent can read them), not protocol errors.
  def call_tool(params)
    result = AgentTools.call(agent_token, params["name"], params["arguments"])
    { content: [ { type: "text", text: JSON.pretty_generate(result.as_json) } ], isError: false }
  rescue AgentTools::Error => e
    { content: [ { type: "text", text: e.message } ], isError: true }
  rescue StandardError => e
    # A bug on our side: log the class only (messages can quote content), tell the agent nothing more.
    Rails.logger.error("MCP tool #{params['name'].to_s.first(60).inspect} failed: #{e.class}")
    { content: [ { type: "text", text: "The tool failed on the server. Try again, or tell the Space owner." } ], isError: true }
  end

  def rpc_result(id, result)
    { jsonrpc: "2.0", id: id, result: result }
  end

  def rpc_error(id, code, message)
    { jsonrpc: "2.0", id: id, error: { code: code, message: message } }
  end
end
