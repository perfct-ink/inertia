# The text a person pastes into Claude Code (or another agent) to start work on
# a document, folder or task. It names what to read and how to connect; the
# token is not in it (the person is shown it once, next to the prompt).
module AgentHandoffPrompt
  DOC_LIMIT = 50

  def self.build(subject:, instruction:, mcp_url:, writable:)
    lines = [ "You are working in an Inertia space through its MCP server at #{mcp_url}.",
              "Read what you need with the Inertia tools (read_document, list_tasks), then do the work." ]
    lines << (writable ? "You can edit documents and update tasks; keep the <!-- task:ID --> comments on task lines." : "You have read-only access: report what you find instead of editing.")
    lines << ""
    lines << "Instruction: #{instruction.presence || 'Read this and do the open work in it.'}"
    lines << ""
    lines.concat(describe(subject))
    lines.join("\n")
  end

  def self.describe(subject)
    case subject
    when Document
      [ "Document #{subject.id}: #{subject.title}" ] + open_tasks_lines(subject.tasks)
    when Folder
      docs = Document.where(folder_id: subject.self_and_descendant_ids).order(:title)
      [ "Folder #{subject.id}: #{subject.name}", "Documents (#{docs.count}):" ] +
        docs.limit(DOC_LIMIT).map { |d| "- #{d.id}: #{d.title}" } +
        (docs.count > DOC_LIMIT ? [ "- ...and #{docs.count - DOC_LIMIT} more (use list_documents)" ] : [])
    when Task
      [ "Task #{subject.id}: #{subject.title} (#{subject.status})" ] + (subject.document ? [ "From document #{subject.document.id}: #{subject.document.title}" ] : [])
    end
  end

  def self.open_tasks_lines(tasks)
    open = tasks.reject(&:done?)
    return [] if open.empty?
    [ "Open tasks:" ] + open.map { |t| "- #{t.id}: #{t.title} (#{t.status})" }
  end
end
