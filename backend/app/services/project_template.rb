# What a new project starts with, and how it is made: subfolders, documents
# (with their content), Collections (a name and fields, no records) and tasks.
# A project type is a template, and "save a project as a type" is how a Space
# makes a project template. The built-in types send theirs from the web app
# (frontend/src/data/projectType.ts); a Space's saved types keep theirs in
# project_types.template. See docs/features/project_types.md.
#
#   ProjectTemplate.clean(raw)               # a safe copy of what a client sent, or Invalid
#   ProjectTemplate.snapshot(folder)         # the template of an existing project
#   ProjectTemplate.apply(raw, folder:, user:)  # creates the records in the project
#
# Shape (string keys, as stored). "folder" and "parent" are positions in the
# template's own "folders" list (nil is the project itself); a folder's parent
# comes before it.
#   { "folders"     => [ { "name", "parent" } ],
#     "documents"   => [ { "title", "doc_type" ("document" or "spreadsheet"), "content", "folder" } ],
#     "collections" => [ { "title", "fields" => [ { "name", "data_type" } ], "folder" } ],
#     "tasks"       => [ { "title", "folder" } ] }
#
# The rule for what a saved type carries: the structure and the starting text
# of the project, and nothing that belongs to the people or the work done in
# it. Carried: subfolders, the documents and sheets with their text, the
# Collections' names and fields, and the titles of the tasks that are in no
# document. Never carried: people (owner, members, assignees, watchers, who
# made a document), dates, statuses and progress, Collection records, uploaded
# files and files embedded in documents, comments, and the planning records of
# the project (milestones, sprints, epics, initiatives).
class ProjectTemplate
  class Invalid < StandardError; end

  DOCUMENT_TYPES = %w[document spreadsheet].freeze
  # The Collection field types a template can carry. Links to other Collections,
  # files and formulas are left out: they point at things outside the template.
  FIELD_TYPES = %w[text integer number boolean date datetime].freeze
  # Editor nodes that point at a file of the source project. A template never
  # carries files, so each becomes a paragraph (with the file's name, if any).
  FILE_NODES = %w[audio fileAttachment video image].freeze
  MAX_FOLDERS = 20
  MAX_DEPTH = 4
  MAX_DOCUMENTS = 20
  MAX_COLLECTIONS = 10
  MAX_FIELDS = 30
  MAX_TASKS = 100
  MAX_TITLE = 255
  MAX_BYTES = 1.megabyte

  # A clean copy of `raw` (a Hash or request parameters; nil is an empty
  # template), keeping only what a template holds. Raises Invalid with a reason
  # a person can act on.
  def self.clean(raw)
    raw = raw.to_unsafe_h if raw.respond_to?(:to_unsafe_h)
    raw = {} if raw.nil?
    raise Invalid, "The template must be an object." unless raw.is_a?(Hash)

    raw = raw.stringify_keys
    folders = items(raw["folders"], "folders", MAX_FOLDERS) { |item| clean_folder(item) }
    check_folder_tree!(folders)
    template = {
      "folders" => folders,
      "documents" => items(raw["documents"], "documents", MAX_DOCUMENTS) { |item| clean_document(item).merge(placed(item, folders)) },
      "collections" => items(raw["collections"], "Collections", MAX_COLLECTIONS) { |item| clean_collection(item).merge(placed(item, folders)) },
      "tasks" => items(raw["tasks"], "tasks", MAX_TASKS) { |item| { "title" => title!(item, "A task") }.merge(placed(item, folders)) }
    }
    raise Invalid, "The template is too large." if template.to_json.bytesize > MAX_BYTES

    template
  end

  # The template of a project: its subfolders (not archived ones), its
  # documents and sheets with their content, its Collections' fields, and its
  # tasks that belong to no document (checklist lines in a document come back
  # from the document's own content), each in the subfolder it is in. Uploaded
  # files, records and people are left out (see the rule above). Raises Invalid
  # when the project has more than a template can hold.
  def self.snapshot(folder)
    subfolders = subfolders_of(folder)
    positions = { folder.id => nil }
    subfolders.each_with_index { |(sub, _parent), position| positions[sub.id] = position }
    documents = Document.where(folder_id: positions.keys).order(:id)
    clean(
      "folders" => subfolders.map { |sub, parent| { "name" => sub.name, "parent" => parent } },
      "documents" => documents.where(doc_type: DOCUMENT_TYPES).map { |d| { "title" => d.title, "doc_type" => d.doc_type, "content" => d.content, "folder" => positions[d.folder_id] } },
      "collections" => documents.where(doc_type: "table").map { |d| { "title" => d.title, "fields" => d.table_fields.where(data_type: FIELD_TYPES).order(:id).map { |f| f.slice(:name, :data_type) }, "folder" => positions[d.folder_id] } },
      "tasks" => folder.workspace.tasks.where(folder_id: positions.keys, document_id: nil, parent_id: nil).reorder(:position, :id).map { |t| { "title" => t.title, "folder" => positions[t.folder_id] } }
    )
  end

  # Creates the template's subfolders, documents, Collections and tasks in
  # `folder`. The caller wraps this and the folder's own save in one transaction.
  def self.apply(raw, folder:, user:)
    template = clean(raw)
    made = []
    template["folders"].each_with_index do |item, position|
      made << folder.workspace.folders.create!(name: item["name"], parent: item["parent"] ? made[item["parent"]] : folder, position: position)
    end
    home = ->(item) { item["folder"] ? made[item["folder"]] : folder }
    template["documents"].each do |item|
      home.call(item).documents.create!(title: item["title"], doc_type: item["doc_type"], content: item["content"], created_by: user)
    end
    template["collections"].each do |item|
      table = home.call(item).documents.create!(title: item["title"], doc_type: "table", created_by: user)
      item["fields"].each { |field| table.table_fields.create!(name: field["name"], data_type: field["data_type"]) }
    end
    template["tasks"].each_with_index do |item, position|
      folder.workspace.tasks.create!(title: item["title"], folder: home.call(item), position: position)
    end
    template
  end

  # [[subfolder, position of its parent in this list (nil: the project)], ...],
  # depth first, in the order the project shows them.
  def self.subfolders_of(folder, parent = nil, list = [])
    folder.children.active.order(:position, :id).each do |child|
      list << [ child, parent ]
      subfolders_of(child, list.size - 1, list)
    end
    list
  end

  def self.items(list, label, max)
    return [] if list.nil?
    raise Invalid, "The template's #{label} must be a list." unless list.is_a?(Array)
    raise Invalid, "A template can hold at most #{max} #{label}." if list.size > max

    list.map { |item| yield hash!(item, label) }
  end

  def self.hash!(item, label)
    raise Invalid, "Each of the template's #{label} must be an object." unless item.is_a?(Hash)

    item.stringify_keys
  end

  def self.title!(item, what, key = "title")
    title = item[key].to_s.strip
    raise Invalid, "#{what} needs a #{key}." if title.empty?
    raise Invalid, "#{what} #{key} can be at most #{MAX_TITLE} characters." if title.length > MAX_TITLE

    title
  end

  def self.clean_folder(item)
    parent = item["parent"]
    raise Invalid, "A folder's parent must be the position of another folder." unless parent.nil? || parent.is_a?(Integer)

    { "name" => title!(item, "A folder", "name"), "parent" => parent }
  end

  # A folder's parent comes before it, so the list is a forest with no cycles,
  # and no folder is deeper than MAX_DEPTH levels under the project.
  def self.check_folder_tree!(folders)
    depths = []
    folders.each_with_index do |folder, position|
      parent = folder["parent"]
      raise Invalid, "A folder's parent must be a folder listed before it." unless parent.nil? || (parent >= 0 && parent < position)

      depths << (parent ? depths[parent] + 1 : 1)
      raise Invalid, "Folders can be at most #{MAX_DEPTH} levels deep." if depths.last > MAX_DEPTH
    end
  end

  # Where an item sits: {"folder" => its position in the template's folders, or
  # nil for the project itself}.
  def self.placed(item, folders)
    position = item["folder"]
    return { "folder" => nil } if position.nil?
    raise Invalid, "Something in the template is in a folder that is not listed." unless position.is_a?(Integer) && position >= 0 && position < folders.size

    { "folder" => position }
  end

  def self.clean_document(item)
    doc_type = item["doc_type"].presence || "document"
    raise Invalid, "A document must be a #{DOCUMENT_TYPES.join(' or ')}." unless DOCUMENT_TYPES.include?(doc_type)
    content = item["content"] || {}
    raise Invalid, "A document's content must be an object." unless content.is_a?(Hash)

    # Checklist lines keep their text but not the link to the task they made
    # in the source project; the editor makes a new task for each in the copy.
    { "title" => title!(item, "A document"), "doc_type" => doc_type, "content" => without_files(SpaceTransfer.remap_task_ids(content, {})) }
  end

  # The content with each embedded file or image (FILE_NODES) replaced by a
  # paragraph, so a template never points at a file of the project it came from.
  def self.without_files(node)
    case node
    when Array
      node.map { |child| without_files(child) }
    when Hash
      return file_placeholder(node) if FILE_NODES.include?(node["type"])

      node.transform_values { |child| without_files(child) }
    else
      node
    end
  end

  def self.file_placeholder(node)
    name = node.dig("attrs", "name").to_s.strip
    name.empty? ? { "type" => "paragraph" } : { "type" => "paragraph", "content" => [ { "type" => "text", "text" => name } ] }
  end

  def self.clean_collection(item)
    fields = items(item["fields"], "fields", MAX_FIELDS) { |field| clean_field(field) }
    names = fields.map { |field| field["name"] }
    raise Invalid, "A Collection can't have two fields named #{(names.find { |n| names.count(n) > 1 }).inspect}." if names.uniq.size < names.size

    { "title" => title!(item, "A Collection"), "fields" => fields }
  end

  def self.clean_field(field)
    name = field["name"].to_s.strip
    raise Invalid, "A field needs a name." if name.empty?
    raise Invalid, "A field name can be at most #{MAX_TITLE} characters." if name.length > MAX_TITLE
    raise Invalid, "A field's type must be one of #{FIELD_TYPES.join(', ')}." unless FIELD_TYPES.include?(field["data_type"])

    { "name" => name, "data_type" => field["data_type"] }
  end

  private_class_method :subfolders_of, :items, :hash!, :title!, :clean_folder, :check_folder_tree!, :placed,
                       :clean_document, :without_files, :file_placeholder, :clean_collection, :clean_field
end
