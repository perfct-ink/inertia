module AgentTools
  # Space tasks: list, create and update. A task a token reaches is one in its Space
  # (or, for a folder token, in the folder, below it, or on a document in it).
  module Tasks
    MAX_LISTED = 200
    STATUSES = Task.statuses.keys.freeze

    def self.tool(**options)
      AgentTools::Tool.new(**options)
    end

    FIELDS = {
      "title" => { "type" => "string" },
      "description" => { "type" => "string" },
      "status" => { "type" => "string", "enum" => STATUSES },
      "start_date" => { "type" => "string", "description" => "YYYY-MM-DD" },
      "due_date" => { "type" => "string", "description" => "YYYY-MM-DD" }
    }.freeze

    TOOLS = [
      tool(name: "list_tasks", write: false,
           description: "List tasks (optionally for one document, one status, or matching a title).",
           schema: AgentTools.object({ "document_id" => { "type" => "integer" }, "status" => { "type" => "string", "enum" => STATUSES }, "query" => { "type" => "string" } }),
           handler: ->(token, args) { Tasks.list_tasks(token, args) }),
      tool(name: "create_task", write: true,
           description: "Create a task, optionally on a document or in a folder. A token limited to a folder must give a document or folder inside it.",
           schema: AgentTools.object(FIELDS.merge("document_id" => { "type" => "integer" }, "folder_id" => { "type" => "integer" }), required: %w[title]),
           handler: ->(token, args) { Tasks.create_task(token, args) }),
      tool(name: "update_task", write: true,
           description: "Change a task's title, description, status or dates. Tick a task by setting its status to done.",
           schema: AgentTools.object(FIELDS.merge("id" => { "type" => "integer" }), required: %w[id]),
           handler: ->(token, args) { Tasks.update_task(token, args) })
    ].freeze

    def self.task_json(task)
      {
        id: task.id, title: task.title, description: task.description, status: task.status, start_date: task.start_date, due_date: task.due_date,
        document_id: task.document_id, folder_id: task.folder_id, updated_at: AgentTools.timestamp(task.updated_at)
      }
    end

    def self.task!(token, id)
      token.tasks.find_by(id: AgentTools.integer(id)) || raise(AgentTools::Error, "Task #{id} not found")
    end

    def self.status!(value)
      return nil if value.blank?
      raise AgentTools::Error, "Status must be one of #{STATUSES.to_sentence(last_word_connector: ' or ')}" unless STATUSES.include?(value.to_s)
      value.to_s
    end

    # The attributes an agent may set, checked.
    def self.attributes_from(args)
      {
        "title" => args["title"].presence&.to_s&.strip,
        "description" => (args["description"].to_s if args.key?("description")),
        "status" => status!(args["status"]),
        "start_date" => AgentTools.date!(args["start_date"], "start_date"),
        "due_date" => AgentTools.date!(args["due_date"], "due_date")
      }.compact
    end

    def self.list_tasks(token, args)
      scope = token.tasks
      scope = scope.where(document_id: AgentTools.document!(token, args["document_id"], types: %w[document]).id) if args["document_id"].present?
      scope = scope.where(status: status!(args["status"])) if args["status"].present?
      scope = scope.title_matching(args["query"].to_s) if args["query"].present?
      scope.limit(MAX_LISTED).map { |task| task_json(task) }
    end

    def self.create_task(token, args)
      document = AgentTools.document!(token, args["document_id"], types: %w[document]) if args["document_id"].present?
      folder = AgentTools.folder!(token, args["folder_id"]) if args["folder_id"].present?
      raise AgentTools::Error, "This token is limited to a folder: give a document_id or folder_id inside it" if token.folder && document.nil? && folder.nil?

      attributes = attributes_from(args)
      raise AgentTools::Error, "A task needs a title" if attributes["title"].blank?

      task = token.workspace.tasks.build(attributes.merge("status" => attributes["status"] || "backlog"))
      task.document = document
      task.folder = folder unless document
      task.status_changed_by_agent = token
      task.save!
      AgentTools.record_activity(token, "created_task", task, "Created “#{task.title}”")
      task_json(task)
    end

    # Dates go through the same scheduling rules as the app, so a folder's
    # dependency mode (strict or flexible) applies to an agent too.
    def self.update_task(token, args)
      task = task!(token, args["id"])
      changes = attributes_from(args)
      raise AgentTools::Error, "Nothing to change: give a title, description, status, start_date or due_date" if changes.empty?

      task.status_changed_by_agent = token
      update = Scheduling::TaskUpdate.new(task)
      raise AgentTools::Error, update.errors.to_sentence unless update.call(changes)

      AgentTools.record_activity(token, "updated_task", task, "Updated “#{task.title}” (#{changes.keys.to_sentence})")
      task_json(task)
    end
  end
end
