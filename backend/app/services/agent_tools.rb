# The operations an outside agent can run on a Space, shared by the MCP server
# (POST /mcp) and the REST wrapper (POST /api/v1/agent/tools/:name) so they
# cannot drift. Every call is checked against the agent token's Space, optional
# folder and read/write permission, and every change is logged to the token
# (AgentActivity) so it shows the agent as its author.
module AgentTools
  # An error to show the agent (it can act on the message).
  class Error < StandardError; end

  Tool = Struct.new(:name, :description, :schema, :write, :handler, keyword_init: true)

  DOC_TYPES = %w[document spreadsheet table].freeze

  def self.object(properties = {}, required: [])
    { "type" => "object", "properties" => properties, "required" => required }
  end

  def self.tools
    @tools ||= [
      Tool.new(name: "list_documents", write: false, description: "List documents, sheets and collections (optionally within one folder).",
               schema: object({ "folder_id" => { "type" => "integer" }, "query" => { "type" => "string", "description" => "Match titles" } }),
               handler: ->(t, a) { list_documents(t, a) }),
      Tool.new(name: "read_document", write: false, description: "Read a document as Markdown. Task lines end with <!-- task:ID -->; keep those comments when you edit.",
               schema: object({ "id" => { "type" => "integer" } }, required: %w[id]), handler: ->(t, a) { read_document(t, a) }),
      Tool.new(name: "edit_document", write: true,
               description: "Replace a document's content with Markdown (keep task comments to stay linked; new task lines create tasks). Refused for documents with tables or video: use replace_text for those.",
               schema: object({ "id" => { "type" => "integer" }, "markdown" => { "type" => "string" } }, required: %w[id markdown]), handler: ->(t, a) { edit_document(t, a) }),
      Tool.new(name: "replace_text", write: true, description: "Replace text inside a document without touching its structure (works for any document).",
               schema: object({ "id" => { "type" => "integer" }, "find" => { "type" => "string" }, "replace" => { "type" => "string" } }, required: %w[id find replace]),
               handler: ->(t, a) { replace_text(t, a) }),
      Tool.new(name: "list_tasks", write: false, description: "List tasks (optionally for one document, or one status).",
               schema: object({ "document_id" => { "type" => "integer" }, "status" => { "type" => "string", "enum" => Task.statuses.keys } }),
               handler: ->(t, a) { list_tasks(t, a) }),
      Tool.new(name: "create_task", write: true, description: "Create a task, optionally on a document.",
               schema: object({ "title" => { "type" => "string" }, "document_id" => { "type" => "integer" }, "status" => { "type" => "string", "enum" => Task.statuses.keys },
                                "due_date" => { "type" => "string", "description" => "YYYY-MM-DD" } }, required: %w[title]),
               handler: ->(t, a) { create_task(t, a) }),
      Tool.new(name: "update_task", write: true, description: "Change a task's title, status or dates (tick a task by setting status to done).",
               schema: object({ "id" => { "type" => "integer" }, "title" => { "type" => "string" }, "status" => { "type" => "string", "enum" => Task.statuses.keys },
                                "due_date" => { "type" => "string" }, "start_date" => { "type" => "string" } }, required: %w[id]),
               handler: ->(t, a) { update_task(t, a) }),
      Tool.new(name: "read_collection", write: false, description: "Read a collection's fields and records.",
               schema: object({ "id" => { "type" => "integer" } }, required: %w[id]), handler: ->(t, a) { read_collection(t, a) }),
      Tool.new(name: "write_collection_record", write: true,
               description: "Add a record to a collection, or update one when record_id is given. Values are keyed by field name; null clears a value. Relation fields cannot be written.",
               schema: object({ "id" => { "type" => "integer" }, "record_id" => { "type" => "integer" }, "values" => { "type" => "object" } }, required: %w[id values]),
               handler: ->(t, a) { write_collection_record(t, a) })
    ].freeze
  end

  # The tools a token may use (read-only tokens get the read tools).
  def self.for_token(token)
    tools.select { |tool| !tool.write || token.writable? }
  end

  # Runs a tool for a token and returns a JSON-able result. Raises Error for
  # anything the agent should be told about.
  def self.call(token, name, arguments)
    tool = tools.find { |t| t.name == name.to_s } || raise(Error, "Unknown tool: #{name}")
    raise Error, "This token is read-only" if tool.write && !token.writable?
    args = (arguments || {}).to_h.stringify_keys
    token.touch_used!
    tool.handler.call(token, args)
  rescue ActiveRecord::RecordInvalid => e
    raise Error, e.record.errors.full_messages.to_sentence
  end

  # ---- documents --------------------------------------------------------------

  def self.document!(token, id, types: DOC_TYPES)
    document = Document.joins(:folder).where(folders: { workspace_id: token.workspace_id }).find_by(id: id)
    raise Error, "Document #{id} not found" unless document && token.covers_document?(document) && types.include?(document.doc_type)
    document
  end

  def self.list_documents(token, args)
    folder_ids = token.folder_ids
    folder_ids &= [ args["folder_id"].to_i ] if args["folder_id"]
    scope = Document.where(folder_id: folder_ids, doc_type: DOC_TYPES.map { |t| Document.doc_types[t] }).order(:title).limit(200)
    scope = scope.where(Document.arel_table[:title].matches("%#{Document.sanitize_sql_like(args['query'].to_s)}%")) if args["query"].present?
    scope.map { |d| { id: d.id, title: d.title, type: d.doc_type, folder_id: d.folder_id, updated_at: d.updated_at } }
  end

  def self.read_document(token, args)
    document = document!(token, args["id"], types: %w[document])
    statuses = Task.unscoped.where(document_id: document.id).pluck(:id, :status).to_h
    { id: document.id, title: document.title, markdown: DocumentMarkdown.render(document.content, tasks: statuses), updated_at: document.updated_at }
  end

  def self.edit_document(token, args)
    document = document!(token, args["id"], types: %w[document])
    blocked = DocumentMarkdown.unsupported(document.content)
    raise Error, "This document has #{blocked.to_sentence} content that Markdown cannot hold; use replace_text instead" unless blocked.empty?

    content = DocumentMarkdown.parse(args["markdown"], title: document.title)
    created = link_task_lines(document, content)
    document.title = content["content"].first.dig("content", 0, "text").presence || document.title
    document.update!(content: content)
    AgentActivity.record!(token, "edited_document", document, "Rewrote “#{document.title}”")
    { id: document.id, title: document.title, tasks_created: created }
  end

  # Makes task lines real: a line with an id of one of this document's tasks keeps
  # it (and its text and ticked state update that task); any other line gets a
  # new task. Returns how many tasks were created.
  def self.link_task_lines(document, content)
    created = 0
    existing = Task.unscoped.where(document_id: document.id).index_by(&:id)
    visit = lambda do |node|
      next unless node.is_a?(Hash)
      if node["type"] == "workspaceTaskItem"
        title = node.dig("content", 0, "content")&.map { |n| n["text"].to_s }&.join.to_s.strip
        checked = node.dig("attrs", "checked")
        task = existing[node.dig("attrs", "taskId")]
        if task
          changes = {}
          changes[:title] = title if title.present? && task.title != title
          changes[:status] = :done if checked && !task.done?
          changes[:status] = :todo if !checked && task.done?
          task.update!(changes) unless changes.empty?
        elsif title.present?
          task = document.folder.workspace.tasks.create!(title: title, document: document, status: checked ? :done : :backlog)
          created += 1
        end
        # Only the id belongs in the document; "checked" was the Markdown tick.
        node["attrs"] = { "taskId" => task&.id }
      end
      Array(node["content"]).each(&visit)
    end
    visit.call(content)
    created
  end

  def self.replace_text(token, args)
    document = document!(token, args["id"], types: %w[document])
    find = args["find"].to_s
    raise Error, "Say what to find" if find.empty?
    count = 0
    content = document.content.deep_dup
    walk = lambda do |node|
      next unless node.is_a?(Hash)
      if node["type"] == "text" && node["text"].to_s.include?(find)
        count += node["text"].scan(find).size
        node["text"] = node["text"].gsub(find, args["replace"].to_s)
      end
      Array(node["content"]).each(&walk)
    end
    walk.call(content)
    raise Error, "“#{find}” was not found in the document (it must sit inside one run of text)" if count.zero?
    document.update!(content: content)
    AgentActivity.record!(token, "edited_document", document, "Replaced “#{find}” (#{count}×) in “#{document.title}”")
    { id: document.id, replaced: count }
  end

  # ---- tasks ------------------------------------------------------------------

  def self.task_scope(token)
    tasks = token.workspace.tasks
    return tasks unless token.folder
    folder_ids = token.folder_ids
    tasks.where("tasks.folder_id IN (?) OR tasks.document_id IN (?)", folder_ids, Document.where(folder_id: folder_ids).select(:id))
  end

  def self.task!(token, id)
    task_scope(token).find_by(id: id) || raise(Error, "Task #{id} not found")
  end

  def self.task_json(task)
    { id: task.id, title: task.title, status: task.status, due_date: task.due_date, start_date: task.start_date, document_id: task.document_id, assignee_id: task.assignee_id }
  end

  def self.list_tasks(token, args)
    scope = task_scope(token)
    scope = scope.where(document_id: document!(token, args["document_id"]).id) if args["document_id"]
    scope = scope.where(status: args["status"]) if args["status"].present?
    scope.limit(200).map { |t| task_json(t) }
  end

  def self.create_task(token, args)
    document = document!(token, args["document_id"], types: %w[document]) if args["document_id"]
    raise Error, "This token is limited to a folder: give a document_id inside it" if token.folder && document.nil?
    status = valid_status!(args["status"]) || :backlog
    task = token.workspace.tasks.create!(title: args["title"].to_s, document: document, status: status, due_date: args["due_date"].presence)
    AgentActivity.record!(token, "created_task", task, "Created “#{task.title}”")
    task_json(task)
  end

  def self.update_task(token, args)
    task = task_by_agent(token, args["id"])
    changes = args.slice("title", "status", "due_date", "start_date").compact_blank
    valid_status!(changes["status"])
    task.update!(changes)
    AgentActivity.record!(token, "updated_task", task, "Updated “#{task.title}” (#{changes.keys.to_sentence})")
    task_json(task)
  end

  def self.valid_status!(status)
    return nil if status.blank?
    raise Error, "Status must be one of #{Task.statuses.keys.to_sentence(last_word_connector: ' or ')}" unless Task.statuses.key?(status.to_s)
    status.to_s
  end

  def self.task_by_agent(token, id)
    task!(token, id)
  end

  # ---- collections ------------------------------------------------------------

  def self.read_collection(token, args)
    table = document!(token, args["id"], types: %w[table])
    fields = table.table_fields.order(:id)
    names = fields.index_by(&:id)
    {
      id: table.id, title: table.title,
      fields: fields.map { |f| { id: f.id, name: f.name, type: f.data_type } },
      records: table.table_records.order(:id).includes(:table_cells).map do |record|
        { id: record.id, values: record.table_cells.to_h { |cell| [ names[cell.table_field_id]&.name, cell.related_record_id || cell.value ] } }
      end
    }
  end

  def self.write_collection_record(token, args)
    table = document!(token, args["id"], types: %w[table])
    values = args["values"].to_h
    record = args["record_id"] ? table.table_records.find_by(id: args["record_id"]) || raise(Error, "Record #{args['record_id']} not found") : nil
    table.with_lock do
      record ||= table.table_records.create!
      values.each do |name, value|
        field = table.table_fields.find_by(name: name) || raise(Error, "No field named “#{name}”")
        raise Error, "“#{name}” is a relation; relation values cannot be written here" if field.data_type == "relation"
        cell = record.table_cells.find_or_initialize_by(table_field: field)
        if value.nil? || value == "" || value == []
          cell.destroy! if cell.persisted?
        else
          cell.value = value
          cell.save!
        end
      end
      table.update!(content_updated_at: Time.current)
    end
    AgentActivity.record!(token, "wrote_record", table, "Wrote record ##{record.id} in “#{table.title}”")
    { id: table.id, record_id: record.id }
  end

  private_class_method :document!, :task_scope, :task!, :task_json, :task_by_agent, :link_task_lines, :valid_status!
end
