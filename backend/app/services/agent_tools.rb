# The operations an outside agent can run on a Space. The MCP server (POST /mcp)
# and the REST wrapper (POST /api/v1/agent/tools/:name) both call `call`, so they
# cannot drift apart. The areas are in agent_tools/ (documents, tasks, Collections).
#
# Every call is checked against the agent token: its Space, its optional folder,
# and read or read-write. Every change is logged to the token (AgentActivity) and
# task status changes name the agent, so an agent is the author, never a person.
# Agents cannot delete anything, change who is assigned, or touch members,
# permissions or other Spaces.
module AgentTools
  # An error to show the agent (it can act on the message).
  class Error < StandardError; end

  Tool = Struct.new(:name, :description, :schema, :write, :handler, keyword_init: true)

  def self.tools
    @tools ||= [ *Documents::TOOLS, *Tasks::TOOLS, *Collections::TOOLS ].freeze
  end

  # The tools a token may use (a read-only token gets the read tools).
  def self.for_token(token)
    tools.select { |tool| !tool.write || token.writable? }
  end

  # Runs a tool for a token and returns a JSON-able result. Raises Error for
  # anything the agent should be told about. A write and its activity record
  # are saved together or not at all.
  def self.call(token, name, arguments)
    tool = tools.find { |t| t.name == name.to_s } || raise(Error, "Unknown tool: #{name}")
    raise Error, "This token is read-only" if tool.write && !token.writable?
    args = arguments.respond_to?(:to_unsafe_h) ? arguments.to_unsafe_h : (arguments || {})
    raise Error, "Arguments must be an object" unless args.is_a?(Hash)
    token.touch_used!
    ActiveRecord::Base.transaction { tool.handler.call(token, args.stringify_keys) }
  rescue ActiveRecord::RecordInvalid => e
    raise Error, e.record.errors.full_messages.to_sentence
  end

  def self.object(properties = {}, required: [])
    { "type" => "object", "properties" => properties, "required" => required }
  end

  # ---- shared by the areas ---------------------------------------------------

  # The document, sheet or Collection with this id if the token reaches it.
  # A missing one and one outside the token's reach look the same.
  def self.document!(token, id, types: %w[document table])
    document = token.documents.find_by(id: integer(id))
    raise Error, "Document #{id} not found" unless document && types.include?(document.doc_type)
    document
  end

  def self.folder!(token, id)
    folder_id = integer(id)
    raise Error, "Folder #{id} not found" unless folder_id && token.covers_folder?(folder_id)
    token.workspace.folders.find(folder_id)
  end

  def self.integer(value)
    Integer(value.to_s, 10, exception: false)
  end

  def self.date!(value, name)
    return nil if value.blank?
    Date.iso8601(value.to_s).iso8601
  rescue ArgumentError
    raise Error, "#{name} must be a date like 2026-12-31"
  end

  def self.record_activity(token, action, subject, summary)
    AgentActivity.record!(token, action, subject, summary)
  end

  # How a time is shown to agents, and compared with `base_updated_at`.
  def self.timestamp(time)
    time&.utc&.iso8601(3)
  end
end
