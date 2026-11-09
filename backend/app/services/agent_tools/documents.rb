module AgentTools
  # Folders, documents (as Markdown) and text edits.
  module Documents
    MAX_LISTED = 200
    # Task lines without an id in one edit each become a task; cap how many.
    MAX_NEW_TASKS = 100
    # Longest text one replace_text call may swap in (characters).
    MAX_REPLACEMENT = 20_000

    def self.tool(**options)
      AgentTools::Tool.new(**options)
    end

    TOOLS = [
      tool(name: "list_folders", write: false,
           description: "List the folders you can reach (the whole Space, or the folder your token is limited to and what is under it).",
           schema: AgentTools.object,
           handler: ->(token, _args) { Documents.list_folders(token) }),
      tool(name: "list_documents", write: false,
           description: "List documents and Collections (optionally within one folder, or matching a title).",
           schema: AgentTools.object({ "folder_id" => { "type" => "integer" }, "query" => { "type" => "string", "description" => "Match titles" } }),
           handler: ->(token, args) { Documents.list_documents(token, args) }),
      tool(name: "read_document", write: false,
           description: "Read a document as Markdown. Task lines end with <!-- task:ID -->, headings may end with <!-- id:... -->, and tables or files appear as <!-- keep:N ... --> comments: keep those comments when you edit.",
           schema: AgentTools.object({ "id" => { "type" => "integer" } }, required: %w[id]),
           handler: ->(token, args) { Documents.read_document(token, args) }),
      tool(name: "edit_document", write: true,
           description: "Replace a document's content with Markdown. Keep the <!-- ... --> comments from read_document so task lines stay linked and tables or files are kept; a line without a task comment becomes a new task, and a ticked box marks its task done (use update_task to reopen one). Pass base_updated_at from read_document so the edit is refused if someone changed the document meanwhile. Refused for documents with content Markdown cannot hold: use replace_text for those.",
           schema: AgentTools.object({ "id" => { "type" => "integer" }, "markdown" => { "type" => "string" },
                                       "base_updated_at" => { "type" => "string", "description" => "updated_at from read_document" } }, required: %w[id markdown]),
           handler: ->(token, args) { Documents.edit_document(token, args) }),
      tool(name: "replace_text", write: true,
           description: "Replace text inside a document without touching its structure (works for any document). The text to find must sit inside one run of formatting.",
           schema: AgentTools.object({ "id" => { "type" => "integer" }, "find" => { "type" => "string" }, "replace" => { "type" => "string" } }, required: %w[id find replace]),
           handler: ->(token, args) { Documents.replace_text(token, args) })
    ].freeze

    def self.list_folders(token)
      Folder.where(id: token.folder_ids).active.order(:id).map do |folder|
        { id: folder.id, name: folder.name, parent_id: token.covers_folder?(folder.parent_id) ? folder.parent_id : nil, kind: folder.kind }
      end
    end

    def self.list_documents(token, args)
      scope = token.documents
      scope = scope.where(folder_id: AgentTools.folder!(token, args["folder_id"]).id) if args["folder_id"].present?
      scope = scope.where(Document.arel_table[:title].matches("%#{Document.sanitize_sql_like(args['query'].to_s)}%")) if args["query"].present?
      scope.order(:title).limit(MAX_LISTED).map do |document|
        { id: document.id, title: document.title, type: document.doc_type, folder_id: document.folder_id, updated_at: AgentTools.timestamp(document.updated_at) }
      end
    end

    def self.read_document(token, args)
      document = AgentTools.document!(token, args["id"], types: %w[document])
      statuses = Task.where(document_id: document.id).pluck(:id, :status).to_h
      blocked = DocumentMarkdown.unsupported(document.content)
      {
        id: document.id, title: document.title, markdown: DocumentMarkdown.render(document.content, tasks: statuses),
        updated_at: AgentTools.timestamp(document.updated_at),
        can_edit_document: blocked.empty?, **(blocked.empty? ? {} : { cannot_edit_because: blocked })
      }
    end

    def self.edit_document(token, args)
      document = AgentTools.document!(token, args["id"], types: %w[document])
      markdown = args["markdown"].to_s
      raise AgentTools::Error, "The Markdown is too long (at most #{DocumentMarkdown::MAX_LENGTH} characters)" if markdown.size > DocumentMarkdown::MAX_LENGTH

      document.lock!
      if args["base_updated_at"].present? && AgentTools.timestamp(document.updated_at) != args["base_updated_at"].to_s
        raise AgentTools::Error, "“#{document.title}” changed since you read it (#{AgentTools.timestamp(document.updated_at)}); read it again and redo your edit"
      end
      blocked = DocumentMarkdown.unsupported(document.content)
      raise AgentTools::Error, "This document has #{blocked.to_sentence} that Markdown cannot hold; use replace_text instead" unless blocked.empty?

      content = DocumentMarkdown.parse(markdown, title: document.title, original: document.content)
      changes = link_task_lines(token, document, content)
      document.title = title_from(content, document.title)
      document.update!(content: content)
      AgentTools.record_activity(token, "edited_document", document, "Rewrote “#{document.title}”#{task_summary(changes)}")
      { id: document.id, title: document.title, updated_at: AgentTools.timestamp(document.updated_at), tasks_created: changes[:created], tasks_updated: changes[:updated] }
    end

    # A document is titled by its first heading (the editor does the same).
    def self.title_from(content, fallback)
      first = Array(content["content"]).first
      return fallback unless first.is_a?(Hash) && first["type"] == "heading"
      DocumentMarkdown.plain_text(first).strip.presence || fallback
    end

    def self.task_summary(changes)
      parts = [ ("created #{changes[:created]} task#{'s' unless changes[:created] == 1}" if changes[:created].positive?), ("updated #{changes[:updated]}" if changes[:updated].positive?) ].compact
      parts.empty? ? "" : " (#{parts.join(', ')})"
    end

    # Makes task lines real. A line with the id of one of this document's tasks
    # keeps it (its text renames the task; a ticked box completes it). Any other
    # line gets a new task, so an id from elsewhere can never reach another
    # document's task. Only the task id is stored on the line.
    def self.link_task_lines(token, document, content)
      changes = { created: 0, updated: 0 }
      existing = Task.where(document_id: document.id).index_by(&:id)
      visit = lambda do |node|
        next unless node.is_a?(Hash)
        if node["type"] == "workspaceTaskItem"
          title = DocumentMarkdown.plain_text(node).strip
          checked = node.dig("attrs", "checked")
          task = existing[node.dig("attrs", "taskId")]
          if task
            changed = { "title" => (title if title.present? && task.title != title), "status" => ("done" if checked && !task.done?) }.compact
            if changed.any?
              task.status_changed_by_agent = token
              task.update!(changed)
              changes[:updated] += 1
            end
          elsif title.present?
            raise AgentTools::Error, "One edit can create at most #{MAX_NEW_TASKS} tasks; split it up" if changes[:created] >= MAX_NEW_TASKS
            task = token.workspace.tasks.build(title: title, document: document, status: checked ? :done : :backlog)
            task.status_changed_by_agent = token
            task.save!
            changes[:created] += 1
          end
          node["attrs"] = { "taskId" => task&.id }
        end
        Array(node["content"]).each(&visit)
      end
      visit.call(content)
      changes
    end

    def self.replace_text(token, args)
      document = AgentTools.document!(token, args["id"], types: %w[document])
      find = args["find"].to_s
      replacement = args["replace"].to_s
      raise AgentTools::Error, "Say what to find" if find.empty?
      raise AgentTools::Error, "The replacement is too long (at most #{MAX_REPLACEMENT} characters)" if replacement.size > MAX_REPLACEMENT

      document.lock!
      count = 0
      content = document.content.deep_dup
      walk = lambda do |node|
        next unless node.is_a?(Hash)
        if node["type"] == "text" && node["text"].to_s.include?(find)
          count += node["text"].scan(find).size
          node["text"] = node["text"].gsub(find) { replacement }
        end
        Array(node["content"]).each(&walk)
        # Replacing text with nothing must not leave an empty text node (the editor refuses those).
        node["content"].reject! { |child| child.is_a?(Hash) && child["type"] == "text" && child["text"].to_s.empty? } if node["content"].is_a?(Array)
      end
      walk.call(content)
      raise AgentTools::Error, "“#{find}” was not found in the document (it must sit inside one run of text)" if count.zero?

      document.title = title_from(content, document.title)
      document.update!(content: content)
      AgentTools.record_activity(token, "edited_document", document, "Replaced “#{find}” (#{count}×) in “#{document.title}”")
      { id: document.id, replaced: count, updated_at: AgentTools.timestamp(document.updated_at) }
    end
  end
end
