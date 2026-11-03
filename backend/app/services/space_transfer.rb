# Moves or copies a document or a folder (with everything under it) into a
# folder of another Space (workspace). Used by the documents and folders
# controllers; see docs/features/space_transfer.md.
#
# What goes with a document: its content, its Collection fields/records/cells,
# and the Space tasks its checklist lines made. A task belongs to one Space, so
# a move keeps the task but drops what only makes sense in the old Space (epic,
# sprint, milestone, Gantt links, event links, AI runs, and an assignee who is
# not a member of the new Space). A copy duplicates the tasks and points the
# copied checklist lines at them.
#
# A folder can also have records filed directly under it, not through a
# document (tasks, events, epics, milestones, initiatives, sprints, ideas,
# objectives, objectives map nodes, releases, project requests). They belong to
# the old Space, so a move detaches them (folder cleared, the record stays
# where it is) and a copy leaves them behind. Allocations cannot be detached
# (a person's time on a project is the project), so a folder that has any is
# not moved. `attached_summary` tells the user all this beforehand.
#
# Everything runs in one transaction: a transfer either completes or leaves
# both Spaces untouched. Problems the user can fix raise SpaceTransfer::Error.
class SpaceTransfer
  class Error < StandardError; end

  # The editor node a checklist line is stored as; its `taskId` attribute is
  # the id of the Space task the line created.
  TASK_LINE = "workspaceTaskItem".freeze

  LINKED_COLLECTION = "A Collection links to a Collection that is not part of this transfer. " \
                      "Transfer them together (for example by transferring the folder that holds both) " \
                      "or remove the link first.".freeze

  # Records filed directly under the given folders, by the name the dialog
  # uses: { detach: {...}, blocked: {...} }, each { name => [relation, folder
  # column] }. Tasks of a document that goes with the folder move with the
  # document instead, so they are not listed here.
  def self.attached_records(folder_ids)
    document_task_ids = Task.unscoped.where(document_id: Document.where(folder_id: folder_ids).select(:id)).select(:id)
    filed = ->(model) { [ model.where(folder_id: folder_ids), :folder_id ] }
    {
      detach: {
        "tasks" => [ Task.unscoped.where(folder_id: folder_ids).where.not(id: document_task_ids), :folder_id ],
        "events" => filed.(Event),
        "epics" => filed.(Epic),
        "milestones" => filed.(Milestone),
        "initiatives" => filed.(Initiative),
        "sprints" => filed.(Sprint),
        "ideas" => filed.(Idea),
        "objectives" => filed.(Objective),
        "io_nodes" => filed.(IoNode),
        "releases" => filed.(Release),
        "project_requests" => [ ProjectRequest.where(project_id: folder_ids), :project_id ]
      },
      blocked: { "resource_allocations" => filed.(ResourceAllocation) }
    }
  end

  # What a move or copy of the folder does to the records filed directly under
  # it or its subfolders: { detach: { name => count }, blocked: { name => count } }.
  # Only names with records are listed. A move clears `detach` from the folder
  # and refuses while `blocked` has any; a copy leaves both behind.
  def self.attached_summary(folder)
    attached_records(folder.self_and_descendant_ids).transform_values do |records|
      records.transform_values { |relation, _column| relation.count }.select { |_name, count| count.positive? }
    end
  end

  # Points every checklist line in a document's content at the copy of its
  # task (`task_ids` maps old task id => new task id). A line whose task was
  # not copied loses its link, so the editor creates a fresh task for it.
  def self.remap_task_ids(node, task_ids)
    case node
    when Array
      node.map { |child| remap_task_ids(child, task_ids) }
    when Hash
      mapped = node.transform_values { |child| remap_task_ids(child, task_ids) }
      if mapped["type"] == TASK_LINE && mapped["attrs"].is_a?(Hash)
        mapped["attrs"] = mapped["attrs"].merge("taskId" => task_ids[mapped["attrs"]["taskId"]])
      end
      mapped
    else
      node
    end
  end

  def initialize(user:, target_folder:)
    raise Error, "Choose a folder that is not archived." if target_folder.archived?

    @user = user
    @target_folder = target_folder
    @workspace = target_folder.workspace
  end

  # Returns the new document.
  def copy_document(document)
    transaction { copy_documents([ [ document, @target_folder ] ]).fetch(document.id) }
  end

  # Returns the moved document, now in the target folder.
  def move_document(document)
    transaction do
      require_other_space!(document.folder.workspace_id)
      move_documents([ document ])
      document.update!(folder: @target_folder)
      document
    end
  end

  # Returns the new folder: a copy of the folder, its subfolders and their
  # documents under the target folder.
  def copy_folder(folder)
    transaction do
      reject_root!(folder)
      pairs = []
      copy = copy_tree(folder, @target_folder, pairs)
      copy_documents(pairs)
      copy
    end
  end

  # Returns the moved folder, now under the target folder together with its
  # subfolders and documents.
  def move_folder(folder)
    transaction do
      reject_root!(folder)
      require_other_space!(folder.workspace_id)
      folder_ids = folder.self_and_descendant_ids
      documents = Document.where(folder_id: folder_ids).to_a
      detach_attached_records!(folder_ids)
      move_documents(documents)
      TaskStatusSetting.where(folder_id: folder_ids).update_all(workspace_id: @workspace.id)
      QuipImport.where(destination_folder_id: folder_ids).update_all(destination_folder_id: nil)
      Folder.where(id: folder_ids).update_all(workspace_id: @workspace.id)
      folder.reload.update!(parent: @target_folder)
      folder
    end
  end

  private

  def transaction(&)
    ActiveRecord::Base.transaction(&)
  end

  def require_other_space!(source_workspace_id)
    raise Error, "That is already in this Space. Choose a different Space." if source_workspace_id == @workspace.id
  end

  def reject_root!(folder)
    raise Error, "The Root folder can't be moved or copied. Transfer the folders inside it instead." if folder.root?
  end

  # ── Copy ────────────────────────────────────────────────────────────────

  # pairs: [[source document, folder for its copy], ...] from one Space.
  # Returns { source document id => copy }.
  def copy_documents(pairs)
    copies = pairs.to_h do |source, folder|
      copy = folder.documents.create!(
        title: source.title, doc_type: source.doc_type, created_by: @user, content: source.content || {}
      )
      [ source.id, copy ]
    end
    pairs.each { |source, _folder| copy_document_tasks(source, copies.fetch(source.id)) }
    tables = pairs.map(&:first).select(&:table?)
    copy_tables(tables, copies.transform_values(&:id)) if tables.any?
    copies
  end

  def copy_tree(folder, parent, pairs)
    copy = @workspace.folders.create!(
      name: folder.name, kind: folder.kind, dependency_mode: folder.dependency_mode,
      position: folder.position, archived_at: folder.archived_at, parent: parent
    )
    folder.documents.each { |document| pairs << [ document, copy ] }
    folder.children.each { |child| copy_tree(child, copy, pairs) }
    copy
  end

  def copy_document_tasks(source, copy)
    task_ids = copy_tasks(source, copy)
    copy.update!(content: self.class.remap_task_ids(copy.content, task_ids)) if copy.document?
  end

  # Returns { old task id => new task id }.
  def copy_tasks(source, copy)
    tasks = Task.unscoped.where(document_id: source.id).order(:id).to_a
    member_ids = @workspace.memberships.pluck(:user_id)
    copies = tasks.to_h do |task|
      attributes = task.slice(:title, :description, :status, :start_date, :due_date, :position)
      assignee_id = task.assignee_id if member_ids.include?(task.assignee_id)
      [ task.id, @workspace.tasks.create!(attributes.merge(document: copy, assignee_id: assignee_id)) ]
    end
    tasks.each do |task|
      parent = copies[task.parent_id]
      copies.fetch(task.id).update!(parent: parent) if parent
    end
    copies.transform_values(&:id)
  end

  # Copies the fields, records and cells of the given Collections. `doc_ids`
  # maps each source Collection id => its copy's id. Links between Collections
  # that are copied together are re-pointed at the copies; a link to one that
  # is not copied only survives inside the same Space.
  def copy_tables(sources, doc_ids)
    same_space = sources.first.folder.workspace_id == @workspace.id
    fields = {}
    records = {}
    sources.each do |source|
      table = Document.find(doc_ids.fetch(source.id))
      source.table_fields.order(:id).each do |field|
        relation_id = linked_id(field.relation_table_id, doc_ids, same_space)
        fields[field.id] = table.table_fields.create!(name: field.name, data_type: field.data_type, relation_table_id: relation_id).id
      end
      source.table_records.order(:id).each { |record| records[record.id] = table.table_records.create!.id }
    end
    TableCell.where(table_record_id: records.keys).find_each do |cell|
      TableCell.create!(
        table_record_id: records.fetch(cell.table_record_id),
        table_field_id: fields.fetch(cell.table_field_id),
        value: cell.value,
        related_record_id: linked_id(cell.related_record_id, records, same_space)
      )
    end
  end

  def linked_id(id, copied_ids, same_space)
    return if id.nil?

    copied_ids.fetch(id) { same_space ? id : raise(Error, LINKED_COLLECTION) }
  end

  # ── Move ────────────────────────────────────────────────────────────────

  def move_documents(documents)
    reject_outside_links!(documents)
    rehome_tasks(documents.map(&:id))
  end

  # A Collection can only change Space with every Collection it links to or is
  # linked from, because a link never crosses Spaces.
  def reject_outside_links!(documents)
    table_ids = documents.select(&:table?).map(&:id)
    return if table_ids.empty?

    ids = documents.map(&:id)
    links_out = TableField.where(document_id: table_ids).where.not(relation_table_id: nil).where.not(relation_table_id: ids)
    links_in = TableField.where(relation_table_id: table_ids).where.not(document_id: ids)
    raise Error, LINKED_COLLECTION if links_out.exists? || links_in.exists?
  end

  # Moves the tasks of the given documents into the target Space and cuts what
  # only works inside the old one. Skips callbacks and validations on purpose:
  # the rows are rewritten together and would otherwise reject each other
  # halfway through.
  def rehome_tasks(document_ids)
    task_ids = Task.unscoped.where(document_id: document_ids).pluck(:id)
    return if task_ids.empty?

    TaskDependency.where(predecessor_id: task_ids).or(TaskDependency.where(successor_id: task_ids)).delete_all
    EventTask.where(task_id: task_ids).delete_all
    AiRun.where(task_id: task_ids).delete_all
    # Subtasks that stay behind lose their parent; moved tasks whose parent stays behind lose theirs.
    Task.unscoped.where(parent_id: task_ids).where.not(id: task_ids).update_all(parent_id: nil)
    Task.unscoped.where(id: task_ids).where.not(parent_id: task_ids).update_all(parent_id: nil)
    moved = Task.unscoped.where(id: task_ids)
    moved.update_all(workspace_id: @workspace.id, epic_id: nil, sprint_id: nil, milestone_id: nil, folder_id: nil)
    moved.where.not(assignee_id: @workspace.memberships.select(:user_id)).update_all(assignee_id: nil)
  end

  # Records filed directly under the folders (see attached_records) belong to
  # the old Space and have nowhere to go: they stay in it with their folder
  # cleared. Skips callbacks and validations on purpose, like rehome_tasks.
  # Allocations cannot be detached, so a folder that has any is not moved.
  def detach_attached_records!(folder_ids)
    records = self.class.attached_records(folder_ids)
    blocked = records[:blocked].select { |_name, (relation, _column)| relation.exists? }.keys.map { |name| name.tr("_", " ") }
    if blocked.any?
      raise Error, "This folder has #{blocked.to_sentence} attached to it that a move can't detach. " \
                   "Remove them first, or copy the folder instead."
    end

    records[:detach].each_value { |relation, column| relation.update_all(column => nil) }
  end
end
